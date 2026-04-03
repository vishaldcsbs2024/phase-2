const calculatePremium = (platform, city, riskFactors = {}) => {
  const platformRates = {
    zomato: 249,
    swiggy: 259,
    blinkit: 279,
    dunzo: 249,
    amazon: 289
  };

  const basePrice = platformRates[platform] || 249;

  const riskAdjustments = {
    rain: riskFactors.rain ? 20 : 0,
    heat: riskFactors.heat ? 15 : 0,
    aqi: riskFactors.aqi ? 25 : 0
  };

  const totalAdjustment = Object.values(riskAdjustments).reduce((a, b) => a + b, 0);
  const weeklyPremium = basePrice + totalAdjustment;
  const coverageAmount = weeklyPremium * 500;

  return {
    weekly_premium: weeklyPremium,
    coverage_amount: coverageAmount,
    base_price: basePrice,
    adjustments: riskAdjustments,
    total_adjustment: totalAdjustment
  };
};

module.exports = { calculatePremium };
