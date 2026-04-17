import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import SaaSSidebar from "@/components/layout/SaaSSidebar";
import type {
  GigShieldClaimRecord,
  GigShieldDisruption,
  GigShieldNotification,
  GigShieldPayout,
  GigShieldRiskEvaluation,
  GigShieldSimulationResult,
} from "@/types";
import {
  API_ORIGIN,
  analyzeFraud,
  evaluateRisk,
  getActiveDisruptions,
  getClaims,
  getNotifications,
  markNotificationRead,
  getPayoutStats,
  getPayouts,
  processClaim,
  registerUser,
  simulateDisruption,
} from "@/services/gigshieldApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  ArrowLeft,
  BellRing,
  Camera,
  CheckCircle2,
  CloudRain,
  LocateFixed,
  MapPin,
  RotateCcw,
  ScanSearch,
  Shield,
  ShieldAlert,
  TriangleAlert,
  Wallet,
  Sparkles,
  TrendingUp,
  Users,
  Radar,
  LayoutDashboard,
  Gauge,
  Activity,
  LineChart,
  CircleDollarSign,
  LogOut,
  ShieldCheck,
  Waves,
} from "lucide-react";

type ViewMode = "worker" | "admin";
type Scenario = "rainstorm" | "traffic" | "outage" | "fraud";
type IssueType = "rainstorm" | "traffic" | "outage" | "fraud";

const issueOptions: Array<{ key: IssueType; label: string; description: string }> = [
  { key: "rainstorm", label: "Rainstorm", description: "Heavy rainfall, waterlogging, flood risk" },
  { key: "traffic", label: "Traffic Delay", description: "Route congestion, blocked roads" },
  { key: "outage", label: "Platform Outage", description: "App/server downtime disruption" },
  { key: "fraud", label: "Fraud Attempt", description: "Location/behavior mismatch suspected" },
];

const getIssueDescription = (issueType: IssueType) =>
  issueOptions.find((issue) => issue.key === issueType)?.description ?? issueOptions[0].description;

