const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeTimestamp = (value) => {
  if (!value) {
    return Date.now();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const analyzeFraud = async ({
  currentGps,
  historicalLocations = [],
  claimWeather = {},
  weatherApiData = {},
  currentIncome = 0,
  last7DayAverageIncome = 0,
  disruptionDetected = false,
} = {}) => {
  const flags = [];
  let fraudScore = 0;

  if (currentGps?.latitude !== undefined && currentGps?.longitude !== undefined && historicalLocations.length > 0) {
    const suspiciousMovement = historicalLocations.find((location) => {
      if (location.latitude === undefined || location.longitude === undefined) {
        return false;
      }

      const timeGapMinutes = Math.abs(normalizeTimestamp(currentGps.timestamp) - normalizeTimestamp(location.timestamp)) / 60000;
      const distance = distanceKm(
        Number(currentGps.latitude),
        Number(currentGps.longitude),
        Number(location.latitude),
        Number(location.longitude),
      );

      return timeGapMinutes < 30 && distance > 20;
    });

    if (suspiciousMovement) {
      flags.push('Location consistency check failed: GPS shift > 20km within 30 minutes');
      fraudScore += 45;
    }
  }

  const claimWeatherType = String(claimWeather.type || claimWeather.condition || claimWeather.summary || '').toLowerCase();
  const apiWeatherType = String(weatherApiData.type || weatherApiData.condition || weatherApiData.summary || weatherApiData.description || '').toLowerCase();
  const claimWeatherSeverity = Number(claimWeather.severity ?? claimWeather.severityScore ?? claimWeather.risk ?? 0);
  const apiWeatherSeverity = Number(weatherApiData.severity ?? weatherApiData.severityScore ?? weatherApiData.risk ?? 0);

  if ((claimWeatherType && apiWeatherType && claimWeatherType !== apiWeatherType) || Math.abs(claimWeatherSeverity - apiWeatherSeverity) > 30) {
    flags.push('Weather verification mismatch detected against live weather data');
    fraudScore += 30;
  }

  const income = Number(currentIncome || 0);
  const averageIncome = Number(last7DayAverageIncome || 0);
  if (averageIncome > 0) {
    const dropRatio = 1 - (income / averageIncome);
    if (dropRatio > 0.7 && !disruptionDetected) {
      flags.push('Income anomaly detected: more than 70% drop without verified disruption');
      fraudScore += 35;
    }
  }

  const decision = fraudScore > 70 ? 'FRAUD' : fraudScore > 35 ? 'SUSPICIOUS' : 'SAFE';

  return {
    fraudScore: clamp(Math.round(fraudScore), 0, 100),
    flags,
    decision,
  };
};

module.exports = {
  analyzeFraud,
  distanceKm,
};