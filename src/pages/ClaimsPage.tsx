import { useState, useEffect } from "react";
import { getClaims } from "@/services/api";
import type { Claim } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getClaims().then(c => { setClaims(c); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 pb-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Claims</h1>
            <p className="text-sm text-muted-foreground">Zero-touch, auto-processed</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
          <p className="text-sm text-primary font-medium">
            🤖 All claims are processed automatically — no action needed from you.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim, i) => (
              <div
                key={claim.id}
                className="bg-card rounded-2xl border border-border p-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-card-foreground">{claim.event}</p>
                    <p className="text-xs text-muted-foreground">{new Date(claim.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    claim.status === "processed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  }`}>
                    {claim.status === "processed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {claim.status === "processed" ? "Processed" : "Pending"}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Amount credited</span>
                  <span className="text-lg font-bold text-success">₹{claim.amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && claims.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No claims yet. Claims are processed automatically when events occur.</p>
          </div>
        )}
      </div>
    </div>
  );
}
