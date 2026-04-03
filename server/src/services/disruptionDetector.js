/**
 * Automated Disruption Detection Service
 * 5 automated triggers using mock APIs to identify income disruptions
 * 1. Weather-based disruption (monsoon, heat wave)
 * 2. Traffic/transportation disruption
 * 3. Platform outage detection
 * 4. Declared holiday/lockdown periods
 * 5. Historical pattern anomalies
 */

// Mock API 1: Weather Disruption Detector
const detectWeatherDisruption = async (city, zone) => {
  // Simulating real weather API response
  const weatherData = {
    'mumbai-dharavi': { alert: 'FLOOD_WARNING', confidence: 0.95, income_loss_hours: 12 },
    'mumbai-bandra': { alert: 'RAIN', confidence: 0.60, income_loss_hours: 4 },
    'delhi-cp': { alert: 'AQI_HIGH', confidence: 0.80, income_loss_hours: 6 },
    'bangalore-bellandur': { alert: 'WATERLOG_RISK', confidence: 0.88, income_loss_hours: 8 },
    'hyderabad-hitech': { alert: 'NONE', confidence: 1.0, income_loss_hours: 0 }
  };

  const key = `${city.toLowerCase()}-${zone.toLowerCase()}`;
  return weatherData[key] || { alert: 'NONE', confidence: 1.0, income_loss_hours: 0 };
};

// Mock API 2: Transportation/Traffic Disruption Detector
const detectTransportDisruption = async (city) => {
  // Simulates traffic API (Google Maps, etc.)
  const trafficData = {
    'mumbai': { metro_status: 'AFFECTED', avg_delay_mins: 45, routes_affected: 3 },
    'delhi': { metro_status: 'OPERATIONAL', avg_delay_mins: 0, routes_affected: 0 },
    'bangalore': { metro_status: 'PARTIAL', avg_delay_mins: 20, routes_affected: 1 },
    'hyderabad': { metro_status: 'OPERATIONAL', avg_delay_mins: 0, routes_affected: 0 },
    'pune': { metro_status: 'AFFECTED', avg_delay_mins: 30, routes_affected: 2 }
  };

  return trafficData[city.toLowerCase()] || { metro_status: 'OPERATIONAL', avg_delay_mins: 0, routes_affected: 0 };
};

// Mock API 3: Platform/Delivery Network Outage Detection
const detectPlatformOutage = async (platform) => {
  // Simulates platform status API
  const platformStatus = {
    'zomato': { status: 'OPERATIONAL', affected_cities: 0, estimated_recovery: null },
    'swiggy': { status: 'DEGRADED', affected_cities: 2, estimated_recovery: '2 hours' },
    'blinkit': { status: 'OPERATIONAL', affected_cities: 0, estimated_recovery: null },
    'dunzo': { status: 'OPERATIONAL', affected_cities: 0, estimated_recovery: null },
    'amazon': { status: 'PARTIAL_OUTAGE', affected_cities: 1, estimated_recovery: '4 hours' }
  };

  return platformStatus[platform.toLowerCase()] || { status: 'OPERATIONAL', affected_cities: 0, estimated_recovery: null };
};

// Mock API 4: Holiday/Lockdown/Declared Holiday Detector
const detectDeclaredDisruptions = async (city, date = new Date()) => {
  // Simulates government/holiday calendar API
  const disruptionCalendar = {
    'mumbai': [
      { date: '2026-04-14', type: 'LOCKDOWN', description: 'Municipal Works', duration_days: 3 },
      { date: '2026-06-15', type: 'MONSOON_CLOSURE', description: 'Monsoon Season Peak', duration_days: 7 }
    ],
    'delhi': [
      { date: '2026-05-20', type: 'HEAT_ADVISORY', description: 'Extreme Heat Wave', duration_days: 5 }
    ],
    'bangalore': [
      { date: '2026-04-10', type: 'BANDH', description: 'Regional Strike', duration_days: 1 }
    ]
  };

  const cityData = disruptionCalendar[city.toLowerCase()] || [];
  const currentDate = date.toISOString().split('T')[0];
  return cityData.filter(item => item.date === currentDate);
};

