const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeScore = (value, fallback = 50) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }

  const numeric = Number(value);
  if (numeric <= 1) {
    return clamp(numeric * 100, 0, 100);
  }

  return clamp(numeric, 0, 100);
};

const calculateHistoryScore = (pastClaims = {}) => {
  const claimCount = Number(pastClaims.count ?? pastClaims.total ?? pastClaims.previousClaims ?? 0);
  const recentFlags = Number(pastClaims.recentFlags ?? 0);
  const severity = Number(pastClaims.severity ?? 0);
  return clamp((claimCount * 8) + (recentFlags * 12) + severity, 0, 100);
};

const calculateIncomeScore = (incomePattern = {}) => {
  const currentIncome = Number(incomePattern.currentIncome ?? incomePattern.current ?? 0);
  const averageIncome = Number(incomePattern.averageIncome ?? incomePattern.last7DayAverageIncome ?? incomePattern.average ?? 0);

  if (!currentIncome || !averageIncome) {
    return 45;
  }

  const variance = Math.abs(currentIncome - averageIncome) / Math.max(averageIncome, 1);
  return clamp(variance * 100, 0, 100);
};

const evaluateRisk = async ({
  weather,
  locationRisk,
  trafficCondition,
  disruptionSeverity,
  location,
  historicalData,
  pastClaims,
  incomePattern,
} = {}) => {
  const weatherScore = normalizeScore(weather?.score ?? weather?.severity ?? weather?.risk ?? weather, 50);
  const locationFallback = String(location || '').toLowerCase().includes('chennai') ? 68 : 50;
  const locationScore = normalizeScore(locationRisk?.score ?? locationRisk ?? locationFallback, 50);
  const trafficScore = normalizeScore(trafficCondition?.score ?? trafficCondition?.risk ?? trafficCondition, 50);
  const disruptionScore = normalizeScore(disruptionSeverity ?? weather?.severity ?? 50, 50);
  const historyScore = calculateHistoryScore(pastClaims);
  const historicalTrendScore = normalizeScore(historicalData?.trendScore ?? historicalData?.score ?? 50, 50);
  const incomeScore = calculateIncomeScore(incomePattern);

  const weightedScore = (
    (weatherScore * 0.22) +
    (locationScore * 0.18) +
    (trafficScore * 0.16) +
    (disruptionScore * 0.16) +
    (historyScore * 0.18) +
    (historicalTrendScore * 0.10)
  );

  const adjustedScore = clamp(weightedScore + ((incomeScore - 50) * 0.08), 0, 100);
  const claimProbability = Number((1 / (1 + Math.exp(-(adjustedScore - 50) / 10))).toFixed(3));

  const providedSignals = [weather, locationRisk, trafficCondition, pastClaims, incomePattern].filter(Boolean).length;
  const consistencyBonus = incomeScore > 70 ? 6 : incomeScore < 30 ? -4 : 2;
  const confidenceScore = clamp(Math.round((providedSignals / 5) * 70 + consistencyBonus + 20), 0, 100);

  return {
    riskScore: Math.round(adjustedScore),
    claimProbability,
    confidenceScore,
    factors: {
      weatherScore,
      locationScore,
      trafficScore,
      disruptionScore,
      historyScore,
      historicalTrendScore,
      incomeScore,
    },
  };
};

module.exports = {
  evaluateRisk,
};