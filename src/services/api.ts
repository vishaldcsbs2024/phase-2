import type {
  User,
  Policy,
  PremiumItem,
  Alert,
  Claim,
  RegisterData,
  RiskScore,
  DisruptionEvent,
  ClaimTimelineStep,
  PreventionScore,
  ExplainabilitySnapshot,
  AutoPaycheckRequest,
  AutoPaycheckDecision,
} from "@/types";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const resolveApiOrigin = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  }

  return "http://localhost:3001";
};

const API_ORIGIN = resolveApiOrigin();

const CLAIMS_KEY = "pyw_claims";
const ALERTS_KEY = "pyw_alerts";

const baseClaims = (): Claim[] => [
  {
    id: "1",
    date: "2025-04-01",
    event: "Heavy Rain",
    amount: 120,
    status: "processed",
    timeline: buildTimeline("2025-04-01T08:00:00.000Z"),
  },
  {
    id: "2",
    date: "2025-03-28",
    event: "Traffic Jam",
    amount: 80,
    status: "processed",
    timeline: buildTimeline("2025-03-28T09:30:00.000Z"),
  },
  {
    id: "3",
    date: "2025-03-20",
    event: "Flood Warning",
    amount: 200,
    status: "processed",
    timeline: buildTimeline("2025-03-20T11:15:00.000Z"),
  },
];

const baseAlerts = (): Alert[] => [
  { id: "1", message: "Heavy rain detected ☔", icon: "🌧️", type: "warning", timestamp: new Date().toISOString() },
  { id: "2", message: "₹120 credited automatically", icon: "✅", type: "success", timestamp: new Date().toISOString() },
];

function readStore<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = fallback();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

function writeStore<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function registerUser(data: RegisterData): Promise<User> {
  await delay(800);
  return { id: crypto.randomUUID(), ...data };
}

const zoneRisk: Record<string, { score: number; zone: string; explanation: string }> = {
  Mumbai: { score: 64, zone: "Mumbai Core", explanation: "Moderate monsoon and traffic volatility." },
  Delhi: { score: 58, zone: "Delhi NCR", explanation: "Seasonal AQI spikes with moderate disruption risk." },
  Bangalore: { score: 49, zone: "Bangalore Urban", explanation: "Relatively stable delivery conditions in most zones." },
  Hyderabad: { score: 46, zone: "Hyderabad Metro", explanation: "Lower weather disruption frequency recently." },
  Chennai: { score: 61, zone: "Chennai Coastal", explanation: "Cyclonic and heavy-rain sensitivity in select weeks." },
  Pune: { score: 50, zone: "Pune City", explanation: "Balanced risk profile with periodic commute delays." },
  Kolkata: { score: 60, zone: "Kolkata Urban", explanation: "Rain and congestion patterns increase variability." },
  Ahmedabad: { score: 52, zone: "Ahmedabad City", explanation: "Mostly stable with occasional heat-wave risk." },
};

export async function getPolicy(): Promise<Policy> {
  await delay(400);
  return { status: "active", weeklyPremium: 55, coverageAmount: 25000 };
}

export async function getPremium(): Promise<PremiumItem[]> {
  await delay(300);
  return [
    { label: "Base", amount: 50, type: "base" },
    { label: "Rain", amount: 10, type: "add" },
    { label: "Low Risk", amount: -5, type: "discount" },
  ];
}

export async function getRiskScore(city: string): Promise<RiskScore> {
  await delay(350);
  const picked = zoneRisk[city] ?? { score: 55, zone: "Regional Cluster", explanation: "Risk mix is currently neutral." };
  const safeZoneDiscount = picked.score <= 50 ? -2 : 0;

  return {
    score: picked.score,
    zone: picked.zone,
    explanation: picked.explanation,
    factors: [
      { label: "Weather Forecast", impact: picked.score > 58 ? 8 : 3, direction: "up" },
      { label: "Traffic Reliability", impact: picked.score > 58 ? 6 : 2, direction: "up" },
      { label: "Zone Safety History", impact: Math.abs(safeZoneDiscount), direction: "down" },
    ],
  };
}

export async function getDisruptionFeed(city: string): Promise<DisruptionEvent[]> {
  await delay(300);
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  const cityBoost = city === "Mumbai" || city === "Chennai" ? 4 : 0;

  return [
    {
      id: crypto.randomUUID(),
      source: "weather",
      title: "Rain intensity crossed threshold",
      severity: cityBoost > 0 ? "high" : "medium",
      premiumDelta: 6 + cityBoost,
      detectedAt: minsAgo(8),
    },
    {
      id: crypto.randomUUID(),
      source: "traffic",
      title: "Average trip delay over 30 minutes",
      severity: "medium",
      premiumDelta: 4,
      detectedAt: minsAgo(21),
    },
    {
      id: crypto.randomUUID(),
      source: "platform",
      title: "Partner platform slowdown detected",
      severity: "low",
      premiumDelta: 2,
      detectedAt: minsAgo(33),
    },
  ];
}

