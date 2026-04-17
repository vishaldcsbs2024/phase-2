const axios = require('axios');

const CHENNAI_COORDS = {
  latitude: 13.0827,
  longitude: 80.2707,
};

const reasonRules = {
  heavy_rain: { multiplier: 0.35, floor: 0.45, label: 'Heavy rain disruption' },
  flood: { multiplier: 0.5, floor: 0.5, label: 'Flood/waterlogging disruption' },
  traffic_jam: { multiplier: 0.28, floor: 0.4, label: 'Traffic gridlock disruption' },
  road_closure: { multiplier: 0.32, floor: 0.45, label: 'Road closure disruption' },
  platform_outage: { multiplier: 0.4, floor: 0.5, label: 'Delivery platform outage' },
  accident: { multiplier: 0.45, floor: 0.5, label: 'On-road incident disruption' },
  health_issue: { multiplier: 0.3, floor: 0.35, label: 'Health-related disruption' },
  other: { multiplier: 0.2, floor: 0.3, label: 'General disruption' },
};

function inferReason(reasonText = '') {
  const text = String(reasonText).toLowerCase();
  if (text.includes('flood') || text.includes('waterlog')) return 'flood';
  if (text.includes('rain') || text.includes('storm')) return 'heavy_rain';
  if (text.includes('traffic') || text.includes('jam')) return 'traffic_jam';
  if (text.includes('closure') || text.includes('blocked')) return 'road_closure';
  if (text.includes('platform') || text.includes('app down') || text.includes('outage')) return 'platform_outage';
  if (text.includes('accident') || text.includes('crash')) return 'accident';
  if (text.includes('health') || text.includes('sick') || text.includes('fever')) return 'health_issue';
  return 'other';
}

async function reverseGeocode(latitude, longitude) {
  try {
    const url = 'https://nominatim.openstreetmap.org/reverse';
    const response = await axios.get(url, {
      params: {
        format: 'jsonv2',
        lat: latitude,
        lon: longitude,
        zoom: 16,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'GigShield/1.0 (location-verification)',
      },
      timeout: 6000,
    });

    const data = response.data || {};
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.state_district || 'Unknown';

    return {
      verified: !!data.display_name,
      confidence: data.display_name ? 0.9 : 0.55,
      display_name: data.display_name || null,
      city,
      country: address.country || null,
      postcode: address.postcode || null,
      source: 'OpenStreetMap Nominatim',
    };
  } catch (error) {
    return {
      verified: false,
      confidence: 0.45,
      display_name: null,
      city: 'Unknown',
      country: null,
      postcode: null,
      source: 'OpenStreetMap Nominatim',
      warning: 'Reverse geocode unavailable, fallback confidence applied',
    };
  }
}

