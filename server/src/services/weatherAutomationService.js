const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { createClaimFromDisruption } = require('./claimService');
const { pushNotification } = require('./notificationService');
const { emitRealtimeEvent } = require('../realtime/socketBus');

const WATCH_CITIES = [
  { city: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { city: 'Bangalore', latitude: 12.9716, longitude: 77.5946 },
];

const RAIN_THRESHOLD_MM = Number(process.env.RAIN_THRESHOLD_MM || 12);

const fetchRainSnapshot = async ({ latitude, longitude }) => {
  const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude,
      longitude,
      current: 'precipitation,temperature_2m,wind_speed_10m',
      forecast_days: 1,
    },
    timeout: 6000,
  });

  const current = response.data?.current || {};
  return {
    precipitationMm: Number(current.precipitation || 0),
    temperatureC: Number(current.temperature_2m || 0),
    windKmh: Number(current.wind_speed_10m || 0),
  };
};

const createWeatherDisruptionIfNeeded = async ({ city, latitude, longitude }) => {
  const snapshot = await fetchRainSnapshot({ latitude, longitude });
  if (snapshot.precipitationMm < RAIN_THRESHOLD_MM) {
    return null;
  }

  const disruptionId = uuidv4();
  const severity = Math.min(5, Math.max(1, Math.ceil(snapshot.precipitationMm / 8)));

  await query(
    `INSERT INTO disruptions (
      id, disruption_type, type, location, latitude, longitude, source, severity_level, severity, risk_score, status, detected_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      disruptionId,
      'heavy_rain',
      'heavy_rain',
      city,
      latitude,
      longitude,
      'weather-automation',
      severity,
      severity,
      Math.min(100, Math.round(45 + snapshot.precipitationMm * 3)),
      'active',
    ],
  );

  const claimResult = await createClaimFromDisruption({
    city,
    location: city,
    disruptionType: 'heavy_rain',
    weather: { type: 'rain', severity: snapshot.precipitationMm, score: Math.min(100, snapshot.precipitationMm * 5) },
    traffic: { type: 'delay', score: Math.min(100, 35 + severity * 10) },
    locationRisk: { score: city === 'Chennai' ? 70 : 62 },
    pastClaims: { count: 1, recentFlags: 0, severity },
    incomePattern: { currentIncome: 4200, last7DayAverageIncome: 5100 },
    disruptionDetected: true,
    source: 'weather-monitor',
    amount: Math.min(550, Math.max(200, Math.round(180 + snapshot.precipitationMm * 12))),
  });

  const payload = {
    id: disruptionId,
    city,
    rainfall_mm: snapshot.precipitationMm,
    severity,
    claimId: claimResult.claim?.id || null,
  };

  emitRealtimeEvent('disruption:new', payload);
  await pushNotification({
    type: 'warning',
    title: 'Weather disruption detected',
    message: `${city} rainfall crossed threshold (${snapshot.precipitationMm}mm). Claim pipeline triggered.`,
    disruptionId,
    claimId: claimResult.claim?.id || null,
    userId: claimResult.claim?.user_id || null,
    partnerId: claimResult.claim?.partner_id || null,
  });

  return payload;
};

const runWeatherAutomation = async () => {
  const events = [];

  for (const cityConfig of WATCH_CITIES) {
    try {
      const event = await createWeatherDisruptionIfNeeded(cityConfig);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      console.error('[WEATHER_AUTOMATION] Failed for city', cityConfig.city, error.message);
    }
  }

  return events;
};

const startWeatherMonitoring = () => {
  const intervalMs = Number(process.env.WEATHER_MONITOR_INTERVAL_MS || 10 * 60 * 1000);
  setInterval(() => {
    runWeatherAutomation().catch((error) => {
      console.error('[WEATHER_AUTOMATION] Monitoring run failed', error.message);
    });
  }, intervalMs);
};

module.exports = {
  runWeatherAutomation,
  startWeatherMonitoring,
};
