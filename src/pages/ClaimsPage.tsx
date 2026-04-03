import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, CloudRain, Car, Waves, BadgeCheck, Sparkles } from "lucide-react";
import { getClaims } from "@/services/api";
import type { Claim } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const triggerMeta = {
  "Heavy Rain": { icon: CloudRain, tone: "text-emerald-700", bg: "bg-emerald-100" },
  "Traffic Jam": { icon: Car, tone: "text-emerald-700", bg: "bg-emerald-100" },
  "Flood Warning": { icon: Waves, tone: "text-emerald-700", bg: "bg-emerald-100" },
} as const;

export default function ClaimsPage() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    getClaims().then((items) => {
      setClaims(items);
      setLoading(false);
    });
  }, []);

  const processedCount = useMemo(() => claims.filter((claim) => claim.status === "processed").length, [claims]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 relative space-y-5">
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Claim History</h1>
            <p className="text-sm text-muted-foreground">Processed claims and credited amounts</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-emerald-200/70 bg-gradient-to-br from-white/80 to-emerald-50/90 backdrop-blur-xl p-4 shadow-[0_16px_40px_-26px_rgba(16,185,129,0.55)]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <p className="text-sm font-semibold text-card-foreground">Insurance activity overview</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/65 p-3 border border-border/60">
              <p className="text-xs text-muted-foreground">Total claims</p>
              <p className="text-xl font-bold text-foreground">{claims.length}</p>
            </div>
            <div className="rounded-2xl bg-white/65 p-3 border border-border/60">
              <p className="text-xs text-muted-foreground">Processed</p>
              <p className="text-xl font-bold text-success">{processedCount}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-[24px]" />
            <Skeleton className="h-24 w-full rounded-[24px]" />
            <Skeleton className="h-24 w-full rounded-[24px]" />
          </div>
        ) : claims.length === 0 ? (
          <div className="rounded-[24px] border border-border/70 bg-card/80 backdrop-blur-sm p-6 text-center">
            <BadgeCheck className="h-8 w-8 mx-auto text-emerald-700" />
            <p className="mt-3 text-sm font-semibold text-card-foreground">No claims yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Triggered claims and credited payouts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim, index) => {
              const meta = triggerMeta[claim.event as keyof typeof triggerMeta] ?? triggerMeta["Heavy Rain"];
              const Icon = meta.icon;
              return (
                <div
                  key={claim.id}
                  className="rounded-[24px] border border-border/70 bg-card/80 backdrop-blur-sm p-4 shadow-[0_14px_36px_-24px_rgba(0,0,0,0.35)]"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${meta.bg} ${meta.tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{claim.event}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <Clock3 className="inline h-3.5 w-3.5 mr-1 align-[-2px]" />
                          {new Date(claim.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-success/15 text-success px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Processed
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50/80 border border-emerald-100 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Amount credited</p>
                    <p className="text-lg font-extrabold text-success">Rs {claim.amount}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