export async function getPreventionScore(city: string, riskScore: number): Promise<PreventionScore> {
  await delay(240);
  const score = Math.max(35, 100 - riskScore + 12);
  const cityRainHeavy = city === "Mumbai" || city === "Chennai" || city === "Kolkata";

  return {
    score,
    summary: score >= 65
      ? "Strong day for stable earnings if you follow route guidance."
      : "Moderate risk day. Small behavior changes can protect income.",
    insights: [
      {
        title: "Route Timing",
        action: "Start first slot 30 minutes earlier to avoid peak disruption window.",
        impact: "+8% order reliability",
      },
      {
        title: "Zone Selection",
        action: cityRainHeavy
          ? "Prioritize central zones with lower flood probability this evening."
          : "Prioritize high-completion zones with low delay variance.",
        impact: "-₹2 to -₹5 premium pressure",
      },
      {
        title: "Platform Mix",
        action: "Keep a secondary platform active during demand dips.",
        impact: "Up to +12% income stability",
      },
    ],
  };
}

export async function getExplainabilitySnapshot(
  currentPremium: number,
  risk: RiskScore,
): Promise<ExplainabilitySnapshot> {
  await delay(220);
  const previousPremium = Math.max(35, currentPremium - Math.round((risk.score - 50) / 6));
  const weatherDelta = risk.score > 60 ? 6 : 2;
  const trafficDelta = risk.score > 58 ? 4 : 1;
  const safetyDelta = risk.score <= 50 ? -3 : -1;
  const netChange = weatherDelta + trafficDelta + safetyDelta;

  return {
    previousPremium,
    currentPremium,
    netChange,
    narrative: netChange > 0
      ? "Premium moved up mainly due to short-term disruption probability."
      : "Premium is stable with a slight safety discount from your zone profile.",
    items: [
      {
        label: "Weather Outlook",
        reason: "Rain and humidity pattern raised interruption likelihood.",
        amount: weatherDelta,
      },
      {
        label: "Traffic Reliability",
        reason: "Average travel delay increased in your active slots.",
        amount: trafficDelta,
      },
      {
        label: "Zone Safety History",
        reason: "Historically safer delivery cluster reduced expected loss.",
        amount: safetyDelta,
      },
    ],
  };
}

export async function getRecommendedCoverage(
  currentPremium: number,
  currentCoverage: number,
  riskScore: number,
): Promise<{ weeklyPremium: number; coverageAmount: number; premium: PremiumItem[] }> {
  await delay(280);
  const adjustment = riskScore > 60 ? 10 : riskScore < 50 ? -4 : 3;
  const nextPremium = Math.max(35, currentPremium + adjustment);
  const nextCoverage = Math.max(12000, Math.round(currentCoverage + (riskScore > 60 ? 3500 : 2000)));

  return {
    weeklyPremium: nextPremium,
    coverageAmount: nextCoverage,
    premium: [
      { label: "Base", amount: 50, type: "base" },
      { label: "AI Risk Fit", amount: adjustment, type: adjustment >= 0 ? "add" : "discount" },
      { label: "Recommended Cover", amount: Math.round((nextCoverage - currentCoverage) / 500), type: "add" },
    ],
  };
}

export async function getAlerts(): Promise<Alert[]> {
  await delay(300);
  return readStore(ALERTS_KEY, baseAlerts);
}

export async function getClaims(): Promise<Claim[]> {
  await delay(400);
  return readStore(CLAIMS_KEY, baseClaims);
}

export async function simulateTrigger(type: string): Promise<{ claim: Claim; alert: Alert }> {
  await delay(600);
  const amounts: Record<string, number> = { rain: 120, traffic: 80, flood: 200 };
  const amount = amounts[type] || 100;
  const now = new Date().toISOString();
  const claim: Claim = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    event: type.charAt(0).toUpperCase() + type.slice(1),
    amount,
    status: "processed",
    timeline: buildTimeline(now),
  };

  const alert: Alert = {
    id: crypto.randomUUID(),
    message: `₹${amount} credited — ${type} event detected`,
    icon: "✅",
    type: "success",
    timestamp: new Date().toISOString(),
  };

  const claims = readStore(CLAIMS_KEY, baseClaims);
  writeStore(CLAIMS_KEY, [claim, ...claims]);

  const alerts = readStore(ALERTS_KEY, baseAlerts);
  writeStore(ALERTS_KEY, [alert, ...alerts].slice(0, 20));

  return {
    claim,
    alert,
  };
}

