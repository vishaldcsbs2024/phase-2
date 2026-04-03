export interface User {
  id: string;
  name: string;
  phone: string;
  workType: string;
  weeklyIncome: number;
  city: string;
}

export interface Policy {
  status: "active" | "inactive";
  weeklyPremium: number;
  coverageAmount: number;
}

export interface PremiumItem {
  label: string;
  amount: number;
  type: "base" | "add" | "discount";
}

export interface Alert {
  id: string;
  message: string;
  icon: string;
  type: "warning" | "success" | "info";
  timestamp: string;
}

export interface RiskFactor {
  label: string;
  impact: number;
  direction: "up" | "down";
}

export interface RiskScore {
  score: number;
  zone: string;
  explanation: string;
  factors: RiskFactor[];
}

export interface DisruptionEvent {
  id: string;
  source: "weather" | "traffic" | "platform";
  title: string;
  severity: "low" | "medium" | "high";
  premiumDelta: number;
  detectedAt: string;
}

export interface PreventionInsight {
  title: string;
  action: string;
  impact: string;
}

export interface PreventionScore {
  score: number;
  summary: string;
  insights: PreventionInsight[];
}

export interface ExplainabilityItem {
  label: string;
  reason: string;
  amount: number;
}

export interface ExplainabilitySnapshot {
  previousPremium: number;
  currentPremium: number;
  netChange: number;
  narrative: string;
  items: ExplainabilityItem[];
}

export interface ClaimTimelineStep {
  id: string;
  stage: "detected" | "auto-filed" | "approved" | "paid";
  label: string;
  at: string;
  done: boolean;
  confidence: number;
  evidenceSources: string[];
}

export interface Claim {
  id: string;
  date: string;
  event: string;
  amount: number;
  status: "processed" | "pending";
  timeline?: ClaimTimelineStep[];
}

export interface RegisterData {
  name: string;
  phone: string;
  workType: string;
  weeklyIncome: number;
  city: string;
}

export interface AutoPaycheckRequest {
  latitude: number;
  longitude: number;
  reason: string;
  base_daily_pay: number;
}

export interface AutoPaycheckDecision {
  request_id: string;
  input: {
    latitude: number;
    longitude: number;
    reason: string;
    reason_type_inferred: string;
    base_daily_pay: number;
  };
  location_verification: {
    verified: boolean;
    confidence: number;
    display_name: string | null;
    city: string;
    country: string | null;
    postcode: string | null;
    source: string;
    satellite_evidence_url: string;
    satellite_source: string;
    warning?: string;
  };
  weather: {
    source: string;
    temperature_c: number | null;
    precipitation_mm: number | null;
    rain_probability_pct: number | null;
    wind_speed_kmh: number | null;
    weather_code: number | null;
    severity_score: number;
    warning?: string;
  };
  traffic: {
    source: string;
    city: string;
    peak_hour: boolean;
    score: number;
    status: "low" | "moderate" | "high";
  };
  paycheck: {
    reason_type: string;
    reason_label: string;
    base_daily_pay: number;
    recommended_paycheck: number;
    payout_band: "high_support" | "medium_support" | "basic_support";
    decision_confidence: number;
    breakdown: {
      reason_multiplier: number;
      weather_severity: number;
      traffic_risk: number;
      location_confidence: number;
      disruption_impact: number;
    };
  };
  recommendation: string;
}
