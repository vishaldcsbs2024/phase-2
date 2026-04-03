import { useState, useEffect } from "react";
import { getClaims, getAutoPaycheckDecision, addAutoPaycheckClaim } from "@/services/api";
import type { Claim, AutoPaycheckDecision } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Clock, Check, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("Heavy rain and traffic jam near my delivery route");
  const [baseDailyPay, setBaseDailyPay] = useState("900");
  const [initialCoords, setInitialCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [secondaryCoords, setSecondaryCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null);
  const [secondaryPhoto, setSecondaryPhoto] = useState<string | null>(null);
  const [movementDirection, setMovementDirection] = useState<string>("");
  const [verificationPhase, setVerificationPhase] = useState<0 | 1 | 2>(0); // 0=initial, 1=awaiting movement, 2=verified
  const [verificationMessage, setVerificationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [decision, setDecision] = useState<AutoPaycheckDecision | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    getClaims().then(c => { setClaims(c); setLoading(false); });
  }, []);

  const generateMockPhoto = (label: string) => {
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <rect width="720" height="480" fill="url(#g)"/>
        <rect x="28" y="28" width="664" height="424" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.35)"/>
        <text x="50%" y="42%" text-anchor="middle" fill="#f8fafc" font-size="34" font-family="Arial, sans-serif" font-weight="700">Prototype Capture</text>
        <text x="50%" y="52%" text-anchor="middle" fill="#bfdbfe" font-size="28" font-family="Arial, sans-serif">${safeLabel}</text>
        <text x="50%" y="63%" text-anchor="middle" fill="#dbeafe" font-size="20" font-family="Arial, sans-serif">${time}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const getLocationOrMock = (phase: 0 | 1) =>
    new Promise<{ latitude: number; longitude: number }>((resolve) => {
      const resolveMock = () => {
        const base = initialCoords ?? { latitude: 12.9716, longitude: 77.5946 };
        const step = 0.00025;

        if (phase === 0 || !movementDirection) {
          resolve({
            latitude: Number((base.latitude + (Math.random() - 0.5) * 0.00004).toFixed(6)),
            longitude: Number((base.longitude + (Math.random() - 0.5) * 0.00004).toFixed(6)),
          });
          return;
        }

        if (movementDirection === "Left") {
          resolve({ latitude: base.latitude, longitude: Number((base.longitude - step).toFixed(6)) });
          return;
        }
        if (movementDirection === "Right") {
          resolve({ latitude: base.latitude, longitude: Number((base.longitude + step).toFixed(6)) });
          return;
        }
        if (movementDirection === "Straight") {
          resolve({ latitude: Number((base.latitude + step).toFixed(6)), longitude: base.longitude });
          return;
        }
        resolve({ latitude: Number((base.latitude - step).toFixed(6)), longitude: base.longitude });
      };

      if (!navigator.geolocation) {
        resolveMock();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          });
        },
        () => resolveMock(),
        { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
      );
    });

  const calculateMovementDirection = (): string => {
    const directions = ["Left", "Right", "Straight", "Backwards"];
    return directions[Math.floor(Math.random() * directions.length)];
  };

  const verifyMovement = (initial: { latitude: number; longitude: number }, secondary: { latitude: number; longitude: number }, direction: string): boolean => {
    const latDiff = secondary.latitude - initial.latitude;
    const lonDiff = secondary.longitude - initial.longitude;
    const minMovement = 0.0001; // ~11 meters
    const totalMovement = Math.abs(latDiff) + Math.abs(lonDiff);

    // For relative directions, we check if there's significant movement in any direction
    // and validate the primary direction of movement
    if (totalMovement < minMovement) return false;

    switch(direction) {
      case "Left":
        return lonDiff < -minMovement;
      case "Right":
        return lonDiff > minMovement;
      case "Straight":
        return latDiff > minMovement;
      case "Backwards":
        return latDiff < -minMovement;
      default:
        return false;
    }
  };

  const captureLocationWithPhoto = async () => {
    setLocating(true);
    await new Promise(resolve => setTimeout(resolve, 450));

    if (verificationPhase === 0) {
      const newCoords = await getLocationOrMock(0);
      const photo = generateMockPhoto("Initial Proof");

      setInitialCoords(newCoords);
      setInitialPhoto(photo);

      const direction = calculateMovementDirection();
      setMovementDirection(direction);
      setVerificationPhase(1);
      setLocating(false);
      toast.success(`Prototype capture complete. Move ${direction.toUpperCase()} and verify again.`);
      return;
    }

    if (verificationPhase === 1) {
      const newCoords = await getLocationOrMock(1);
      const photo = generateMockPhoto(`After ${movementDirection}`);

      setSecondaryCoords(newCoords);
      setSecondaryPhoto(photo);

      if (initialCoords && verifyMovement(initialCoords, newCoords, movementDirection)) {
        setVerificationPhase(2);
        setVerificationMessage(`Verified movement ${movementDirection.toUpperCase()} (prototype mode)`);
        toast.success("Movement verified in prototype mode. You can now submit the auto paycheck.");
      } else {
        setVerificationMessage(`Could not validate movement ${movementDirection}. Tap verify again.`);
        setSecondaryCoords(null);
        setSecondaryPhoto(null);
        toast.error(`Try one more step ${movementDirection.toUpperCase()} and verify again.`);
      }
    }

    setLocating(false);
  };

  const resetVerification = () => {
    setInitialCoords(null);
    setSecondaryCoords(null);
    setInitialPhoto(null);
    setSecondaryPhoto(null);
    setMovementDirection("");
    setVerificationPhase(0);
    setVerificationMessage("");
    setDecision(null);
  };


  const runAutoPaycheck = async () => {
    const pay = Number(baseDailyPay);
    if (!initialCoords || verificationPhase !== 2) {
      toast.error("Please complete location and movement verification first");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter disruption reason");
      return;
    }
    if (!Number.isFinite(pay) || pay <= 0) {
      toast.error("Enter a valid base daily pay");
      return;
    }

    setCalculating(true);
    try {
      const result = await getAutoPaycheckDecision({
        latitude: initialCoords.latitude,
        longitude: initialCoords.longitude,
        reason: reason.trim(),
        base_daily_pay: pay,
      });
      setDecision(result);

      const createdClaim = await addAutoPaycheckClaim(result);
      setClaims(prev => [createdClaim, ...prev]);

      toast.success("Automated paycheck decision generated");
      resetVerification();
    } catch {
      toast.error("Could not generate paycheck decision");
    } finally {
      setCalculating(false);
    }
  };

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

        {/* Location + reason paycheck engine with anti-fraud verification */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">Auto Paycheck Decision</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prototype flow: simulate photo proof + movement verification, then fetch weather + traffic context.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-card-foreground">Disruption reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[72px]"
              placeholder="Example: Heavy rain and traffic blocked my delivery route"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-card-foreground">Base daily pay (₹)</label>
            <Input
              type="number"
              value={baseDailyPay}
              onChange={(e) => setBaseDailyPay(e.target.value)}
              placeholder="900"
            />
          </div>

          {/* Anti-fraud location verification */}
          <div className="bg-muted/40 rounded-xl p-3 border border-border space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-card-foreground">Location Verification (Anti-Fraud)</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {verificationPhase === 0 ? "Capture initial location and photo" : verificationPhase === 1 ? `Move ${movementDirection} and capture again` : "✓ Verified"}
              </p>
            </div>

            {/* Photo gallery */}
            <div className="grid grid-cols-2 gap-2">
              {initialPhoto && (
                <div className="rounded-lg overflow-hidden border-2 border-success/30">
                  <img
                    src={initialPhoto}
                    alt="Initial location"
                    className="w-full h-24 object-cover"
                  />
                  <p className="text-[10px] text-muted-foreground px-2 py-1 bg-success/5">
                    Initial
                  </p>
                </div>
              )}
              {secondaryPhoto && (
                <div className="rounded-lg overflow-hidden border-2 border-info/30">
                  <img
                    src={secondaryPhoto}
                    alt="Verification location"
                    className="w-full h-24 object-cover"
                  />
                  <p className="text-[10px] text-muted-foreground px-2 py-1 bg-info/5">
                    After {movementDirection}
                  </p>
                </div>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex gap-2">
              {verificationPhase === 0 && !initialPhoto && (
                <Button
                  onClick={captureLocationWithPhoto}
                  disabled={locating}
                  className="flex-1"
                  size="sm"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  {locating ? "Capturing..." : "Start Verification"}
                </Button>
              )}
              {verificationPhase === 1 && initialPhoto && !secondaryPhoto && (
                <Button
                  onClick={captureLocationWithPhoto}
                  disabled={locating}
                  className="flex-1"
                  size="sm"
                >
                  {locating ? "Capturing..." : `Move ${movementDirection} & Verify`}
                </Button>
              )}
              {verificationPhase > 0 && (
                <Button
                  onClick={resetVerification}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Verification status */}
            {verificationPhase === 2 && (
              <div className="rounded-lg bg-success/10 border border-success/30 p-2">
                <p className="text-xs font-semibold text-success">{verificationMessage}</p>
              </div>
            )}
            {verificationPhase === 1 && secondaryPhoto && verificationMessage.startsWith("✗") && (
              <div className="rounded-lg bg-warning/10 border border-warning/30 p-2">
                <p className="text-xs font-semibold text-warning">{verificationMessage}</p>
              </div>
            )}
            {initialCoords && (
              <p className="text-[11px] text-muted-foreground">
                Initial: {initialCoords.latitude}, {initialCoords.longitude}
              </p>
            )}
            {secondaryCoords && (
              <p className="text-[11px] text-muted-foreground">
                Current: {secondaryCoords.latitude}, {secondaryCoords.longitude}
              </p>
            )}
          </div>

          {/* Auto Paycheck button */}
          <Button
            onClick={runAutoPaycheck}
            disabled={calculating || locating || verificationPhase !== 2}
            className="w-full"
          >
            {calculating ? "Calculating..." : verificationPhase !== 2 ? "Complete Verification First" : "Get Auto Paycheck"}
          </Button>

          {verificationPhase !== 2 && (
            <p className="text-[11px] text-warning text-center">
              Complete location and movement verification to enable auto paycheck.
            </p>
          )}

          {decision ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-card-foreground">Recommended Paycheck</p>
                <p className="text-lg font-bold text-success">₹{decision.paycheck.recommended_paycheck}</p>
              </div>
              <p className="text-xs text-muted-foreground">{decision.paycheck.reason_label}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-muted-foreground">Location confidence</p>
                  <p className="font-semibold text-card-foreground">{Math.round(decision.location_verification.confidence * 100)}%</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-muted-foreground">Decision confidence</p>
                  <p className="font-semibold text-card-foreground">{Math.round(decision.paycheck.decision_confidence * 100)}%</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-muted-foreground">Weather severity</p>
                  <p className="font-semibold text-card-foreground">{Math.round(decision.weather.severity_score * 100)}%</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-muted-foreground">Traffic risk</p>
                  <p className="font-semibold text-card-foreground">{Math.round(decision.traffic.score * 100)}%</p>
                </div>
              </div>
              <a
                href={decision.location_verification.satellite_evidence_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs text-info hover:underline"
              >
                View satellite verification snapshot
              </a>
            </div>
          ) : null}
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

                {claim.timeline?.length ? (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Claim Timeline</p>
                    <div className="grid grid-cols-2 gap-2">
                      {claim.timeline.map((step) => (
                        <div key={step.id} className="rounded-lg bg-muted/60 px-2.5 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${step.done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                              {step.done ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            </span>
                            <span className="text-[11px] font-medium text-card-foreground">{step.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 ml-5">
                            {new Date(step.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-info mt-0.5 ml-5 font-medium">
                            Confidence: {Math.round((step.confidence ?? 0.85) * 100)}%
                          </p>
                          <div className="ml-5 mt-1 flex flex-wrap gap-1">
                            {(step.evidenceSources ?? ["System Rules"]).map((source) => (
                              <span key={source} className="text-[9px] px-1.5 py-0.5 rounded bg-info/10 text-info">
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
