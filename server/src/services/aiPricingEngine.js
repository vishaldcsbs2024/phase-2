/**
 * AI-Driven Dynamic Pricing Engine
 * Uses ML-like hyper-local risk factors to adjust premiums
 * Factors: Weather prediction, zone safety, worker history, income consistency
 */

// Mock Historical Zone Safety Data (simulating ML model predictions)
const zoneSafetyScores = {
  'mumbai-dharavi': 0.65,      // Higher risk (water logging prone)
  'mumbai-bandra': 0.85,       // Lower risk (safer zone)
  'delhi-cp': 0.80,             // Lower risk
  'delhi-noida': 0.70,          // Moderate risk
  'bangalore-koramangala': 0.88, // Lower risk
  'bangalore-bellandur': 0.50,   // Higher risk (water logging)
  'hyderabad-hitech': 0.90,      // Very low risk
  'pune-hinjewadi': 0.85,        // Low risk
  'default': 0.70                // Default baseline
};

// Mock Weather Risk Predictions (simulating weather API integration)
const getWeatherRiskAdjustment = (city, season) => {
  const weatherRisks = {
    'monsoon': {
      'mumbai': -2,       // -₹2 discount in safer zones, +₹15 in risky zones
      'delhi': -1,
      'bangalore': -3,
      'hyderabad': -0.5,
      'pune': -2
    },
    'summer': {
      'mumbai': 8,        // Higher heat risk
      'delhi': 12,
      'bangalore': 5,
      'hyderabad': 10,
      'pune': 8
    },
    'winter': {
      'mumbai': 2,
      'delhi': 3,
      'bangalore': 1,
      'hyderabad': 1,
      'pune': 2
    }
  };

  const season_key = season || 'monsoon';
  return weatherRisks[season_key]?.[city.toLowerCase()] || 0;
};

// Calculate Zone Safety Score
const getZoneSafetyScore = (city, zone) => {
  const zoneKey = `${city.toLowerCase()}-${zone.toLowerCase()}`;
  return zoneSafetyScores[zoneKey] || zoneSafetyScores['default'];
};

// Mock Worker Risk Profile (would be ML-based)
const assessWorkerRisk = (workerHistoryData = {}) => {
  const {
    yearsWorking = 1,
    previousClaims = 0,
    profileCompleteness = 0.7,
    occupationRiskLevel = 'moderate' // low, moderate, high
  } = workerHistoryData;

  const occupationModifiers = {
    'low': 0.90,      // 10% discount for low-risk occupations (office)
    'moderate': 1.0,  // No adjustment for moderate risk
    'high': 1.15      // 15% surcharge for high-risk (construction, outdoor)
  };

  const claimHistoryModifier = 1 + (previousClaims * 0.05); // 5% increase per claim
  const experienceModifier = Math.min(1.1, 1 + (yearsWorking * 0.02)); // Max 10% discount
  const profileModifier = 0.95 + (profileCompleteness * 0.1); // Incentivize complete profiles

  return {
    occupationModifier: occupationModifiers[occupationRiskLevel] || 1.0,
    claimHistoryModifier,
    experienceModifier,
    profileModifier,
    combinedRiskScore: (occupationModifiers[occupationRiskLevel] || 1.0) * claimHistoryModifier / experienceModifier
  };
};

// Advanced Premium Calculator with AI/ML adjustments
const calculateAIDynamicPremium = (params = {}) => {
  const {
    platform = 'zomato',
    city = 'mumbai',
    zone = 'dharavi',
    weeklyIncome = 2500,
    riskFactors = {},
    workerHistory = {},
    season = 'monsoon'
  } = params;

  // Base platform rates
  const platformRates = {
    zomato: 249,
    swiggy: 259,
    blinkit: 279,
    dunzo: 249,
    amazon: 289
  };

  let weeklyPremium = platformRates[platform] || 249;

  // 1. HYPER-LOCAL RISK ADJUSTMENT
  const zoneSafetyScore = getZoneSafetyScore(city, zone);
  const zoneModifier = zoneSafetyScore < 0.7 ? 1.12 : (zoneSafetyScore > 0.85 ? 0.95 : 1.0);
  const zoneAdjustment = weeklyPremium * (zoneModifier - 1);

  // 2. WEATHER-BASED DYNAMIC PRICING
  const weatherAdjustment = getWeatherRiskAdjustment(city, season);

  // 3. WORKER RISK PROFILE (ML-like assessment)
  const workerRisk = assessWorkerRisk(workerHistory);
  const workerAdjustment = weeklyPremium * (workerRisk.combinedRiskScore - 1);

  // 4. INCOME CONSISTENCY CHECK
  const incomeAdjustment = weeklyIncome < 2000 ? 15 : (weeklyIncome > 4000 ? -10 : 0);

  // 5. LEGACY RISK FACTORS (original system)
  const legacyAdjustments = {
    rain: riskFactors.rain ? 20 : 0,
    heat: riskFactors.heat ? 15 : 0,
    aqi: riskFactors.aqi ? 25 : 0
  };

  // Calculate final premium
  const finalPremium = Math.round(
    weeklyPremium + 
    zoneAdjustment + 
    weatherAdjustment + 
    workerAdjustment + 
    incomeAdjustment + 
    Object.values(legacyAdjustments).reduce((a, b) => a + b, 0)
  );

  const coverageAmount = finalPremium * 500;

  return {
    weekly_premium: Math.max(finalPremium, 150), // Floor at ₹150
    coverage_amount: coverageAmount,
    base_price: weeklyPremium,
    zone_safety_score: zoneSafetyScore,
    zone_modifier: zoneModifier.toFixed(2),
    ai_factors: {
      hyper_local_adjustment: Math.round(zoneAdjustment),
      weather_adjustment: weatherAdjustment,
      worker_risk_adjustment: Math.round(workerAdjustment),
      income_adjustment: incomeAdjustment,
      zone: zone,
      season: season,
      worker_risk_score: workerRisk.combinedRiskScore.toFixed(2)
    },
    legacy_adjustments: legacyAdjustments,
    total_adjustment: Math.round(
      zoneAdjustment + weatherAdjustment + workerAdjustment + incomeAdjustment +
      Object.values(legacyAdjustments).reduce((a, b) => a + b, 0)
    ),
    discount_message: zoneSafetyScore > 0.85 
      ? `✓ Safe zone! You get ₹${Math.round(weeklyPremium * 0.05)}/week discount`
      : zoneSafetyScore < 0.7
      ? `⚠ Weather-prone zone: Premium adjusted for safety`
      : null
  };
};

module.exports = {
  calculateAIDynamicPremium,
  getZoneSafetyScore,
  getWeatherRiskAdjustment,
  assessWorkerRisk,
  zoneSafetyScores
};