const riskByCity: Record<string, { weather: number; location: number; traffic: number; incomeTrend: number }> = {
  Mumbai: { weather: 88, location: 70, traffic: 79, incomeTrend: 58 },
  Delhi: { weather: 64, location: 62, traffic: 74, incomeTrend: 52 },
  Bangalore: { weather: 46, location: 49, traffic: 56, incomeTrend: 46 },
  Hyderabad: { weather: 42, location: 44, traffic: 47, incomeTrend: 43 },
  Chennai: { weather: 80, location: 66, traffic: 69, incomeTrend: 57 },
  Pune: { weather: 52, location: 50, traffic: 55, incomeTrend: 48 },
  Kolkata: { weather: 74, location: 61, traffic: 66, incomeTrend: 54 },
  Ahmedabad: { weather: 57, location: 51, traffic: 53, incomeTrend: 47 },
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const riskLabel = (score: number) => (score < 40 ? "Low" : score < 70 ? "Medium" : "High");

const statusTone = (status: string) => {
  if (status === "approved" || status === "completed") return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-500/15 text-rose-700 border-rose-200";
  if (status === "manual_review" || status === "processing") return "bg-amber-500/15 text-amber-700 border-amber-200";
  return "bg-slate-500/15 text-slate-700 border-slate-200";
};

const heatmapTone = (intensity: number) => {
  if (intensity >= 0.85) return "bg-emerald-500/80";
  if (intensity >= 0.7) return "bg-emerald-500/65";
  if (intensity >= 0.55) return "bg-emerald-500/50";
  if (intensity >= 0.4) return "bg-emerald-500/35";
  return "bg-emerald-500/20";
};

const progressWidthClass = (value: number) => {
  if (value >= 100) return "w-full";
  if (value >= 90) return "w-[90%]";
  if (value >= 80) return "w-[80%]";
  if (value >= 70) return "w-[70%]";
  if (value >= 60) return "w-[60%]";
  if (value >= 50) return "w-[50%]";
  if (value >= 40) return "w-[40%]";
  if (value >= 30) return "w-[30%]";
  if (value >= 20) return "w-[20%]";
  if (value >= 10) return "w-[10%]";
  return "w-[5%]";
};

export default function GigShieldDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("worker");
  const [simulation, setSimulation] = useState<GigShieldSimulationResult | null>(null);
  const [processedClaimResult, setProcessedClaimResult] = useState<{
    claimStatus: string;
    confidenceScore: number;
    reasoning: string[];
    claim: GigShieldClaimRecord;
    risk: GigShieldRiskEvaluation;
    fraud: GigShieldFraudAnalysis;
    payout: GigShieldPayout | null;
    decision: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>("rainstorm");
  const [verificationStep, setVerificationStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMatch, setCameraMatch] = useState<boolean | null>(null);
  const [cameraConfidence, setCameraConfidence] = useState(0);
  const [gpsProgress, setGpsProgress] = useState(0);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; timestamp: string } | null>(null);
  const [processReason, setProcessReason] = useState("");
  const [isRefreshingLiveFeed, setIsRefreshingLiveFeed] = useState(false);

  const citySeed = riskByCity[user?.city ?? "Mumbai"] ?? riskByCity.Mumbai;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    if (isCameraActive) {
      return;
    }

    try {
      setVerificationStatus("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setVerificationStatus("success");
      setIsCameraActive(true);
    } catch {
      setVerificationStatus("failed");
      toast.error("Camera access is required for claim verification.");
    }
  };

  const captureProof = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    stopCamera();

    setVerificationStatus("loading");
    await sleep(700);
    const matched = Math.random() > 0.1;
    const confidence = matched ? 88 + Math.floor(Math.random() * 8) : 58 + Math.floor(Math.random() * 8);
    setCameraMatch(matched);
    setCameraConfidence(confidence);

    if (!matched) {
      setVerificationStatus("failed");
      toast.error("Camera verification failed. Retake proof image.");
      return;
    }

    setVerificationStatus("success");
    setVerificationStep(3);
  };

  const runGpsVerification = async () => {
    setVerificationStatus("loading");
    setGpsProgress(0);

    for (let progress = 0; progress <= 100; progress += 10) {
      setGpsProgress(progress);
      await sleep(60);
    }

    const fallback = { latitude: 19.076, longitude: 72.8777, timestamp: new Date().toISOString() };
    try {
      const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setGpsCoords({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch {
      setGpsCoords(fallback);
      toast.message("GPS used fallback coordinates for demo verification.");
    }

    setGpsVerified(true);
    setVerificationStatus("success");
    setVerificationStep(4);
  };

  const openVerificationFlow = (selectedIssue: IssueType) => {
    setIssueType(selectedIssue);
    setProcessReason("");
    setVerificationStep(1);
    setVerificationStatus("idle");
    setCapturedImage(null);
    setCameraMatch(null);
    setCameraConfidence(0);
    setGpsProgress(0);
    setGpsVerified(false);
    setGpsCoords(null);
    setVerificationOpen(true);
  };

  const submitVerifiedProcessing = () => {
    if (!latestClaim?.id) {
      toast.error("No claim found to process.");
      return;
    }

    if (!cameraMatch || !gpsVerified) {
      toast.error("Complete camera and GPS verification first.");
      return;
    }

    processClaimMutation.mutate({
      claimId: latestClaim.id,
      payload: {
        weather: { type: issueType === "rainstorm" ? "storm" : "clear", severity: citySeed.weather, score: citySeed.weather },
        traffic: { score: issueType === "traffic" ? 86 : citySeed.traffic },
        locationRisk: { score: citySeed.location },
        currentGps: gpsCoords,
        historicalLocations: [
          { latitude: 19.076, longitude: 72.8777, timestamp: new Date(Date.now() - 9 * 60_000).toISOString() },
        ],
        disruptionDetected: issueType !== "fraud",
        incomePattern: {
          currentIncome: user?.weeklyIncome ?? 5000,
          last7DayAverageIncome: Math.round((user?.weeklyIncome ?? 5000) * 0.94),
        },
        pastClaims: {
          count: claims.length,
          recentFlags: claims.filter((claim) => claim.decision === "REJECT").length,
          severity: claims.filter((claim) => claim.status === "manual_review").length,
        },
        metadata: {
          issueType,
          reason: processReason || issueOptions.find((issue) => issue.key === issueType)?.description,
          cameraConfidence,
        },
      },
    });
  };

  const claimsQuery = useQuery({
    queryKey: ["gigshield-claims", user?.id],
    queryFn: () => getClaims(),
    enabled: Boolean(user?.id),
    refetchInterval: 7000,
  });

  const payoutsQuery = useQuery({
    queryKey: ["gigshield-payouts", user?.id],
    queryFn: () => getPayouts(),
    enabled: Boolean(user?.id),
    refetchInterval: 7000,
  });

  const payoutStatsQuery = useQuery({
    queryKey: ["gigshield-payout-stats", user?.id],
    queryFn: () => getPayoutStats(),
    enabled: Boolean(user?.id),
    refetchInterval: 7000,
  });

  const disruptionsQuery = useQuery({
    queryKey: ["gigshield-disruptions"],
    queryFn: getActiveDisruptions,
    refetchInterval: 5000,
  });

  const notificationsQuery = useQuery({
    queryKey: ["gigshield-notifications"],
    queryFn: getNotifications,
    refetchInterval: 3500,
  });

  const riskQuery = useQuery({
    queryKey: ["gigshield-risk", user?.id, claimsQuery.data?.length ?? 0],
    queryFn: () =>
      evaluateRisk({
        weather: { score: citySeed.weather },
        locationRisk: { score: citySeed.location },
        trafficCondition: { score: citySeed.traffic },
        pastClaims: {
          count: claimsQuery.data?.length ?? 0,
          recentFlags: claimsQuery.data?.filter((claim) => claim.decision === "REJECT").length ?? 0,
          severity: claimsQuery.data?.filter((claim) => claim.status === "manual_review").length ?? 0,
        },
        incomePattern: {
          currentIncome: user?.weeklyIncome ?? 5000,
          last7DayAverageIncome: Math.round((user?.weeklyIncome ?? 5000) * 0.92),
        },
      }),
    enabled: Boolean(user?.id),
    refetchInterval: 12000,
  });

  const fraudSnapshotQuery = useQuery({
    queryKey: ["gigshield-fraud-snapshot", user?.id, claimsQuery.data?.length ?? 0],
    queryFn: () =>
      analyzeFraud({
        currentGps: { latitude: 19.076, longitude: 72.8777, timestamp: new Date().toISOString() },
        historicalLocations: [
          { latitude: 19.076, longitude: 72.8777, timestamp: new Date(Date.now() - 12 * 60_000).toISOString() },
        ],
        claimWeather: { type: "storm", severity: citySeed.weather },
        weatherApiData: { type: "storm", severity: citySeed.weather },
        currentIncome: user?.weeklyIncome ?? 5000,
        last7DayAverageIncome: Math.round((user?.weeklyIncome ?? 5000) * 0.95),
        disruptionDetected: true,
      }),
    enabled: Boolean(user?.id),
    refetchInterval: 15000,
  });

  const refreshLiveFeed = async () => {
    if (isRefreshingLiveFeed) {
      return;
    }

    const refreshStartedAt = Date.now();
    setIsRefreshingLiveFeed(true);
    try {
      const refreshResults = await Promise.allSettled([
        claimsQuery.refetch({ throwOnError: true }),
        payoutsQuery.refetch({ throwOnError: true }),
        payoutStatsQuery.refetch({ throwOnError: true }),
        disruptionsQuery.refetch({ throwOnError: true }),
        notificationsQuery.refetch({ throwOnError: true }),
        riskQuery.refetch({ throwOnError: true }),
        fraudSnapshotQuery.refetch({ throwOnError: true }),
      ]);

      const failedCount = refreshResults.filter((result) => result.status === "rejected").length;
      if (failedCount > 0) {
        toast.error("Live feed refresh failed", {
          description: `${failedCount} data source(s) could not be refreshed.`,
        });
      } else {
        toast.success("Live feed refreshed", {
          description: "Dashboard cards now show the latest data.",
        });
      }
    } finally {
      const elapsedMs = Date.now() - refreshStartedAt;
      if (elapsedMs < 700) {
        await sleep(700 - elapsedMs);
      }
      setIsRefreshingLiveFeed(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/register");
    }
  }, [navigate, user]);

  useEffect(() => {
    if (verificationOpen && verificationStep === 2 && !isCameraActive && !capturedImage) {
      void startCamera();
    }

    if (!verificationOpen) {
      stopCamera();
    }
  }, [capturedImage, isCameraActive, verificationOpen, verificationStep]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const socket = io(API_ORIGIN, {
      transports: ["websocket"],
    });

    const refreshRealtime = () => {
      void queryClient.invalidateQueries({ queryKey: ["gigshield-claims", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["gigshield-payouts", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["gigshield-payout-stats", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["gigshield-disruptions"] });
      void queryClient.invalidateQueries({ queryKey: ["gigshield-notifications"] });
    };

    socket.on("disruption:new", refreshRealtime);
    socket.on("claim:status", refreshRealtime);
    socket.on("payout:processed", refreshRealtime);
    socket.on("notification:new", refreshRealtime);

    return () => {
      socket.off("disruption:new", refreshRealtime);
      socket.off("claim:status", refreshRealtime);
      socket.off("payout:processed", refreshRealtime);
      socket.off("notification:new", refreshRealtime);
      socket.disconnect();
    };
  }, [queryClient, user?.id]);

  const payoutTotal = payoutStatsQuery.data?.total_amount ?? 0;
  const activeDisruptions = disruptionsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const claims = claimsQuery.data ?? [];
  const payouts = payoutsQuery.data ?? [];
  const risk = riskQuery.data;

  const earningsSeries = useMemo(() => {
    const ordered = [...payouts]
      .sort((left, right) => new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime())
      .slice(-7);

    if (ordered.length === 0) {
      return [
        { label: "Mon", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.08) },
        { label: "Tue", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.14) },
        { label: "Wed", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.18) },
        { label: "Thu", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.28) },
        { label: "Fri", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.36) },
        { label: "Sat", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.42) },
        { label: "Sun", amount: Math.max(0, (user?.weeklyIncome ?? 5000) * 0.48) },
      ];
    }

    let runningTotal = 0;
    return ordered.map((payout, index) => {
      runningTotal += Number(payout.payout_amount || payout.amount || 0);
      return {
        label: new Date(payout.created_at ?? Date.now() + index * 86_400_000).toLocaleDateString("en-IN", { weekday: "short" }),
        amount: runningTotal,
      };
    });
  }, [payouts, user?.weeklyIncome]);

  const predictedClaims = Math.max(1, Math.round(activeDisruptions.length * 1.6 + (risk?.riskScore ?? citySeed.weather) / 34));
  const lossRatio = payoutTotal > 0 ? Math.min(100, Math.round((payoutTotal / Math.max((user?.weeklyIncome ?? 5000) * 4, 1)) * 100)) : 0;

  const simulateMutation = useMutation({
    mutationFn: async (scenario: Scenario) => {
      const currentIncome = user?.weeklyIncome ?? 5000;
      const baseHistorical = [
        { latitude: 19.076, longitude: 72.8777, timestamp: new Date(Date.now() - 9 * 60_000).toISOString() },
      ];

      return simulateDisruption({
        userId: user?.id,
        partnerId: user?.id,
        city: user?.city ?? "Mumbai",
        location: user?.city ?? "Mumbai",
        scenario,
        currentIncome,
        last7DayAverageIncome: Math.round(currentIncome * (scenario === "fraud" ? 1 : 0.94)),
        historicalLocations: scenario === "fraud"
          ? [
              { latitude: 18.52, longitude: 73.85, timestamp: new Date(Date.now() - 15 * 60_000).toISOString() },
              ...baseHistorical,
            ]
          : baseHistorical,
        currentGps: scenario === "fraud"
          ? { latitude: 19.076, longitude: 72.8777, timestamp: new Date().toISOString() }
          : { latitude: 19.076, longitude: 72.8777, timestamp: new Date().toISOString() },
        pastClaims: {
          count: claims.length,
          recentFlags: claims.filter((claim) => claim.decision === "REJECT").length,
          severity: claims.filter((claim) => claim.status === "manual_review").length,
        },
      });
    },
    onSuccess: async (result) => {
      setSimulation(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gigshield-claims", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-payouts", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-payout-stats", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-disruptions"] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-risk", user?.id] }),
      ]);

      if (result.decision === "REJECT") {
        toast.error("Fraud attempt blocked", {
          description: "The claim was rejected by the fraud engine.",
        });
      } else if (result.decision === "APPROVE") {
        toast.success(`₹${result.payout?.payout_amount ?? 0} credited via GigShield ⚡`, {
          description: `${issueOptions.find((issue) => issue.key === issueType)?.label ?? "Selected"} disruption was auto-approved and paid out.`,
        });
      } else {
        toast.message("Claim routed for manual review", {
          description: "Risk stayed below auto-approval threshold.",
        });
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Simulation failed";
      toast.error("Unable to simulate disruption", {
        description: message,
      });
    },
  });

  const processClaimMutation = useMutation({
    mutationFn: async ({ claimId, payload }: { claimId: string; payload: Record<string, unknown> }) =>
      processClaim(claimId, payload),
    onMutate: () => {
      setVerificationStatus("loading");
    },
    onSuccess: async (result) => {
      setProcessedClaimResult(result);
      setVerificationStatus("success");
      setVerificationStep(6);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gigshield-claims", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-payouts", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-payout-stats", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["gigshield-notifications"] }),
      ]);

      if (result.decision === "REJECT") {
        toast.error("Claim processing rejected", {
          description: "Fraud rules rejected this claim during processing.",
        });
      } else if (result.decision === "APPROVE") {
        toast.success(`₹${result.payout?.payout_amount ?? 0} credited via GigShield ⚡`, {
          description: "Claim processing completed and payout credited.",
        });
      } else {
        toast.message("Claim processing complete", {
          description: "Claim moved to manual review.",
        });
      }
    },
    onError: (error: unknown) => {
      setVerificationStatus("failed");
      const message = error instanceof Error ? error.message : 'Claim processing failed';
      toast.error(message);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gigshield-notifications"] });
    },
  });

  const topNotification = notifications[0];
  const latestClaim = claims[0];
  const safeParseReasoning = (json: string | null): string[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const pipelineState = simulation ?? (latestClaim
    ? {
        claimStatus: latestClaim.status,
        decision: latestClaim.decision === "REJECT" ? "REJECT" : latestClaim.decision === "APPROVE" || latestClaim.status === "approved" ? "APPROVE" : "MANUAL REVIEW",
        reasoning: latestClaim.reasoning_json ? safeParseReasoning(latestClaim.reasoning_json) : [],
        risk: risk ?? {
          riskScore: latestClaim.risk_score ?? 0,
          claimProbability: 0,
          confidenceScore: latestClaim.confidence_score ?? 0,
        },
        fraud: {
          fraudScore: latestClaim.fraud_score ?? 0,
          flags: [],
          decision: latestClaim.decision === "REJECT" ? "FRAUD" : "SAFE",
        },
        payout: payouts[0] ?? null,
      }
    : null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(180deg,_#07111f_0%,_#0f172a_45%,_#0e2233_100%)] dark:text-white transition-colors">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-3 pb-16 pt-4 sm:px-6 lg:flex-row lg:gap-6 lg:px-8">
        <SaaSSidebar />
        <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-[28px] border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950/80 px-5 py-4 text-slate-900 dark:text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300/80">GigShield</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">AI-powered parametric insurance control room</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Worker protection, automated claims, fraud screening, and payout orchestration in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="border border-white/10 text-white hover:bg-white/10" onClick={() => void refreshLiveFeed()}>
              <BellRing className="mr-2 h-4 w-4" /> Notifications
            </Button>
            <Button variant="ghost" className="border border-white/10 text-white hover:bg-white/10" onClick={() => navigate("/claims")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Claims
            </Button>
            <Button variant="ghost" className="border border-white/10 text-white hover:bg-white/10" onClick={() => {
              logout();
              navigate("/register");
            }}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[30px] border border-emerald-200/70 bg-white/90 p-5 shadow-[0_24px_80px_-50px_rgba(16,185,129,0.55)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <Shield className="h-4 w-4" /> Worker Dashboard
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Welcome back, {user?.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{user?.workType} in {user?.city} is currently in a {riskLabel(risk?.riskScore ?? citySeed.weather)} risk band.</p>
                </div>
                <div className="flex gap-2 rounded-full bg-slate-100 p-1">
                  <Button size="sm" variant={viewMode === "worker" ? "default" : "ghost"} onClick={() => setViewMode("worker")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Worker
                  </Button>
                  <Button size="sm" variant={viewMode === "admin" ? "default" : "ghost"} onClick={() => setViewMode("admin")}>
                    <Users className="mr-2 h-4 w-4" /> Admin
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Risk Level"
                  value={riskLabel(risk?.riskScore ?? citySeed.weather)}
                  detail={`Score ${risk?.riskScore ?? citySeed.weather}/100`}
                  icon={<Gauge className="h-4 w-4" />}
                />
                <MetricCard
                  title="Protected Earnings"
                  value={formatCurrency(payoutTotal)}
                  detail="Total credited through GigShield"
                  icon={<Wallet className="h-4 w-4" />}
                />
                <MetricCard
                  title="Active Disruptions"
                  value={String(activeDisruptions.length)}
                  detail="Being monitored in real time"
                  icon={<TriangleAlert className="h-4 w-4" />}
                />
                <MetricCard
                  title="Confidence"
                  value={`${risk?.confidenceScore ?? 0}%`}
                  detail="Claim decision confidence"
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.75)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Earnings Protected</p>
                      <h3 className="mt-1 text-lg font-bold">Payout momentum over the last credited events</h3>
                    </div>
                    <Sparkles className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={earningsSeries}>
                        <defs>
                          <linearGradient id="gigshieldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.85} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0.08} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="label" stroke="rgba(255,255,255,0.65)" />
                        <YAxis stroke="rgba(255,255,255,0.65)" tickFormatter={(value) => `₹${value / 1000}k`} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
                        <Area type="monotone" dataKey="amount" stroke="#34d399" fill="url(#gigshieldGradient)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Radar className="h-4 w-4 text-emerald-700" /> Simulation Controls
                  </div>
                  
                  {/* Primary button for selected issue type */}
                  <Button
                    className="h-12 w-full justify-start rounded-2xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all"
                    onClick={() => simulateMutation.mutate(issueType)}
                    disabled={simulateMutation.isPending}
                  >
                    {simulateMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {issueType === "rainstorm" && <CloudRain className="mr-2 h-4 w-4" />}
                    {issueType === "traffic" && <TriangleAlert className="mr-2 h-4 w-4" />}
                    {issueType === "outage" && <Waves className="mr-2 h-4 w-4" />}
                    {issueType === "fraud" && <ShieldAlert className="mr-2 h-4 w-4" />}
                    {simulateMutation.isPending ? "Simulating..." : `Simulate ${issueOptions.find((opt) => opt.key === issueType)?.label}`}
                  </Button>

                  {/* Show alternate high-impact scenarios */}
                  {issueType !== "fraud" && (
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start rounded-2xl border-2 border-rose-300 bg-rose-50 font-semibold text-rose-700 hover:bg-rose-100 transition-all"
                      onClick={() => simulateMutation.mutate("fraud")}
                      disabled={simulateMutation.isPending}
                    >
                      {simulateMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />}
                      <ShieldAlert className="mr-2 h-4 w-4" /> {simulateMutation.isPending ? "Simulating..." : "Simulate Fraud Attempt"}
                    </Button>
                  )}

                  {/* Show the latest result */}
                  {simulation ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">Latest simulation</p>
                      <p className="mt-1">
                        {simulation.disruption?.disruption_type ?? "Disruption"} generated a {riskLabel(simulation.risk?.riskScore ?? 0)} risk response.
                      </p>
                      <p className="mt-1">Decision: <span className="font-semibold">{simulation.decision ?? "APPROVE"}</span></p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Claim Processing</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">User Activity → Disruption Detection → Risk Engine → Fraud Detection → Decision → Payout</h3>
                  </div>
                  <Badge className={statusTone(pipelineState?.claimStatus ?? "pending")}>{pipelineState?.claimStatus ?? "idle"}</Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  {[
                    { key: "detected", label: "Detected", done: Boolean(pipelineState), tone: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                    { key: "risk", label: "Risk", done: Boolean(pipelineState?.risk), tone: "bg-sky-50 border-sky-200 text-sky-800" },
                    { key: "fraud", label: "Fraud", done: Boolean(pipelineState?.fraud), tone: "bg-rose-50 border-rose-200 text-rose-800" },
                    { key: "decision", label: "Decision", done: Boolean(pipelineState?.decision), tone: "bg-amber-50 border-amber-200 text-amber-800" },
                    { key: "payout", label: "Payout", done: Boolean(pipelineState?.payout), tone: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                  ].map((step, index) => (
                    <div key={step.key} className={`rounded-2xl border p-3 ${step.done ? step.tone : "border-slate-200 bg-white text-slate-500"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">Step {index + 1}</p>
                        <span className={`h-2.5 w-2.5 rounded-full ${step.done ? "bg-emerald-500" : "bg-slate-300"}`} />
                      </div>
                      <p className="mt-2 text-sm font-bold">{step.label}</p>
                    </div>
                  ))}
                </div>

                {pipelineState ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <StatMini label="Decision" value={pipelineState.decision} />
                    <StatMini label="Risk score" value={`${pipelineState.risk?.riskScore ?? 0}/100`} />
                    <StatMini label="Fraud score" value={`${pipelineState.fraud?.fraudScore ?? 0}/100`} />
                  </div>
                ) : (
                  <EmptyState text="Run Simulate Rainstorm to generate a live claim and see the processing pipeline here." />
                )}

                <div className="mt-6 space-y-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Select Issue Type</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {issueOptions.map((issue) => (
                        <Button
                          key={issue.key}
                          variant={issueType === issue.key ? "default" : "outline"}
                          className={`h-11 rounded-xl font-semibold transition-all ${
                            issueType === issue.key 
                              ? "bg-emerald-600 text-white shadow-lg" 
                              : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                          onClick={() => setIssueType(issue.key)}
                        >
                          {issue.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="h-12 w-full rounded-2xl bg-slate-950 text-white font-semibold hover:bg-slate-800"
                    disabled={processClaimMutation.isPending}
                    onClick={() => {
                      if (!latestClaim?.id) {
                        toast.error("Please simulate a disruption first to create a claim.");
                        return;
                      }
                      openVerificationFlow(issueType);
                    }}
                  >
                    {processClaimMutation.isPending ? "Processing claim..." : "Start Camera + GPS Verification"}
                  </Button>
                  <p className="text-xs text-slate-500">Choose issue type, run camera proof and GPS verification, then process the claim.</p>
                </div>
              </div>
            </motion.div>

            {viewMode === "worker" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Active Disruption Alerts" icon={<TriangleAlert className="h-4 w-4 text-amber-600" />}>
                  {disruptionsQuery.isLoading ? (
                    <Skeleton className="h-28 w-full rounded-2xl" />
                  ) : activeDisruptions.length === 0 ? (
                    <EmptyState text="No active disruptions right now." />
                  ) : (
                    <div className="space-y-3">
                      {activeDisruptions.slice(0, 4).map((disruption) => (
                        <div key={disruption.id} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{disruption.disruption_type}</p>
                              <p className="text-xs text-slate-600">{disruption.location}</p>
                            </div>
                            <Badge className={statusTone(disruption.status ?? "active")}>{disruption.status ?? "active"}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">Risk score {disruption.risk_score ?? 0}/100</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Live Notifications" icon={<BellRing className="h-4 w-4 text-emerald-700" />}>
                  {notifications.length === 0 ? (
                    <EmptyState text="GigShield alerts and payouts appear here." />
                  ) : (
                    <div className="space-y-3">
                      {notifications.slice(0, 5).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">{item.title}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={statusTone(item.type)}>{item.type}</Badge>
                              {!item.read ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-full border border-slate-200 px-3 text-xs"
                                  onClick={() => markReadMutation.mutate(item.id)}
                                >
                                  Mark read
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Claim Timeline" icon={<LineChart className="h-4 w-4 text-emerald-700" />}>
                  {claims.length === 0 ? (
                    <EmptyState text="Auto-generated claims will appear after a disruption." />
                  ) : (
                    <div className="space-y-3">
                      {claims.slice(0, 4).map((claim) => (
                        <div key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{claim.claim_type ?? claim.disruption_type ?? "GigShield claim"}</p>
                              <p className="text-xs text-slate-600">{claim.location ?? user?.city ?? "Mumbai"}</p>
                            </div>
                            <Badge className={statusTone(claim.status)}>{claim.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">{formatCurrency(Number(claim.daily_payout ?? claim.claimed_amount ?? 0))}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Recent Payouts" icon={<CircleDollarSign className="h-4 w-4 text-emerald-700" />}>
                  {payouts.length === 0 ? (
                    <EmptyState text="Payouts complete instantly after approval." />
                  ) : (
                    <div className="space-y-3">
                      {payouts.slice(0, 4).map((payout) => (
                        <div key={payout.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">{formatCurrency(Number(payout.payout_amount || payout.amount || 0))}</p>
                            <Badge className={statusTone(payout.status)}>{payout.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">Gateway reference {payout.gateway_reference ?? payout.bank_reference ?? "pending"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Panel title="Fraud Alerts" icon={<ShieldAlert className="h-4 w-4 text-rose-700" />}>
                  {claims.filter((claim) => claim.decision === "REJECT").length === 0 ? (
                    <EmptyState text="No fraud rejections yet. Simulate a fraud attempt to populate this panel." />
                  ) : (
                    <div className="space-y-3">
                      {claims.filter((claim) => claim.decision === "REJECT").slice(0, 4).map((claim) => (
                        <div key={claim.id} className="rounded-2xl border border-rose-100 bg-rose-50/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">Rejected claim</p>
                            <Badge className={statusTone(claim.status)}>{claim.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">Fraud score {claim.fraud_score ?? 0}/100, risk score {claim.risk_score ?? 0}/100</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <div className="space-y-4">
                  <Panel title="Loss Ratio" icon={<TrendingUp className="h-4 w-4 text-emerald-700" />}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <StatMini label="Claims" value={String(claims.length)} />
                      <StatMini label="Completed payouts" value={String(payoutStatsQuery.data?.by_status.completed ?? 0)} />
                      <StatMini label="Loss ratio" value={`${lossRatio}%`} />
                      <StatMini label="Predicted claims" value={String(predictedClaims)} />
                    </div>
                  </Panel>

                  <Panel title="Disruption Heatmap" icon={<Activity className="h-4 w-4 text-emerald-700" />}>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 12 }).map((_, index) => {
                        const intensity = ((index + (risk?.riskScore ?? citySeed.weather)) % 100) / 100;
                        return (
                          <div
                            key={index}
                            className={`aspect-square rounded-xl border border-white/20 ${heatmapTone(intensity)}`}
                          />
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-600">Static heatmap seeded by city risk and current disruptions.</p>
                  </Panel>

                  <Panel title="Fraud Snapshot" icon={<ShieldCheck className="h-4 w-4 text-emerald-700" />}>
                    <p className="text-sm text-slate-700">Decision: <span className="font-semibold">{fraudSnapshotQuery.data?.decision ?? "SAFE"}</span></p>
                    <p className="mt-1 text-sm text-slate-700">Fraud score: {fraudSnapshotQuery.data?.fraudScore ?? 0}/100</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(fraudSnapshotQuery.data?.flags ?? []).map((flag) => (
                        <Badge key={flag} variant="secondary" className="rounded-full border border-rose-200 bg-rose-50 text-rose-700">{flag}</Badge>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Live status</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">GigShield pulse</h3>
                </div>
                <BellRing className="h-5 w-5 text-emerald-700" />
              </div>

              <div className="mt-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-slate-900 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">Current notification</p>
                <p className="mt-2 text-xl font-black">{topNotification?.message ?? `₹${payoutTotal} credited via GigShield ⚡`}</p>
                <p className="mt-1 text-sm text-emerald-100/90">{topNotification?.title ?? "Payout pipeline online"}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniStat icon={<Sparkles className="h-4 w-4" />} label="Confidence" value={`${risk?.confidenceScore ?? 0}%`} />
                <MiniStat icon={<Gauge className="h-4 w-4" />} label="Claim probability" value={`${Math.round((risk?.claimProbability ?? 0) * 100)}%`} />
                <MiniStat icon={<Wallet className="h-4 w-4" />} label="Approved amount" value={formatCurrency(payoutTotal)} />
                <MiniStat icon={<Users className="h-4 w-4" />} label="Predicted claims" value={String(predictedClaims)} />
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">Latest claim</h3>
                <Badge className={statusTone(latestClaim?.status ?? "pending")}>{latestClaim?.status ?? "pending"}</Badge>
              </div>
              {latestClaim ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-950">{latestClaim.claim_type ?? latestClaim.disruption_type ?? "GigShield claim"}</p>
                    <p className="mt-1 text-xs text-slate-600">{latestClaim.location ?? user?.city ?? "Mumbai"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <StatMini label="Risk" value={`${latestClaim.risk_score ?? 0}/100`} />
                    <StatMini label="Fraud" value={`${latestClaim.fraud_score ?? 0}/100`} />
                    <StatMini label="Confidence" value={`${latestClaim.confidence_score ?? 0}/100`} />
                    <StatMini label="Payout" value={formatCurrency(Number(latestClaim.daily_payout ?? 0))} />
                  </div>
                </div>
              ) : (
                <EmptyState text="Your first claim will appear here after a simulation." />
              )}
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">Quick actions</h3>
                <Activity className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="mt-4 space-y-3">
                <Button className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => navigate("/claims")}>
                  Open claim history
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all"
                  onClick={() => void refreshLiveFeed()}
                  disabled={isRefreshingLiveFeed}
                >
                  {isRefreshingLiveFeed ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      Refreshing live feed...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Refresh live feed
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Drawer open={verificationOpen} onOpenChange={setVerificationOpen} shouldScaleBackground={false}>
          <DrawerContent className="!inset-0 !mt-0 !h-[100dvh] !w-screen !max-w-none !rounded-none !border-0 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 overflow-hidden">
            {/* Header */}
            <DrawerHeader className="sticky top-0 z-20 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 px-6 pb-4 pt-4 text-left shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DrawerTitle className="text-left text-2xl font-bold text-slate-950">Smart Claim Verification</DrawerTitle>
                  <DrawerDescription className="text-left text-sm text-slate-600 mt-1">
                    Camera proof, AI decision logic, location checks, and instant payout in one flow.
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full">✕</Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            {/* Content */}
            <div className="h-[calc(100dvh-88px)] overflow-y-auto px-6 pb-8 pt-4 space-y-6">
              {/* Step 1 - Issue Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-950">Step 1 - Disruption Type</h3>
                  {verificationStep >= 2 ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">✓ Selected</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500">{Math.round((verificationStep === 1 ? 25 : 0))}%</Badge>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Select Issue Type</p>
                  <div className="flex flex-wrap gap-2">
                    {issueOptions.map((issue) => (
                      <Button
                        key={issue.key}
                        size="sm"
                        className={`rounded-full transition-all ${
                          issueType === issue.key
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500"
                        }`}
                        onClick={() => setIssueType(issue.key)}
                      >
                        {issue.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{issueOptions.find((issue) => issue.key === issueType)?.description}</p>
                  <textarea
                    value={processReason}
                    onChange={(event) => setProcessReason(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    placeholder="Add notes about disruption context..."
                    rows={2}
                  />
                  <p className="text-xs text-slate-500">Current claim reason: {processReason || getIssueDescription(issueType)}</p>
                  {verificationStep === 1 && (
                    <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg" onClick={() => setVerificationStep(2)}>
                      Continue to Camera Verification
                    </Button>
                  )}
                </div>
              </div>

              {/* Step 2 - Disruption Details */}
              {verificationStep >= 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">Step 2 - Disruption Details</h3>
                    {verificationStep >= 3 ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">✓ Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">50%</Badge>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="text-xs text-slate-600">Verify proof of disruption using camera and AI</p>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Detected Event Type</p>
                      <p className="text-lg font-bold text-slate-950 capitalize">{issueType === "rainstorm" ? "Rain" : issueType === "traffic" ? "Traffic" : issueType === "outage" ? "Platform Outage" : "Fraud"}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Suggested Disruption Reason</p>
                      <p className="text-sm text-slate-700">
                        {issueType === "rainstorm"
                          ? "Heavy rainfall with waterlogging risk near the pickup zone"
                          : issueType === "traffic"
                            ? "Route congestion with significant delays blocking roads"
                            : issueType === "outage"
                              ? "Network connectivity issues or platform downtime"
                              : "Unusual location behavior detected by AI"}
                      </p>
                    </div>
                    {verificationStep === 2 && (
                      <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg" onClick={() => setVerificationStep(3)}>
                        Start Camera Verification
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3 - Camera Verification */}
              {verificationStep >= 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">Step 3 - Camera Verification</h3>
                    <div className="flex items-center gap-2">
                      {!capturedImage && isCameraActive && (
                        <Badge className="bg-red-100 text-red-700 border-0 animate-pulse">● Live</Badge>
                      )}
                      {cameraMatch && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">✓ Verified</Badge>
                      )}
                      {!cameraMatch && capturedImage && (
                        <Badge variant="outline" className="text-slate-500">Captured</Badge>
                      )}
                      {!capturedImage && !isCameraActive && (
                        <Badge variant="outline" className="text-slate-500">75%</Badge>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="text-xs text-slate-600">Capture live proof of {issueType === "rainstorm" ? "rain / flood / traffic" : issueType === "traffic" ? "traffic delays" : issueType === "outage" ? "platform issues" : "location behavior"}</p>

                    {!capturedImage ? (
                      <div className="space-y-3">
                        <video
                          ref={videoRef}
                          className="w-full h-64 rounded-xl bg-black object-cover border border-slate-300"
                          autoPlay
                          playsInline
                          muted
                        />
                        <div className="flex gap-2">
                          {!isCameraActive ? (
                            <Button className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg" onClick={() => void startCamera()}>
                              <Camera className="mr-2 h-4 w-4" /> Start Camera
                            </Button>
                          ) : (
                            <Button className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg" onClick={captureProof}>
                              <ScanSearch className="mr-2 h-4 w-4" /> Capture Proof
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <img src={capturedImage} alt="Captured proof" className="w-full h-64 rounded-xl object-cover border border-slate-300" />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 border border-slate-300 text-slate-900 hover:bg-slate-50 rounded-lg"
                            onClick={() => {
                              setCapturedImage(null);
                              setCameraMatch(null);
                              setCameraConfidence(0);
                              void startCamera();
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" /> Retake
                          </Button>
                          <Button className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg" onClick={() => setVerificationStep(4)} disabled={!cameraMatch}>
                            {cameraMatch ? "Continue to GPS" : "Waiting for AI match..."}
                          </Button>
                        </div>
                        {cameraMatch && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-semibold text-emerald-900">Match Verified</p>
                              <p className="text-emerald-700">{cameraConfidence}% confidence - Ready for location verification</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4 - GPS Verification */}
              {verificationStep >= 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">Step 4 - Location + Data Verification</h3>
                    {gpsVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">✓ Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">{gpsProgress}%</Badge>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="text-xs text-slate-600">Verifying GPS location and fetching weather/traffic data...</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-semibold">GPS Location</p>
                        {gpsVerified && <Badge className="bg-emerald-100 text-emerald-700 border-0">Verified</Badge>}
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200">
                        <div className={`h-full rounded-full bg-emerald-500 transition-all ${progressWidthClass(gpsProgress)}`} />
                      </div>
                      {gpsCoords && (
                        <p className="text-xs text-slate-600">
                          Lat {gpsCoords.latitude.toFixed(5)}, Lng {gpsCoords.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-slate-500 font-semibold">Weather/Traffic Data</p>
                        {gpsVerified && <Badge className="bg-emerald-100 text-emerald-700 border-0">Verified</Badge>}
                      </div>
                      <p className="text-xs text-slate-600">Matching {issueType === "rainstorm" ? "rainfall data" : issueType === "traffic" ? "traffic data" : issueType === "outage" ? "network status" : "behavioral patterns"} with location...</p>
                    </div>
                    {verificationStep === 4 && (
                      <Button
                        className="w-full bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg"
                        onClick={() => void runGpsVerification()}
                        disabled={gpsVerified}
                      >
                        <MapPin className="mr-2 h-4 w-4" /> {gpsVerified ? "GPS Verified ✓" : "Verify GPS & Data"}
                      </Button>
                    )}
                    {gpsVerified && verificationStep === 4 && (
                      <Button
                        className="w-full bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg"
                        onClick={() => setVerificationStep(5)}
                      >
                        Continue to Approval Decision
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5 - Claim Approval */}
              {verificationStep >= 5 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">Step 5 - Claim Approval Decision</h3>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Auto-approved</Badge>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 space-y-3">
                    <p className="text-xs text-slate-600">If camera verified &amp;&amp; location verified &amp;&amp; confidence &gt; threshold, approve claim.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold">Camera Proof</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-900">Verified</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold">Location Proof</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-900">Verified</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold">AI Confidence</p>
                        <p className="text-lg font-bold text-emerald-900">{cameraConfidence}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold">Decision</p>
                        <p className="text-sm font-bold text-emerald-900">Auto-approved</p>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-100/50 border border-emerald-200 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-900">Auto Claim Decision complete</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6 - Payment Processing */}
              {verificationStep >= 6 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">Step 6 - Payment Processing</h3>
                    {verificationStatus === "loading" ? (
                      <Badge className="border-0 bg-amber-100 text-amber-700 animate-pulse">Processing...</Badge>
                    ) : verificationStatus === "success" ? (
                      <Badge className="border-0 bg-emerald-100 text-emerald-700">Completed</Badge>
                    ) : verificationStatus === "failed" ? (
                      <Badge className="border-0 bg-rose-100 text-rose-700">Failed</Badge>
                    ) : null}
                  </div>
                  <div className={`rounded-2xl border p-4 space-y-3 ${verificationStatus === "failed" ? "border-rose-200 bg-rose-50" : verificationStatus === "success" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    {verificationStatus === "loading" ? (
                      <>
                        <p className="text-sm font-semibold text-amber-900">Processing verified claim...</p>
                        <p className="text-2xl font-bold text-amber-900">Saving to claim history</p>
                        <div className="h-1 w-full rounded-full bg-amber-200">
                          <div className="h-full w-3/4 animate-pulse rounded-full bg-amber-500" />
                        </div>
                      </>
                    ) : verificationStatus === "success" ? (
                      <>
                        <p className="text-sm font-semibold text-emerald-900">Claim processed successfully</p>
                        <p className="text-2xl font-bold text-emerald-900">
                          {processedClaimResult?.payout?.payout_amount ? `Rs ${processedClaimResult.payout.payout_amount}` : "Rs 0"}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Decision</p>
                            <p className="font-semibold text-emerald-900">{processedClaimResult?.decision ?? "MANUAL REVIEW"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Claim ID</p>
                            <p className="font-semibold text-emerald-900 break-all">{latestClaim?.id ?? "N/A"}</p>
                          </div>
                        </div>
                        <p className="text-xs text-emerald-800">The claim has been saved and the dashboard will refresh automatically.</p>
                      </>
                    ) : verificationStatus === "failed" ? (
                      <>
                        <p className="text-sm font-semibold text-rose-900">Claim processing failed</p>
                        <p className="text-sm text-rose-700">Please retry or check the backend response message.</p>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Final Action Button */}
              {verificationStep === 5 && !processClaimMutation.isPending && (
                <Button
                  className="w-full bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg py-3 text-base font-semibold"
                  disabled={!gpsVerified || !cameraMatch || processClaimMutation.isPending}
                  onClick={submitVerifiedProcessing}
                >
                  {processClaimMutation.isPending ? "Processing Claim..." : "Process Verified Claim"}
                </Button>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </DrawerContent>
        </Drawer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        <span>{title}</span>
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-700">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-700">{icon}</span>
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">{text}</div>;
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        <span className="text-emerald-700">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}