// Mock API 5: Anomaly Detection (Historical Pattern Analysis)
const detectHistoricalAnomalies = async (workerId, platform, city) => {
  // Simulates ML model for pattern anomalies
  // In real world, this would analyze historical work patterns
  const anomalyData = {
    'high': {
      occurred_today: true,
      deviation_percent: 75,
      reason: 'Worker typically works 8 hours, only 2 hours today',
      confidence: 0.92,
      estimated_income_loss: 250
    },
    'medium': {
      occurred_today: false,
      deviation_percent: 30,
      reason: 'Worker income 30% below average',
      confidence: 0.65,
      estimated_income_loss: 100
    },
    'low': {
      occurred_today: false,
      deviation_percent: 5,
      reason: 'Normal variation',
      confidence: 0.95,
      estimated_income_loss: 0
    }
  };

  // Randomly return different anomaly levels for simulation
  const levels = ['high', 'medium', 'low'];
  const randomLevel = levels[Math.floor(Math.random() * levels.length)];
  return anomalyData[randomLevel];
};

// Main Disruption Detection Orchestrator
const detectDisruptions = async (params = {}) => {
  const {
    workerId,
    platform = 'zomato',
    city = 'mumbai',
    zone = 'dharavi',
    date = new Date()
  } = params;

  try {
    // Run all 5 detectors in parallel
    const [weather, transport, outage, declared, anomaly] = await Promise.all([
      detectWeatherDisruption(city, zone),
      detectTransportDisruption(city),
      detectPlatformOutage(platform),
      detectDeclaredDisruptions(city, date),
      detectHistoricalAnomalies(workerId, platform, city)
    ]);

    // Aggregate findings
    const disruptions = [];
    let estimatedIncomeLoss = 0;
    let claimAutoTrigger = false;

    // Weather disruption
    if (weather.alert !== 'NONE') {
      disruptions.push({
        trigger: 'WEATHER',
        alert_type: weather.alert,
        confidence: weather.confidence,
        estimated_hours_affected: weather.income_loss_hours,
        estimated_income_loss: Math.round((weather.income_loss_hours / 8) * (2500 / 7))
      });
      estimatedIncomeLoss += Math.round((weather.income_loss_hours / 8) * (2500 / 7));
    }

    // Transport disruption (>30 mins delay = significant income impact)
    if (transport.metro_status !== 'OPERATIONAL' && transport.avg_delay_mins > 30) {
      disruptions.push({
        trigger: 'TRANSPORTATION',
        status: transport.metro_status,
        delay_minutes: transport.avg_delay_mins,
        routes_affected: transport.routes_affected,
        estimated_income_loss: Math.round((transport.avg_delay_mins / 480) * (2500 / 7))
      });
      estimatedIncomeLoss += Math.round((transport.avg_delay_mins / 480) * (2500 / 7));
    }

    // Platform outage
    if (outage.status !== 'OPERATIONAL') {
      disruptions.push({
        trigger: 'PLATFORM_OUTAGE',
        platform_status: outage.status,
        affected_cities: outage.affected_cities,
        estimated_recovery_time: outage.estimated_recovery,
        estimated_income_loss: Math.round(2500 / 7) // Assume 1 day loss = weekly income / 7
      });
      estimatedIncomeLoss += Math.round(2500 / 7);
    }

    // Declared disruptions
    if (declared.length > 0) {
      declared.forEach(disr => {
        disruptions.push({
          trigger: 'DECLARED_DISRUPTION',
          type: disr.type,
          description: disr.description,
          duration_days: disr.duration_days,
          estimated_income_loss: Math.round((2500 / 7) * disr.duration_days)
        });
        estimatedIncomeLoss += Math.round((2500 / 7) * disr.duration_days);
      });
    }

    // Historical anomalies
    if (anomaly.occurred_today && anomaly.confidence > 0.80) {
      disruptions.push({
        trigger: 'ANOMALY_DETECTION',
        reason: anomaly.reason,
        deviation_percent: anomaly.deviation_percent,
        confidence: anomaly.confidence,
        estimated_income_loss: anomaly.estimated_income_loss
      });
      estimatedIncomeLoss += anomaly.estimated_income_loss;
    }

    // Auto-trigger claim if income loss > threshold
    if (estimatedIncomeLoss > 500) {
      claimAutoTrigger = true;
    }

    return {
      disruptions_detected: disruptions.length > 0,
      disruption_count: disruptions.length,
      disruptions,
      total_estimated_income_loss: Math.round(estimatedIncomeLoss),
      claim_auto_trigger: claimAutoTrigger,
      claim_auto_trigger_reason: claimAutoTrigger ? 'Income loss exceeds threshold (₹500+)' : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Disruption detection error:', error);
    return {
      disruptions_detected: false,
      disruption_count: 0,
      disruptions: [],
      total_estimated_income_loss: 0,
      claim_auto_trigger: false,
      error: error.message
    };
  }
};

module.exports = {
  detectDisruptions,
  detectWeatherDisruption,
  detectTransportDisruption,
  detectPlatformOutage,
  detectDeclaredDisruptions,
  detectHistoricalAnomalies
};
