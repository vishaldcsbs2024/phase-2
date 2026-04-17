import type {
  User,
  RegisterData,
  GigShieldRiskEvaluation,
  GigShieldFraudAnalysis,
  GigShieldSimulationResult,
  GigShieldDisruption,
  GigShieldNotification,
  GigShieldClaimRecord,
  GigShieldPayout,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("pyw_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function buildHeaders(extraHeaders: Record<string, string> = {}) {
  const user = getStoredUser();

  return {
    "Content-Type": "application/json",
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
    ...extraHeaders,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders((options.headers as Record<string, string>) || {}),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new Error(json?.error || `Request failed with status ${response.status}`);
  }

  return json.data as T;
}

export async function registerUser(data: RegisterData): Promise<User> {
  const response = await request<{ partner: { id: string; phone_number: string; full_name: string }; token: string }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: data.phone,
        fullName: data.name,
        password: `GigShield@${data.phone}`,
        city: data.city,
        workType: data.workType,
        weeklyIncome: data.weeklyIncome,
      }),
    },
  );

  return {
    id: response.partner.id,
    name: data.name,
    phone: data.phone,
    workType: data.workType,
    weeklyIncome: data.weeklyIncome,
    city: data.city,
    token: response.token,
  };
}

export async function loginUser(data: { phone: string; password?: string }): Promise<User> {
  const response = await request<{ partner: { id: string; phone_number: string; full_name: string; city?: string; work_type?: string }; token: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: data.phone,
        password: data.password ?? `GigShield@${data.phone}`,
      }),
    },
  );

  return {
    id: response.partner.id,
    name: response.partner.full_name,
    phone: response.partner.phone_number,
    workType: response.partner.work_type ?? "Delivery",
    weeklyIncome: 0,
    city: response.partner.city ?? "Chennai",
    token: response.token,
  };
}

export async function evaluateRisk(payload: Record<string, unknown>): Promise<GigShieldRiskEvaluation> {
  return request<GigShieldRiskEvaluation>("/api/risk/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeFraud(payload: Record<string, unknown>): Promise<GigShieldFraudAnalysis> {
  return request<GigShieldFraudAnalysis>("/api/fraud/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function simulateDisruption(payload: Record<string, unknown>): Promise<GigShieldSimulationResult> {
  return request<GigShieldSimulationResult>("/api/disruption/simulate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getActiveDisruptions(): Promise<GigShieldDisruption[]> {
  const data = await request<{ disruptions: GigShieldDisruption[] }>("/api/disruption/active");
  return data.disruptions;
}

export async function getClaims(): Promise<GigShieldClaimRecord[]> {
  const data = await request<{ claims: GigShieldClaimRecord[] }>("/api/claims/history");
  return data.claims;
}

export async function getClaimTimeline(claimId: string): Promise<{ claim: GigShieldClaimRecord; reasoning: string[] }> {
  return request<{ claim: GigShieldClaimRecord; reasoning: string[] }>(`/api/claims/timeline/${claimId}`);
}

export async function processClaim(claimId: string, payload: Record<string, unknown> = {}): Promise<GigShieldSimulationResult> {
  return request<GigShieldSimulationResult>(`/api/claims/${claimId}/process`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPayouts(): Promise<GigShieldPayout[]> {
  const data = await request<{ payouts: GigShieldPayout[] }>(`/api/payouts/my-payouts`);
  return data.payouts;
}

export async function getPayoutStats(): Promise<{
  total_amount: number;
  by_status: { pending: number; processing: number; completed: number };
  recent_payouts: GigShieldPayout[];
}> {
  return request(`/api/payouts/stats`);
}

export async function getNotifications(): Promise<GigShieldNotification[]> {
  const data = await request<{ notifications: GigShieldNotification[] }>("/api/notifications/feed");
  return data.notifications;
}

export async function triggerPaymentSuccess(payload: { payoutId: string; gatewayReference?: string | null }) {
  return request("/api/webhook/payment-success", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clearNotifications(): Promise<void> {
  await request("/api/notifications/clear", {
    method: "POST",
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await request(`/api/notifications/${notificationId}/read`, {
    method: "POST",
  });
}
