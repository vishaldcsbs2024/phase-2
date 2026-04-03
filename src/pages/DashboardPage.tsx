import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPolicy, getPremium, getAlerts, simulateTrigger } from "@/services/api";
import type { Policy, PremiumItem, Alert } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CloudRain, Car, Waves, LogOut, Zap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [premium, setPremium] = useState<PremiumItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPolicy(), getPremium(), getAlerts()]).then(([p, pr, a]) => {
      setPolicy(p);
      setPremium(pr);
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  const handleSimulate = async (type: string) => {
    setSimulating(type);
    const { claim, alert } = await simulateTrigger(type);
    setAlerts(prev => [alert, ...prev]);
    
    // Update premium dynamically
    setPremium(prev => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const exists = prev.find(p => p.label === label);
      if (exists) return prev;
      return [...prev, { label, amount: type === "flood" ? 15 : 10, type: "add" }];
    });

    // Update policy premium
    setPolicy(prev => prev ? { ...prev, weeklyPremium: prev.weeklyPremium + (type === "flood" ? 15 : 10) } : prev);

    toast.success(`₹${claim.amount} credited automatically`, {
      description: `${claim.event} event detected and processed`,
    });
    setSimulating(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/register");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto pt-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 pb-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-xl font-bold text-foreground">{user?.name} 👋</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Policy Card */}
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -mr-10 -mt-10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Your Policy</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${policy?.status === "active" ? "bg-primary-foreground/20" : "bg-destructive/80 text-destructive-foreground"}`}>
                {policy?.status === "active" ? "● Active" : "● Inactive"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs opacity-70">Weekly Premium</p>
                <p className="text-2xl font-bold">₹{policy?.weeklyPremium}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Coverage</p>
                <p className="text-2xl font-bold">₹{policy?.coverageAmount?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Breakdown */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Premium Breakdown</h2>
          <div className="flex flex-wrap gap-2">
            {premium.map((item, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all animate-slide-in ${
                  item.type === "base" ? "bg-secondary text-secondary-foreground"
                  : item.type === "add" ? "bg-warning/15 text-warning"
                  : "bg-success/15 text-success"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {item.label} {item.amount >= 0 ? `+₹${item.amount}` : `-₹${Math.abs(item.amount)}`}
              </span>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Alerts</h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, i) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm animate-slide-in ${
                  alert.type === "warning" ? "bg-warning/10 text-warning"
                  : alert.type === "success" ? "bg-success/10 text-success"
                  : "bg-info/10 text-info"
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="text-lg">{alert.icon}</span>
                <span className="font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulate Triggers */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-card-foreground">Simulate Trigger</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Test the automated claims system</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: "rain", label: "Rain", icon: CloudRain },
              { type: "traffic", label: "Traffic", icon: Car },
              { type: "flood", label: "Flood", icon: Waves },
            ].map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto py-3 flex flex-col gap-1.5"
                disabled={!!simulating}
                onClick={() => handleSimulate(type)}
              >
                <Icon className={`h-5 w-5 ${simulating === type ? "animate-pulse" : ""}`} />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Nav to claims */}
        <Button variant="outline" className="w-full" onClick={() => navigate("/claims")}>
          View Claim History →
        </Button>
      </div>
    </div>
  );
}
