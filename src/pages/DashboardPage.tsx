import { useEffect, useMemo, useRef, useState } from "react";
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
  Claim,
  RiskScore,
  DisruptionEvent,
  PreventionScore,
  ExplainabilitySnapshot,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  CloudRain,
  Car,
  Waves,
  LogOut,
  Gauge,
  Activity,
  Sparkles,
  MapPin,
  Database,
  CircleCheckBig,
  IndianRupee,
  LoaderCircle,
  Radar,
  Clock3,
  Camera,
  RotateCcw,
  ScanSearch,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

type TriggerType = "rain" | "traffic" | "flood";

type ClaimStatus =
  | "idle"
  | "detecting"
  | "paycheck"
  | "camera"
  | "analyzing"
  | "location"
  | "approval"
  | "processing-payment"
  | "verifying-location"
  | "validating-data"
  | "approved"
  | "rejected"
  | "paid";

const triggerConfig: Record<TriggerType, { label: string; amount: number; icon: typeof CloudRain }> = {
  rain: { label: "Rain", amount: 120, icon: CloudRain },
  traffic: { label: "Traffic", amount: 80, icon: Car },
  flood: { label: "Flood", amount: 200, icon: Waves },
};

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMatch, setCameraMatch] = useState<boolean | null>(null);
  const [cameraConfidence, setCameraConfidence] = useState(0);
  const [locationVerified, setLocationVerified] = useState(false);
  const [dataVerified, setDataVerified] = useState(false);
  const [claimApproved, setClaimApproved] = useState(false);
  const [approvalScore, setApprovalScore] = useState(0);
  const [approvalDecision, setApprovalDecision] = useState<string>("Awaiting checks");
  const [suggestedReason, setSuggestedReason] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [capturingFlash, setCapturingFlash] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [gpsProgress, setGpsProgress] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [payoutCount, setPayoutCount] = useState(0);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [rippleTrigger, setRippleTrigger] = useState<TriggerType | null>(null);

  async function startCamera() {
    if (isCameraActive || capturedImage) return;

    try {
      setVerificationStatus("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setCameraReady(true);
      setClaimStatus("camera");
      setVerificationStep(3);
      setVerificationStatus("success");
    } catch {
      setIsCameraActive(false);
      setCameraReady(false);
      setVerificationStatus("failed");
      toast.error("Camera permission is required to continue.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  }

  async function validateCapturedImage(imageData?: string) {
    if (!selectedTrigger || !(imageData ?? capturedImage)) return;

    setVerificationStep(4);
    setClaimStatus("analyzing");
    setVerificationStatus("loading");

    await wait(1200);

    const baseConfidence = selectedTrigger === "flood" ? 94 : selectedTrigger === "rain" ? 92 : 88;
    const matched = Math.random() > 0.14;
    const score = matched ? baseConfidence : 58 + Math.floor(Math.random() * 7);

    setCameraMatch(matched);
    setCameraConfidence(score);
    setConfidence(score);
    setVerificationStatus(matched ? "success" : "failed");

    if (!matched) {
      setClaimStatus("rejected");
      setIsVerified(false);
      setClaimApproved(false);
      setApprovalDecision("Verification mismatch. Please retake the image.");
      return;
    }

    setIsVerified(true);
    setClaimStatus("location");
    setApprovalDecision("Image verified. Proceeding to GPS and data validation.");
    setVerificationStep(5);
    await runLocationAndDataChecks(score);
  }

  async function captureProof() {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;

    setCapturingFlash(true);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(image);
    stopCamera();
    setVerificationStatus("loading");
    setClaimStatus("analyzing");
    setVerificationStep(4);
    setTimeout(() => setCapturingFlash(false), 180);
    await validateCapturedImage(image);
  }

  function retakeProof() {
    setCapturedImage(null);
    setCameraMatch(null);
    setCameraConfidence(0);
    setIsVerified(false);
    setClaimApproved(false);
    setDataVerified(false);
    setLocationVerified(false);
    setGpsProgress(0);
    setPaymentCount(0);
    setPayoutCount(0);
    setApprovalScore(0);
    setClaimStatus("camera");
    setVerificationStatus("idle");
    setVerificationStep(3);
    void startCamera();
  }

  async function runLocationAndDataChecks(baseScore: number) {
    setClaimStatus("verifying-location");
    setVerificationStep(5);
    setVerificationStatus("loading");

    for (let progress = 0; progress <= 100; progress += 5) {
      setGpsProgress(progress);
      await wait(45);
    }

    await wait(300);

    setLocationVerified(true);
    setDataVerified(true);
    setApprovalScore(baseScore + 2);
    setClaimStatus("approval");
    setVerificationStep(6);
    setVerificationStatus("success");
    setApprovalDecision("GPS location and disruption data confirmed.");
    setClaimApproved(true);

    await wait(650);
    setVerificationStep(7);
    setClaimStatus("approved");
    setPaymentAmount(triggerConfig[selectedTrigger!].amount);
  }

  async function processPayout(amount: number, approvedOverride = false) {
    const approved = approvedOverride || claimApproved;
    if (!selectedTrigger || !approved || !cameraMatch || !locationVerified || approvalScore < 80) return;

    setProcessingPayout(true);
    setClaimStatus("processing-payment");
    setVerificationStatus("loading");
    setVerificationStep(7);
    setPaymentAmount(amount);
    setPaymentCount(0);

    for (let value = 0; value <= amount; value += Math.max(4, Math.ceil(amount / 28))) {
      setPaymentCount(Math.min(value, amount));
      setPayoutCount(Math.min(value, amount));
      await wait(34);
    }

    const { claim, alert } = await simulateTrigger(selectedTrigger);
    applySimulatedClaim(selectedTrigger, claim, alert);

    setPaymentCount(amount);
    setPayoutCount(amount);
    setVerificationStatus("success");
    setClaimStatus("paid");
    setApprovalDecision("Claim approved and payment credited.");
    setProcessingPayout(false);
    setSheetOpen(false);
    navigate("/claims");
  }

  async function finishVerification() {
    if (!selectedTrigger || claimStatus !== "approved") return;
    await processPayout(paymentAmount || triggerConfig[selectedTrigger].amount, true);
  }

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

  useEffect(() => {
    if (!sheetOpen || !selectedTrigger) return;

    setVerificationStep(0);
    setIsVerified(false);
    setVerificationStatus("idle");
    setClaimStatus("detecting");
    setGpsProgress(0);
    setPayoutCount(0);
    setPaymentCount(0);
    setConfidence(0);
    setCameraMatch(null);
    setCapturedImage(null);
    setCameraReady(false);
    setIsCameraActive(false);
    setLocationVerified(false);
    setDataVerified(false);
    setApprovalScore(0);
    setApprovalDecision("Awaiting checks");
    setSuggestedReason(
      selectedTrigger === "rain"
        ? "Heavy rainfall with waterlogging risk near the pickup zone"
        : selectedTrigger === "traffic"
        ? "Route delay caused by severe congestion and stalled movement"
        : "Flood conditions with road blockage and unsafe commute",
    );

    const timer = setTimeout(() => {
      setVerificationStep(1);
      setVerificationStatus("loading");
      setClaimStatus("paycheck");
    }, 650);

    return () => clearTimeout(timer);
  }, [sheetOpen, selectedTrigger]);

  useEffect(() => {
    if (!sheetOpen) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
      return;
    }

    if (verificationStep === 3 && !streamRef.current && !capturedImage) {
      void startCamera();
    }

    return () => {
      if (!sheetOpen) {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [capturedImage, sheetOpen, verificationStep]);

  const applySimulatedClaim = (type: string, claim: Claim, alert: Alert) => {
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

    setPremium(prev => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const exists = prev.find(p => p.label === label);
      if (exists) return prev;
      return [...prev, { label, amount: type === "flood" ? 15 : 10, type: "add" }];
    });

    setPolicy(prev => prev ? { ...prev, weeklyPremium: prev.weeklyPremium + (type === "flood" ? 15 : 10) } : prev);

    toast.success(`Rs ${claim.amount} credited automatically`, {
      description: `${claim.event} event detected and processed`,
    });
    setPayoutFx({ show: true, amount: claim.amount });
    setTimeout(() => setPayoutFx({ show: false, amount: 0 }), 1600);
  };

  const handleTriggerClick = (type: TriggerType) => {
    setSelectedTrigger(type);
    setRippleTrigger(type);
    setVerificationStep(1);
    setVerificationStatus("idle");
    setClaimStatus("detecting");
    setSheetOpen(true);
    setTimeout(() => setRippleTrigger(null), 460);
  };

  const triggerTimeline = useMemo(() => {
    const current = selectedTrigger ? triggerConfig[selectedTrigger] : null;
    return [
      {
        key: "detect",
        title: "Detect Event",
        icon: Radar,
        description: current ? `${current.label} disruption detected in ${user?.city}` : "Waiting for trigger",
        status: verificationStep > 0 ? "done" : verificationStep === 0 ? "active" : "idle",
      },
      {
        key: "location",
        title: "Location Verification",
        icon: MapPin,
        description: isVerified ? "GPS + anti-fraud signals verified" : "Start secure location verification",
        status: isVerified ? "done" : verificationStep === 1 ? "active" : "idle",
      },
      {
        key: "validation",
        title: "Data Validation",
        icon: Database,
        description: "Checking weather, traffic, and disruption APIs",
        status: verificationStep > 2 ? "done" : verificationStep === 2 ? "active" : "idle",
      },
      {
        key: "approval",
        title: "Claim Approval",
        icon: CircleCheckBig,
        description: confidence ? `${confidence}% confidence and auto-approved` : "Awaiting model confidence",
        status: verificationStep > 3 ? "done" : verificationStep === 3 ? "active" : "idle",
      },
      {
        key: "payment",
        title: "Payment Processed",
        icon: IndianRupee,
        description: claimStatus === "paid" ? "Transferred instantly" : "Payout locked until verification is complete",
        status: verificationStep >= 4 ? "done" : verificationStep === 4 ? "active" : "idle",
      },
    ] as const;
  }, [claimStatus, confidence, isVerified, selectedTrigger, user?.city, verificationStep]);

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
        description: `Premium updated to Rs ${next.weeklyPremium}, coverage to Rs ${next.coverageAmount.toLocaleString()}`,
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[280px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.28),transparent_72%)]" />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-green-500/15 blur-3xl" />
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-5 relative">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-xl font-bold text-foreground">{user?.name} - Hi</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="glass-card rounded-[24px] p-5">
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

        <div className="rounded-[24px] p-5 text-primary-foreground relative overflow-hidden shadow-[0_20px_55px_-20px_rgba(16,185,129,0.65)] bg-[linear-gradient(132deg,#16a34a_0%,#10b981_100%)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -mr-10 -mt-10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Your Policy</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${policy?.status === "active" ? "bg-primary-foreground/20" : "bg-destructive/80 text-destructive-foreground"}`}>
                {policy?.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs opacity-70">Weekly Premium</p>
                <p className="text-2xl font-bold">Rs {policy?.weeklyPremium}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Coverage</p>
                <p className="text-2xl font-bold">Rs {policy?.coverageAmount?.toLocaleString()}</p>
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

        <div className="glass-card rounded-[24px] p-5">
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
                  {f.direction === "up" ? `+Rs ${f.impact}` : `-Rs ${f.impact}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
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

        <div className="glass-card rounded-[24px] p-5">
          <h2 className="text-sm font-semibold text-card-foreground">Explainable AI</h2>
          <p className="text-xs text-muted-foreground mt-1">Why premium changed from last cycle</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/70 p-2">
              <p className="text-[10px] text-muted-foreground">Previous</p>
              <p className="text-sm font-semibold">Rs {explainability?.previousPremium ?? "--"}</p>
            </div>
            <div className="rounded-lg bg-muted/70 p-2">
              <p className="text-[10px] text-muted-foreground">Current</p>
              <p className="text-sm font-semibold">Rs {explainability?.currentPremium ?? "--"}</p>
            </div>
            <div className="rounded-lg bg-muted/70 p-2">
              <p className="text-[10px] text-muted-foreground">Net Change</p>
              <p className={`text-sm font-semibold ${(explainability?.netChange ?? 0) >= 0 ? "text-warning" : "text-success"}`}>
                {(explainability?.netChange ?? 0) >= 0 ? `+Rs ${explainability?.netChange ?? 0}` : `-Rs ${Math.abs(explainability?.netChange ?? 0)}`}
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
                    {item.amount >= 0 ? `+Rs ${item.amount}` : `-Rs ${Math.abs(item.amount)}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
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
                      {event.source.toUpperCase()} | {new Date(event.detectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${event.premiumDelta > 0 ? "text-warning" : "text-success"}`}>
                    {event.premiumDelta > 0 ? `+Rs ${event.premiumDelta}` : `-Rs ${Math.abs(event.premiumDelta)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
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
                {item.label} {item.amount >= 0 ? `+Rs ${item.amount}` : `-Rs ${Math.abs(item.amount)}`}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-card-foreground">Claims Timeline</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-[11px] font-semibold px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5" /> Live
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {triggerTimeline.map((item, i) => {
                const Icon = item.icon;
                const isDone = item.status === "done";
                const isActive = item.status === "active";
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border p-3 ${
                      isDone
                        ? "border-success/40 bg-success/10"
                        : isActive
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-border/70 bg-background/45"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isDone ? "bg-success/20 text-success" : isActive ? "bg-emerald-500/20 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-card-foreground">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${isDone ? "bg-success/20 text-success" : isActive ? "bg-emerald-500/20 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {isDone ? "Done" : isActive ? "In Progress" : "Pending"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Radar className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-card-foreground">Smart Trigger Flow</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Tap a trigger to open instant verification and payout workflow</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: "rain", label: "Rain", icon: CloudRain },
              { type: "traffic", label: "Traffic", icon: Car },
              { type: "flood", label: "Flood", icon: Waves },
            ].map(({ type, label, icon: Icon }) => {
              const typed = type as TriggerType;
              const selected = selectedTrigger === typed;
              return (
                <motion.button
                  key={type}
                  type="button"
                  className={`relative overflow-hidden rounded-[22px] border p-3.5 flex flex-col items-center justify-center gap-1.5 bg-white/55 backdrop-blur-md transition-all ${
                    selected
                      ? "border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_14px_26px_-12px_rgba(16,185,129,0.75)]"
                      : "border-border/70 shadow-[0_12px_26px_-16px_rgba(0,0,0,0.35)]"
                  }`}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={!!simulating || processingPayout}
                  onClick={() => handleTriggerClick(typed)}
                >
                  <Icon className={`h-5 w-5 ${selected ? "text-emerald-700" : "text-foreground/75"} ${typed === "rain" && selected ? "animate-rain-drift" : ""} ${typed === "traffic" && selected ? "animate-car-glide" : ""} ${typed === "flood" && selected ? "animate-wave-sway" : ""}`} />
                  <span className="text-xs font-semibold text-card-foreground">{label}</span>
                  <span className="text-[10px] text-muted-foreground">Rs {triggerConfig[typed].amount}</span>
                  {rippleTrigger === typed ? <span className="trigger-ripple" /> : null}
                </motion.button>
              );
            })}
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate("/claims")}>
          View Claim History
        </Button>

        <div className="glass-card rounded-[24px] p-4">
          <p className="text-xs font-semibold text-card-foreground mb-2">Recent Alerts</p>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert, i) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl text-xs animate-slide-in ${
                  alert.type === "warning" ? "bg-warning/10 text-warning"
                  : alert.type === "success" ? "bg-success/10 text-success"
                  : "bg-info/10 text-info"
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="text-base">{alert.icon}</span>
                <span className="font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {payoutFx.show ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-[3px] px-4">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-success/30 shadow-2xl p-6 text-center animate-payout-pop relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_60%)] pointer-events-none" />
            <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-success/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-accent/20 blur-2xl pointer-events-none" />

            <div className="relative mx-auto mb-3 h-14 w-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center animate-satisfaction-pulse">
              <span className="text-2xl">OK</span>
            </div>

            <p className="text-xs uppercase tracking-[0.18em] text-success font-semibold">Payout Successful</p>
            <p className="text-4xl font-extrabold text-success mt-2 leading-none">Rs {payoutFx.amount}</p>
            <p className="text-sm text-muted-foreground mt-2">Auto-claim approved and credited instantly</p>

            <div className="relative mt-4 h-2 w-full rounded-full bg-success/10 overflow-hidden">
              <div className="h-full w-full bg-success animate-satisfaction-bar" />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-success/90 font-medium">
              <span>Detected</span>
              <span>|</span>
              <span>Approved</span>
              <span>|</span>
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

      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="h-[100svh] rounded-none border-0 bg-[linear-gradient(180deg,rgba(236,253,245,0.98)_0%,rgba(245,255,250,0.96)_100%)] backdrop-blur-xl">
          <DrawerHeader className="pb-3 pt-6 px-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle className="text-left text-xl font-bold">Smart Claim Verification</DrawerTitle>
                <DrawerDescription className="text-left text-xs">
                  Camera proof, AI decision logic, location checks, and instant payout in one flow.
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-white/70 border border-border/60 shadow-sm" aria-label="Close verification flow">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-4 overflow-y-auto h-full">
            <div className="rounded-[24px] border border-emerald-200/80 bg-white/70 p-4 shadow-[0_14px_40px_-24px_rgba(16,185,129,0.55)]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Claim progress</p>
                  <p className="text-[11px] text-muted-foreground">Step {Math.min(verificationStep, 7)} of 7</p>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-semibold">
                  {selectedTrigger ? triggerConfig[selectedTrigger].label : "Trigger"}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {[
                  "Detect",
                  "Details",
                  "Camera",
                  "AI",
                  "Location",
                  "Decision",
                  "Payment",
                ].map((label, index) => {
                  const active = verificationStep >= index + 1;
                  return (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div className={`h-2.5 w-full rounded-full ${active ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-emerald-100"}`} />
                      <span className={`text-[10px] ${active ? "text-emerald-800 font-semibold" : "text-muted-foreground"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border border-emerald-200/70 bg-white/75 p-4"
            >
              <div className="flex items-start gap-3">
                {selectedTrigger ? (() => {
                  const TriggerIcon = triggerConfig[selectedTrigger].icon;
                  return (
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <TriggerIcon className="h-5 w-5" />
                    </span>
                  );
                })() : null}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-card-foreground">Step 1 - Event Detection</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Event detected near your location</p>
                  <p className="mt-2 text-xs text-emerald-800 font-medium">
                    {selectedTrigger ? `${triggerConfig[selectedTrigger].label} condition detected near your route.` : "Waiting for trigger."}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-[24px] border border-emerald-200/70 bg-gradient-to-br from-white/80 to-emerald-50/90 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Step 2 - Disruption Details</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Verify proof of disruption using camera and AI</p>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-semibold">
                  {Math.max(82, approvalScore || 85)}%
                </span>
              </div>
              <p className="text-xs text-card-foreground mt-3">Detected event type</p>
              <div className="mt-2 rounded-2xl border border-border/70 bg-white/80 p-3">
                <p className="text-sm font-semibold text-card-foreground">{selectedTrigger ? triggerConfig[selectedTrigger].label : "None"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Suggested disruption reason</p>
                <textarea
                  value={suggestedReason}
                  onChange={(event) => setSuggestedReason(event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>AI analyzing conditions...</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-xl bg-[linear-gradient(90deg,#16a34a_0%,#10b981_100%)] text-white"
                  onClick={() => {
                    setVerificationStep(3);
                    setClaimStatus("camera");
                    setVerificationStatus("loading");
                  }}
                >
                  Start Camera Verification
                </Button>
                <span className="text-[11px] text-muted-foreground">Moves directly to live proof capture.</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[24px] border border-emerald-200/70 bg-white/75 p-4 overflow-hidden relative"
            >
              {capturingFlash ? <div className="absolute inset-0 bg-white/70 animate-pulse pointer-events-none" /> : null}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Step 3 - Camera Verification</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Capture live proof of rain / flood / traffic</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isCameraActive ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  {isCameraActive ? "Live" : "Paused"}
                </span>
              </div>

              <div className="rounded-[22px] overflow-hidden border border-border/70 bg-black/90 aspect-[4/3] relative">
                {capturedImage ? (
                  <img src={capturedImage} alt="Captured proof" className="h-full w-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                )}
                {!capturedImage && !isCameraActive ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                    <Camera className="h-7 w-7" />
                    <p className="text-xs text-center px-6">Allow camera access to capture live proof.</p>
                    <Button size="sm" variant="secondary" onClick={() => void startCamera()}>
                      Enable Camera
                    </Button>
                  </div>
                ) : null}
                {capturedImage ? (
                  <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm p-3">
                    <p className="text-xs text-white/90">Analyzing image...</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                      <motion.div className="h-full bg-emerald-400" animate={{ width: "100%" }} transition={{ duration: 1.1 }} />
                    </div>
                  </div>
                ) : null}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-4 flex items-center justify-center gap-4">
                {capturedImage ? (
                  <Button variant="outline" className="rounded-full px-4" onClick={retakeProof}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                ) : (
                  <Button
                    className="h-16 w-16 rounded-full bg-[linear-gradient(135deg,#16a34a_0%,#10b981_100%)] shadow-[0_16px_30px_-10px_rgba(16,185,129,0.8)]"
                    onClick={() => void captureProof()}
                    disabled={!isCameraActive}
                  >
                    <Camera className="h-7 w-7" />
                  </Button>
                )}
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Capture live proof of rain / flood / traffic</p>
            </motion.div>

            <AnimatePresence>
              {verificationStep >= 4 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className={`rounded-[24px] border p-4 ${cameraMatch ? "border-success/40 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${cameraMatch ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                      {verificationStatus === "loading" ? <ScanSearch className="h-5 w-5 animate-pulse" /> : cameraMatch ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-card-foreground">Step 4 - AI Validation Result</p>
                      {verificationStatus === "loading" ? (
                        <p className="text-xs text-muted-foreground mt-1">Analyzing image against trigger conditions...</p>
                      ) : cameraMatch ? (
                        <>
                          <p className="text-xs text-success mt-1 font-semibold">Disaster Verified</p>
                          <p className="text-xs text-muted-foreground mt-1">Confidence score: {cameraConfidence}%</p>
                          <div className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs text-success font-medium">
                            Green success animation triggered.
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-destructive mt-1 font-semibold">Verification Failed</p>
                          <p className="text-xs text-muted-foreground mt-1">Please retake the image to continue.</p>
                          <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={retakeProof}>
                            Retake Image
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {verificationStep >= 5 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] border border-emerald-200/70 bg-white/75 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Step 5 - Location + Data Verification</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Verifying GPS location and fetching weather / traffic data...</p>
                  </div>
                  <ShieldCheck className={`h-5 w-5 ${locationVerified ? "text-success" : "text-emerald-700"}`} />
                </div>
                <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                    animate={{ width: `${Math.max(gpsProgress, locationVerified ? 100 : 10)}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
                <div className="mt-3 space-y-2 text-xs text-card-foreground">
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <span>GPS location</span>
                    <span className={locationVerified ? "text-success font-semibold" : "text-warning font-semibold"}>{locationVerified ? "Verified" : "Checking"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <span>Weather / traffic data</span>
                    <span className={dataVerified ? "text-success font-semibold" : "text-warning font-semibold"}>{dataVerified ? "Verified" : "Fetching"}</span>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {verificationStep >= 6 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] border border-emerald-200/70 bg-gradient-to-br from-white/90 to-emerald-50/90 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Step 6 - Claim Approval Decision</p>
                    <p className="text-xs text-muted-foreground mt-0.5">IF camera_verified && location_verified && confidence &gt; threshold, approve claim.</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${claimApproved ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {claimApproved ? "Approved" : "Pending"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-muted-foreground">Camera proof</p>
                    <p className={cameraMatch ? "text-success font-semibold" : "text-destructive font-semibold"}>{cameraMatch ? "Verified" : "Failed"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-muted-foreground">Location proof</p>
                    <p className={locationVerified ? "text-success font-semibold" : "text-warning font-semibold"}>{locationVerified ? "Verified" : "Pending"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-muted-foreground">AI confidence</p>
                    <p className="text-emerald-700 font-semibold">{Math.max(approvalScore, cameraConfidence)}%</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-muted-foreground">Decision</p>
                    <p className="text-emerald-700 font-semibold">{claimApproved ? "Auto-approved" : "Evaluating"}</p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> Auto Claim Decision complete
                </div>
              </motion.div>
            ) : null}

            {verificationStep >= 7 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[24px] border border-success/40 bg-success/10 p-4"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_55%)]" />
                <div className="relative">
                  <p className="text-sm font-semibold text-success">Step 7 - Payment Processing</p>
                  <p className="text-xs text-success/80 mt-1">Payment Credited Successfully</p>
                  <p className="text-4xl font-extrabold text-success mt-3 leading-none">Rs {paymentCount || paymentAmount}</p>
                  <div className="mt-3 h-2 rounded-full bg-success/10 overflow-hidden">
                    <motion.div className="h-full bg-success" animate={{ width: "100%" }} transition={{ duration: 0.5 }} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success">
                    <span>Payment Credited Successfully</span>
                    <span>OK</span>
                  </div>
                  <div className="mt-4">
                    <Button
                      className="w-full rounded-2xl bg-[linear-gradient(90deg,#16a34a_0%,#10b981_100%)] text-white"
                      onClick={() => void finishVerification()}
                      disabled={processingPayout || claimStatus === "paid"}
                    >
                      {processingPayout ? "Saving to claim history..." : claimStatus === "paid" ? "Saved to claim history" : "Finish"}
                    </Button>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span
                      key={index}
                      className="absolute h-1.5 w-1.5 rounded-full bg-success/70 animate-confetti-fall"
                      style={{ left: `${6 + index * 7}%`, top: "-8px", animationDelay: `${index * 70}ms` }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}

            {verificationStatus === "failed" && !cameraMatch ? (
              <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium">
                Verification failed. Retake the image to continue.
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