function getSatelliteEvidenceUrl(latitude, longitude, zoom = 15) {
  // Esri World Imagery tile endpoint (public map tile service)
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&bboxSR=4326&imageSR=4326&size=900,600&dpi=96&format=png32&transparent=false&f=image`;
}

async function getWeatherSnapshot(latitude, longitude) {
  const apiKey = process.env.WEATHER_API_KEY;

  if (apiKey) {
    try {
      const response = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
        params: {
          key: apiKey,
          q: `${latitude},${longitude}`,
          days: 1,
          aqi: 'no',
          alerts: 'no',
        },
        timeout: 6000,
      });

      const data = response.data || {};
      const current = data.current || {};
      const forecastDay = data.forecast?.forecastday?.[0] || {};
      const rainChance = Number(forecastDay.day?.daily_chance_of_rain || 0);
      const precipMm = Number(current.precip_mm || 0);
      const windKmh = Number(current.wind_kph || 0);
      const weatherSeverity = Math.min(
        1,
        (precipMm / 20) +
        (rainChance / 100) +
        (windKmh / 90)
      );

      return {
        source: 'WeatherAPI.com',
        temperature_c: Number(current.temp_c || 0),
        precipitation_mm: precipMm,
        rain_probability_pct: Math.round(rainChance),
        wind_speed_kmh: Number(windKmh.toFixed(1)),
        weather_code: current.condition?.code || null,
        severity_score: Number(weatherSeverity.toFixed(2)),
      };
    } catch (error) {
      // Fall through to OpenWeatherMap, then Open-Meteo.
    }

    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey,
          units: 'metric',
        },
        timeout: 6000,
      });

      const data = response.data || {};
      const rain1h = Number((data.rain && data.rain['1h']) || 0);
      const windKmh = Number(data.wind?.speed || 0) * 3.6;
      const weatherSeverity = Math.min(
        1,
        (rain1h / 20) +
        (windKmh / 90) +
        (data.weather?.[0]?.main === 'Thunderstorm' ? 0.25 : 0)
      );

      return {
        source: 'OpenWeatherMap',
        temperature_c: Number(data.main?.temp || 0),
        precipitation_mm: rain1h,
        rain_probability_pct: rain1h > 0 ? Math.min(100, Math.round(rain1h * 8)) : 0,
        wind_speed_kmh: Number(windKmh.toFixed(1)),
        weather_code: data.weather?.[0]?.id || null,
        severity_score: Number(weatherSeverity.toFixed(2)),
      };
    } catch (error) {
      // Fall through to Open-Meteo fallback if OpenWeather fails.
    }
  }

  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,precipitation,weather_code,wind_speed_10m',
        hourly: 'precipitation_probability',
        forecast_days: 1,
      },
      timeout: 6000,
    });

    const data = response.data || {};
    const current = data.current || {};
    const hourly = data.hourly || {};
    const precipitationProbabilities = Array.isArray(hourly.precipitation_probability)
      ? hourly.precipitation_probability
      : [];

    const rainProbability = precipitationProbabilities.length
      ? Math.max(...precipitationProbabilities.slice(0, 6))
      : 0;

    const weatherSeverity = Math.min(
      1,
      (Number(current.precipitation || 0) / 15) +
      (Number(rainProbability || 0) / 100) +
      (Number(current.wind_speed_10m || 0) / 80)
    );

    return {
      source: 'Open-Meteo',
      temperature_c: Number(current.temperature_2m || 0),
      precipitation_mm: Number(current.precipitation || 0),
      rain_probability_pct: Math.round(rainProbability || 0),
      wind_speed_kmh: Number(current.wind_speed_10m || 0),
      weather_code: current.weather_code || null,
      severity_score: Number(weatherSeverity.toFixed(2)),
    };
  } catch (error) {
    return {
      source: 'Open-Meteo',
      temperature_c: null,
      precipitation_mm: null,
      rain_probability_pct: null,
      wind_speed_kmh: null,
      weather_code: null,
      severity_score: 0.45,
      warning: 'Weather API unavailable, fallback severity applied',
    };
  }
}

function getTrafficRiskScore(city = 'Unknown', reasonType = 'other', currentDate = new Date()) {
  const peakHour = [8, 9, 10, 17, 18, 19, 20].includes(currentDate.getHours());
  const highCongestionCities = ['Mumbai', 'Bangalore', 'Delhi', 'Kolkata', 'Chennai'];
  const cityBoost = highCongestionCities.includes(city) ? 0.18 : 0.08;
  const peakBoost = peakHour ? 0.22 : 0.05;
  const reasonBoost = ['traffic_jam', 'road_closure', 'accident'].includes(reasonType) ? 0.25 : 0.08;

  const score = Math.min(1, cityBoost + peakBoost + reasonBoost);

  return {
    source: 'Traffic Heuristic Engine',
    city,
    peak_hour: peakHour,
    score: Number(score.toFixed(2)),
    status: score >= 0.65 ? 'high' : score >= 0.4 ? 'moderate' : 'low',
  };
}

function calculateAutomatedPaycheck({
  baseDailyPay,
  reasonType,
  weatherSeverity,
  trafficRisk,
  locationConfidence,
}) {
  const rule = reasonRules[reasonType] || reasonRules.other;

  const disruptionImpact = (weatherSeverity * 0.5) + (trafficRisk * 0.35) + ((1 - locationConfidence) * 0.15);
  const normalizedImpact = Math.min(1, Math.max(0, disruptionImpact));

  const rawCompensation = baseDailyPay * rule.multiplier * normalizedImpact;
  const minimumCompensation = baseDailyPay * rule.floor;
  const recommendedPaycheck = Math.max(rawCompensation, minimumCompensation * 0.35);

  const confidence = Math.min(0.99, Math.max(0.55, (locationConfidence * 0.45) + ((1 - Math.abs(weatherSeverity - trafficRisk)) * 0.35) + 0.2));

  return {
    reason_type: reasonType,
    reason_label: rule.label,
    base_daily_pay: Math.round(baseDailyPay),
    recommended_paycheck: Math.round(recommendedPaycheck),
    payout_band: recommendedPaycheck >= baseDailyPay * 0.45 ? 'high_support' : recommendedPaycheck >= baseDailyPay * 0.25 ? 'medium_support' : 'basic_support',
    decision_confidence: Number(confidence.toFixed(2)),
    breakdown: {
      reason_multiplier: rule.multiplier,
      weather_severity: Number(weatherSeverity.toFixed(2)),
      traffic_risk: Number(trafficRisk.toFixed(2)),
      location_confidence: Number(locationConfidence.toFixed(2)),
      disruption_impact: Number(normalizedImpact.toFixed(2)),
    },
  };
}

async function evaluateDeliveryPaycheck(payload = {}) {
  const latitude = Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : CHENNAI_COORDS.latitude;
  const longitude = Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : CHENNAI_COORDS.longitude;
  const reason = payload.reason || 'other';
  const reasonType = inferReason(reason);
  const baseDailyPay = Number(payload.base_daily_pay || payload.base_pay || 800);

  if (!Number.isFinite(baseDailyPay) || baseDailyPay <= 0) {
    throw new Error('Valid base_daily_pay is required');
  }

  const [locationVerification, weather] = await Promise.all([
    reverseGeocode(latitude, longitude),
    getWeatherSnapshot(latitude, longitude),
  ]);

  const traffic = getTrafficRiskScore(locationVerification.city, reasonType, new Date());
  const paycheck = calculateAutomatedPaycheck({
    baseDailyPay,
    reasonType,
    weatherSeverity: weather.severity_score || 0,
    trafficRisk: traffic.score || 0,
    locationConfidence: locationVerification.confidence || 0.5,
  });

  return {
    request_id: `PAY_${Date.now()}`,
    input: {
      latitude,
      longitude,
      reason,
      reason_type_inferred: reasonType,
      base_daily_pay: baseDailyPay,
    },
    location_verification: {
      ...locationVerification,
      satellite_evidence_url: getSatelliteEvidenceUrl(latitude, longitude),
      satellite_source: 'Esri World Imagery',
    },
    weather,
    traffic,
    paycheck,
    recommendation: paycheck.recommended_paycheck >= baseDailyPay * 0.4
      ? 'Auto-approve paycheck with high support payout.'
      : 'Auto-approve paycheck with medium/basic support payout.',
  };
}

module.exports = {
  evaluateDeliveryPaycheck,
  inferReason,
  CHENNAI_COORDS,
};
