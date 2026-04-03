import type { User, Policy, PremiumItem, Alert, Claim, RegisterData } from "@/types";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function registerUser(data: RegisterData): Promise<User> {
  await delay(800);
  return { id: crypto.randomUUID(), ...data };
}

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

export async function getAlerts(): Promise<Alert[]> {
  await delay(300);
  return [
    { id: "1", message: "Heavy rain detected ☔", icon: "🌧️", type: "warning", timestamp: new Date().toISOString() },
    { id: "2", message: "₹120 credited automatically", icon: "✅", type: "success", timestamp: new Date().toISOString() },
  ];
}

export async function getClaims(): Promise<Claim[]> {
  await delay(400);
  return [
    { id: "1", date: "2025-04-01", event: "Heavy Rain", amount: 120, status: "processed" },
    { id: "2", date: "2025-03-28", event: "Traffic Jam", amount: 80, status: "processed" },
    { id: "3", date: "2025-03-20", event: "Flood Warning", amount: 200, status: "processed" },
  ];
}

export async function simulateTrigger(type: string): Promise<{ claim: Claim; alert: Alert }> {
  await delay(600);
  const amounts: Record<string, number> = { rain: 120, traffic: 80, flood: 200 };
  const amount = amounts[type] || 100;
  return {
    claim: {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      event: type.charAt(0).toUpperCase() + type.slice(1),
      amount,
      status: "processed",
    },
    alert: {
      id: crypto.randomUUID(),
      message: `₹${amount} credited — ${type} event detected`,
      icon: "✅",
      type: "success",
      timestamp: new Date().toISOString(),
    },
  };
}