export async function getAutoPaycheckDecision(payload: AutoPaycheckRequest): Promise<AutoPaycheckDecision> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/ai/auto-paycheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Auto-paycheck request failed: ${response.status}`);
    }

    const json = await response.json();
    if (!json?.success || !json?.data) {
      throw new Error(json?.error || "Invalid response from auto-paycheck API");
    }

    return json.data as AutoPaycheckDecision;
  } catch {
    // Fallback decision to keep UX functional if backend is temporarily unavailable.
    await delay(450);
    const fallbackAmount = Math.round(payload.base_daily_pay * 0.32);
    return {
      request_id: `FALLBACK_${Date.now()}`,
      input: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        reason: payload.reason,
        reason_type_inferred: "other",
        base_daily_pay: payload.base_daily_pay,
      },
      location_verification: {
        verified: true,
        confidence: 0.8,
        display_name: "Approximate location verified",
        city: "Unknown",
        country: "India",
        postcode: null,
        source: "Fallback Engine",
        satellite_evidence_url: `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${payload.longitude - 0.01},${payload.latitude - 0.01},${payload.longitude + 0.01},${payload.latitude + 0.01}&bboxSR=4326&imageSR=4326&size=900,600&dpi=96&format=png32&transparent=false&f=image`,
        satellite_source: "Esri World Imagery",
        warning: "Live backend unavailable, fallback decision shown",
      },
      weather: {
        source: "Fallback Engine",
        temperature_c: 30,
        precipitation_mm: 1,
        rain_probability_pct: 40,
        wind_speed_kmh: 12,
        weather_code: null,
        severity_score: 0.55,
      },
      traffic: {
        source: "Fallback Engine",
        city: "Unknown",
        peak_hour: false,
        score: 0.45,
        status: "moderate",
      },
      paycheck: {
        reason_type: "other",
        reason_label: "General disruption",
        base_daily_pay: payload.base_daily_pay,
        recommended_paycheck: fallbackAmount,
        payout_band: "medium_support",
        decision_confidence: 0.74,
        breakdown: {
          reason_multiplier: 0.2,
          weather_severity: 0.55,
          traffic_risk: 0.45,
          location_confidence: 0.8,
          disruption_impact: 0.48,
        },
      },
      recommendation: "Auto-approve paycheck using fallback decision engine.",
    };
  }
}

export async function addAutoPaycheckClaim(decision: AutoPaycheckDecision): Promise<Claim> {
  await delay(150);

  const now = new Date();
  const nowIso = now.toISOString();
  const plus = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  const claim: Claim = {
    id: crypto.randomUUID(),
    date: nowIso.split("T")[0],
    event: decision.paycheck.reason_label,
    amount: decision.paycheck.recommended_paycheck,
    status: "processed",
    timeline: [
      {
        id: crypto.randomUUID(),
        stage: "detected",
        label: "Location and disruption verified",
        at: nowIso,
        done: true,
        confidence: decision.location_verification.confidence,
        evidenceSources: [
          decision.location_verification.source,
          decision.location_verification.satellite_source,
        ],
      },
      {
        id: crypto.randomUUID(),
        stage: "auto-filed",
        label: "Auto paycheck claim created",
        at: plus(1),
        done: true,
        confidence: 0.9,
        evidenceSources: [
          decision.weather.source,
          decision.traffic.source,
        ],
      },
      {
        id: crypto.randomUUID(),
        stage: "approved",
        label: "Decision engine approved payout",
        at: plus(2),
        done: true,
        confidence: decision.paycheck.decision_confidence,
        evidenceSources: ["Auto Paycheck Engine", "Reason Rules"],
      },
      {
        id: crypto.randomUUID(),
        stage: "paid",
        label: "Automated paycheck credited",
        at: plus(3),
        done: true,
        confidence: 0.99,
        evidenceSources: ["Payout Automation"],
      },
    ],
  };

  const claims = readStore(CLAIMS_KEY, baseClaims);
  writeStore(CLAIMS_KEY, [claim, ...claims]);

  const alerts = readStore(ALERTS_KEY, baseAlerts);
  const alert: Alert = {
    id: crypto.randomUUID(),
    message: `₹${claim.amount} auto paycheck credited (${decision.paycheck.reason_type})`,
    icon: "✅",
    type: "success",
    timestamp: new Date().toISOString(),
  };
  writeStore(ALERTS_KEY, [alert, ...alerts].slice(0, 20));

  return claim;
}

function buildTimeline(startIso: string) {
  const start = new Date(startIso).getTime();
  const at = (mins: number) => new Date(start + mins * 60_000).toISOString();
  const timeline: ClaimTimelineStep[] = [
    {
      id: crypto.randomUUID(),
      stage: "detected",
      label: "Disruption detected",
      at: at(0),
      done: true,
      confidence: 0.93,
      evidenceSources: ["Weather API", "Traffic API"],
    },
    {
      id: crypto.randomUUID(),
      stage: "auto-filed",
      label: "Claim auto-filed",
      at: at(1),
      done: true,
      confidence: 0.9,
      evidenceSources: ["Policy Engine", "Risk Rules"],
    },
    {
      id: crypto.randomUUID(),
      stage: "approved",
      label: "Claim approved",
      at: at(3),
      done: true,
      confidence: 0.96,
      evidenceSources: ["Fraud Check", "Eligibility Engine"],
    },
    {
      id: crypto.randomUUID(),
      stage: "paid",
      label: "Payout sent",
      at: at(5),
      done: true,
      confidence: 0.99,
      evidenceSources: ["Payout Gateway", "Ledger Service"],
    },
  ];
  return timeline;
}
