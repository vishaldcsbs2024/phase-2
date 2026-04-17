import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Clock3, ShieldAlert, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { getClaims, getPayouts } from "@/services/gigshieldApi";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const statusTone = (status: string) => {
  if (status === "approved" || status === "completed") return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-500/15 text-rose-700 border-rose-200";
  if (status === "manual_review" || status === "processing") return "bg-amber-500/15 text-amber-700 border-amber-200";
  return "bg-slate-500/15 text-slate-700 border-slate-200";
};

export default function GigShieldClaimsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const claimsQuery = useQuery({
    queryKey: ["gigshield-claims-history", user?.id],
    queryFn: () => getClaims(user?.id),
    enabled: Boolean(user?.id),
    refetchInterval: 6000,
  });

  const payoutsQuery = useQuery({
    queryKey: ["gigshield-claims-payouts", user?.id],
    queryFn: () => getPayouts(user?.id),
    enabled: Boolean(user?.id),
    refetchInterval: 6000,
  });

  const claims = claimsQuery.data ?? [];
  const payouts = payoutsQuery.data ?? [];

  const payoutMap = useMemo(
    () => new Map(payouts.map((payout) => [payout.claim_id, payout])),
    [payouts],
  );

  const processedCount = claims.filter((claim) => claim.status === "approved" || claim.status === "completed").length;
  const rejectedCount = claims.filter((claim) => claim.status === "rejected").length;
  const totalCredited = payouts.reduce((sum, payout) => sum + Number(payout.payout_amount || payout.amount || 0), 0);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-[100dvh] max-w-6xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[28px] border border-white/15 bg-slate-950/80 px-5 py-4 text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">GigShield</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Claim history and payout trail</h1>
            <p className="mt-1 text-sm text-slate-300">Every auto-triggered claim, the fraud decision, and the credited payout in one timeline.</p>
          </div>
          <Button variant="ghost" className="border border-white/10 text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<Sparkles className="h-4 w-4" />} title="Claims processed" value={String(processedCount)} />
          <SummaryCard icon={<ShieldAlert className="h-4 w-4" />} title="Claims rejected" value={String(rejectedCount)} />
          <SummaryCard icon={<Wallet className="h-4 w-4" />} title="Total credited" value={formatCurrency(totalCredited)} />
        </div>

        <div className="mt-6 space-y-4">
          {claimsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-[24px]" />
              <Skeleton className="h-28 w-full rounded-[24px]" />
              <Skeleton className="h-28 w-full rounded-[24px]" />
            </div>
          ) : claims.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
              <BadgeCheck className="mx-auto h-9 w-9 text-emerald-700" />
              <p className="mt-3 text-lg font-bold text-slate-950">No claims yet</p>
              <p className="mt-1 text-sm text-slate-600">Run a simulation from the dashboard and the claim history will populate here.</p>
            </div>
          ) : (
            claims.map((claim) => {
              const payout = payoutMap.get(claim.id);
              const reasoning = claim.reasoning_json ? safeParseReasoning(claim.reasoning_json) : [];

              return (
                <div key={claim.id} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_45px_-34px_rgba(15,23,42,0.35)] backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <BadgeCheck className="h-4 w-4 text-emerald-700" />
                        {claim.claim_type ?? claim.disruption_type ?? "GigShield claim"}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{claim.location ?? user?.city ?? "Mumbai"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        <Clock3 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                        {new Date(claim.created_at ?? Date.now()).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge className={statusTone(claim.status)}>{claim.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <InfoCard label="Risk score" value={`${claim.risk_score ?? 0}/100`} />
                    <InfoCard label="Fraud score" value={`${claim.fraud_score ?? 0}/100`} />
                    <InfoCard label="Confidence" value={`${claim.confidence_score ?? 0}/100`} />
                    <InfoCard label="Payout" value={formatCurrency(Number(claim.daily_payout ?? payout?.payout_amount ?? payout?.amount ?? 0))} />
                  </div>

                  {reasoning.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Reasoning</p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {reasoning.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {payout ? (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                      <p className="text-sm font-semibold text-emerald-800">Payout completed</p>
                      <p className="mt-1 text-sm text-slate-700">{formatCurrency(Number(payout.payout_amount || payout.amount || 0))} credited via GigShield ⚡</p>
                      <p className="mt-1 text-xs text-slate-500">Reference: {payout.gateway_reference ?? payout.bank_reference ?? "pending"}</p>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        <span>{title}</span>
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-700">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function safeParseReasoning(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}