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

export interface Claim {
  id: string;
  date: string;
  event: string;
  amount: number;
  status: "processed" | "pending";
}

export interface RegisterData {
  name: string;
  phone: string;
  workType: string;
  weeklyIncome: number;
  city: string;
}
