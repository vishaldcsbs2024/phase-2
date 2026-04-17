import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, Brain, CircleDollarSign, Loader2, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { getClaims, getPayouts } from "@/services/gigshieldApi";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#0f172a"];

const formatCurrency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export default function AnalyticsPage() {
  const claimsQuery = useQuery({
    queryKey: ["analytics-claims"],
    queryFn: () => getClaims(),
  });

  const payoutsQuery = useQuery({
    queryKey: ["analytics-payouts"],
    queryFn: () => getPayouts(),
  });

  const claims = claimsQuery.data ?? [];
  const payouts = payoutsQuery.data ?? [];

  const totalClaims = claims.length;
  const totalPayouts = payouts.reduce((sum, payout) => sum + Number(payout.payout_amount || payout.amount || 0), 0);
  const approvedClaims = claims.filter((claim) => claim.status === "approved" || claim.status === "completed").length;
  const fraudRate = totalClaims > 0 ? Math.round((claims.filter((claim) => Number(claim.fraud_score || 0) >= 55).length / totalClaims) * 100) : 0;

  const claimsSeries = useMemo(() => {
    const recent = [...claims]
      .sort((left, right) => new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime())
      .slice(-7);

    if (recent.length === 0) {
      return [
        { label: "Mon", value: 1 },
        { label: "Tue", value: 2 },
        { label: "Wed", value: 1 },
        { label: "Thu", value: 3 },
        { label: "Fri", value: 2 },
        { label: "Sat", value: 4 },
        { label: "Sun", value: 3 },
      ];
    }

    return recent.map((claim, index) => ({
      label: new Date(claim.created_at ?? Date.now() + index * 86_400_000).toLocaleDateString("en-IN", { weekday: "short" }),
      value: Number(claim.daily_payout ?? 0),
    }));
  }, [claims]);

  const fraudBreakdown = [
    { name: "Safe", value: Math.max(0, 100 - fraudRate) },
    { name: "Risky", value: Math.max(0, fraudRate) },
  ];

  const riskTrend = useMemo(() => {
    return claims.slice(-5).map((claim, index) => ({
      label: `Claim ${index + 1}`,
      value: Number(claim.risk_score || 0),
    }));
  }, [claims]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<BarChart3 className="h-4 w-4" />} title="Total Claims" value={String(totalClaims)} hint={`${approvedClaims} approved`} />
          <MetricCard icon={<ShieldAlert className="h-4 w-4" />} title="Fraud Rate" value={`${fraudRate}%`} hint="Signals flagged by engine" />
          <MetricCard icon={<CircleDollarSign className="h-4 w-4" />} title="Total Payouts" value={formatCurrency(totalPayouts)} hint="Live credited value" />
          <MetricCard icon={<Brain className="h-4 w-4" />} title="Approved Ratio" value={totalClaims ? `${Math.round((approvedClaims / totalClaims) * 100)}%` : "0%"} hint="Claims moving through flow" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Trend</p>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Claims over time</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="h-80">
              {claimsQuery.isLoading ? (
                <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={claimsSeries}>
                    <defs>
                      <linearGradient id="claimsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="label" stroke="#64748b" className="dark:stroke-slate-400" />
                    <YAxis stroke="#64748b" className="dark:stroke-slate-400" />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#claimsFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Distribution</p>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Fraud split</h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="h-80">
              {claimsQuery.isLoading ? (
                <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fraudBreakdown} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                      {fraudBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Risk</p>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Risk trends</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {riskTrend.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-400">No risk history yet. Run a claim simulation to populate trends.</div>
            ) : (
              riskTrend.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{item.value}/100</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function MetricCard({ icon, title, value, hint }: { icon: ReactNode; title: string; value: string; hint: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5 shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <div className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}
