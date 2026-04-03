import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getPolicy,
  getPremium,
  getAlerts,
  simulateTrigger,
  getRiskScore,
  getDisruptionFeed,
  getRecommendedCoverage,
  getPreventionScore,
  getExplainabilitySnapshot,
} from "@/services/api";
import type {
  Policy,
  PremiumItem,
  Alert,
  RiskScore,
  DisruptionEvent,
  PreventionScore,
  ExplainabilitySnapshot,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CloudRain, Car, Waves, LogOut, Zap, Gauge, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [premium, setPremium] = useState<PremiumItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [prevention, setPrevention] = useState<PreventionScore | null>(null);
  const [explainability, setExplainability] = useState<ExplainabilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [payoutFx, setPayoutFx] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  useEffect(() => {
    const city = user?.city ?? "Mumbai";
    Promise.all([getPolicy(), getPremium(), getAlerts(), getRiskScore(city), getDisruptionFeed(city)]).then(async ([p, pr, a, r, ev]) => {
      setPolicy(p);
      setPremium(pr);
      setAlerts(a);
      setRisk(r);
      setEvents(ev);

      const [preventionData, explainabilityData] = await Promise.all([
        getPreventionScore(city, r.score),
        getExplainabilitySnapshot(p.weeklyPremium, r),
      ]);
      setPrevention(preventionData);
      setExplainability(explainabilityData);
      setLoading(false);
    });
  }, [user?.city]);

  const handleSimulate = async (type: string) => {
    setSimulating(type);
    const { claim, alert } = await simulateTrigger(type);
    setAlerts(prev => [alert, ...prev]);

    const newEvent: DisruptionEvent = {
      id: crypto.randomUUID(),
      source: type === "traffic" ? "traffic" : "weather",
      title: `${claim.event} trigger processed`,
      severity: type === "flood" ? "high" : "medium",
      premiumDelta: type === "flood" ? 15 : 10,
      detectedAt: new Date().toISOString(),
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 8));
    
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
    setPayoutFx({ show: true, amount: claim.amount });
    setTimeout(() => setPayoutFx({ show: false, amount: 0 }), 1600);
    setSimulating(null);
  };

  const applyRecommendation = async () => {
    if (!policy || !risk) return;
    setRecommending(true);
    try {
      const next = await getRecommendedCoverage(policy.weeklyPremium, policy.coverageAmount, risk.score);
      setPolicy(prev => prev ? {
        ...prev,
        weeklyPremium: next.weeklyPremium,
        coverageAmount: next.coverageAmount,
      } : prev);
      setPremium(next.premium);
      toast.success("AI recommendation applied", {
        description: `Premium updated to ₹${next.weeklyPremium}, coverage to ₹${next.coverageAmount.toLocaleString()}`,
      });
    } finally {
      setRecommending(false);
    }
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

        {/* Judge-ready uniqueness summary */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-card-foreground">Why We&apos;re Unique</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Insurance that prevents income loss first, then pays instantly with explainable evidence.
          </p>
          <div className="space-y-2.5">
            <div className="rounded-xl bg-muted/60 px-3 py-2.5">
              <p className="text-xs font-semibold text-card-foreground">Proactive Prevention</p>
              <p className="text-xs text-muted-foreground mt-0.5">Daily Prevention Score gives action tips before disruption impacts earnings.</p>
            </div>
            <div className="rounded-xl bg-muted/60 px-3 py-2.5">
              <p className="text-xs font-semibold text-card-foreground">Explainable AI Pricing</p>
              <p className="text-xs text-muted-foreground mt-0.5">Premium changes are broken into clear factors like weather, traffic, and zone safety.</p>
            </div>
            <div className="rounded-xl bg-muted/60 px-3 py-2.5">
              <p className="text-xs font-semibold text-card-foreground">Evidence-Backed Zero-Touch Claims</p>
              <p className="text-xs text-muted-foreground mt-0.5">Timeline shows confidence scores and source proof from detection to payout.</p>
            </div>
          </div>
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
            <Button
              variant="secondary"
              className="w-full mt-4 bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 border-0"
              onClick={applyRecommendation}
              disabled={recommending}
            >
              <Sparkles className={`h-4 w-4 mr-2 ${recommending ? "animate-pulse" : ""}`} />
              {recommending ? "Updating..." : "Apply AI Recommended Coverage"}
            </Button>
          </div>
        </div>

        {/* Live Risk Score */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-info" />
                <h2 className="text-sm font-semibold text-card-foreground">Live Risk Score</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Why your premium changed in {user?.city}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              (risk?.score ?? 0) >= 60 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
            }`}>
              Score {risk?.score ?? "--"}/100
            </div>
          </div>
          <p className="text-sm text-card-foreground mb-3">{risk?.explanation}</p>
          <div className="space-y-2">
            {risk?.factors.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-xs rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">{f.label}</span>
                <span className={f.direction === "up" ? "text-warning font-semibold" : "text-success font-semibold"}>
                  {f.direction === "up" ? `+₹${f.impact}` : `-₹${f.impact}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Prevention Score */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-card-foreground">Prevention Score</h2>
              <p className="text-xs text-muted-foreground mt-1">Income protection guidance for today</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${(prevention?.score ?? 0) >= 65 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
              {prevention?.score ?? "--"}/100
            </span>
          </div>
          <p className="text-sm text-card-foreground mb-3">{prevention?.summary}</p>
          <div className="space-y-2">
            {prevention?.insights.map((insight) => (
              <div key={insight.title} className="rounded-xl bg-muted/60 px-3 py-2.5">
                <p className="text-xs font-semibold text-card-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.action}</p>
                <p className="text-xs text-success mt-1 font-medium">Impact: {insight.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Explainable AI */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground">Explainable AI</h2>
          <p className="text-xs text-muted-foreground mt-1">Why premium changed from last cycle</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/70 p-2">
              <p className="text-[10px] text-muted-foreground">Previous</p>
              <p className="text-sm font-semibold">₹{explainability?.previousPremium ?? "--"}</p>
            </div>
            <div className="rounded-lg bg-muted/70 p-2">
              <p className="text-[10px] text-muted-foreground">Current</p>
              <p className="text-sm font-semibold">₹{explainability?.currentPremium ?? "--"}</p>
            </div>
            <div className="rounded-lg bg-muted/70 p-2">
              <p className="text-[10px] text-muted-foreground">Net Change</p>
              <p className={`text-sm font-semibold ${(explainability?.netChange ?? 0) >= 0 ? "text-warning" : "text-success"}`}>
                {(explainability?.netChange ?? 0) >= 0 ? `+₹${explainability?.netChange ?? 0}` : `-₹${Math.abs(explainability?.netChange ?? 0)}`}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{explainability?.narrative}</p>
          <div className="mt-3 space-y-2">
            {explainability?.items.map((item) => (
              <div key={item.label} className="rounded-xl border border-border p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-card-foreground">{item.label}</p>
                  <span className={`text-xs font-semibold ${item.amount >= 0 ? "text-warning" : "text-success"}`}>
                    {item.amount >= 0 ? `+₹${item.amount}` : `-₹${Math.abs(item.amount)}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disruption Feed */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-card-foreground">Auto Disruption Feed</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Weather, traffic, and platform signals update this feed automatically</p>
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.source.toUpperCase()} • {new Date(event.detectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${event.premiumDelta > 0 ? "text-warning" : "text-success"}`}>
                    {event.premiumDelta > 0 ? `+₹${event.premiumDelta}` : `-₹${Math.abs(event.premiumDelta)}`}
                  </span>
                </div>
              </div>
            ))}
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

      {payoutFx.show ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-[3px] px-4">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-success/30 shadow-2xl p-6 text-center animate-payout-pop relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_60%)] pointer-events-none" />
            <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-success/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-accent/20 blur-2xl pointer-events-none" />

            <div className="relative mx-auto mb-3 h-14 w-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center animate-satisfaction-pulse">
              <span className="text-2xl">✅</span>
            </div>

            <p className="text-xs uppercase tracking-[0.18em] text-success font-semibold">Payout Successful</p>
            <p className="text-4xl font-extrabold text-success mt-2 leading-none">₹{payoutFx.amount}</p>
            <p className="text-sm text-muted-foreground mt-2">Auto-claim approved and credited instantly</p>

            <div className="relative mt-4 h-2 w-full rounded-full bg-success/10 overflow-hidden">
              <div className="h-full w-full bg-success animate-satisfaction-bar" />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-success/90 font-medium">
              <span>Detected</span>
              <span>•</span>
              <span>Approved</span>
              <span>•</span>
              <span>Paid</span>
            </div>

            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-success/70 animate-confetti-fall"
                  style={{
                    left: `${8 + i * 9}%`,
                    top: "-10px",
                    animationDelay: `${i * 70}ms`,
                    animationDuration: `${900 + i * 45}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
