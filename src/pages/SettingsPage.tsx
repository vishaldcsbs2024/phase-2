import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BellRing, MoonStar, Save, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    username: user?.name ?? "",
    email: `${(user?.name ?? "user").toLowerCase().replace(/\s+/g, ".")}@gigshield.app`,
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("gigshield-dark-mode") === "true");
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem("gigshield-email-alerts") !== "false");
  const [pushAlerts, setPushAlerts] = useState(() => localStorage.getItem("gigshield-push-alerts") !== "false");

  const initials = useMemo(() => (user?.name ?? "GS").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [user?.name]);

  useEffect(() => {
    localStorage.setItem("gigshield-dark-mode", String(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("gigshield-email-alerts", String(emailAlerts));
  }, [emailAlerts]);

  useEffect(() => {
    localStorage.setItem("gigshield-push-alerts", String(pushAlerts));
  }, [pushAlerts]);

  const handleSave = () => {
    toast.success("Settings saved", {
      description: "Your profile preferences have been updated locally.",
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">{initials}</div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Profile</p>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">{user?.name ?? "GigShield member"}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user?.city ?? "Chennai"} • {user?.workType ?? "Delivery"}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between"><span>Plan</span><span className="font-semibold">Premium Worker</span></div>
              <div className="flex items-center justify-between"><span>Risk profile</span><span className="font-semibold">Adaptive</span></div>
              <div className="flex items-center justify-between"><span>Notification mode</span><span className="font-semibold">Realtime</span></div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 shadow-md">
            <div className="mb-4 flex items-center gap-2 text-slate-950 dark:text-white">
              <UserCog className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-black">Account settings</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Username">
                <input title="Username" placeholder="Update username" value={profile.username} onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 outline-none focus:border-emerald-400 dark:text-white" />
              </Field>
              <Field label="Email">
                <input title="Email" placeholder="Update email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 outline-none focus:border-emerald-400 dark:text-white" />
              </Field>
            </div>
            <div className="mt-6 flex justify-end">
              <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Save changes
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ToggleCard
            icon={<MoonStar className="h-5 w-5 text-emerald-700" />}
            title="Dark mode"
            description="Toggle a darker dashboard theme for lower-light sessions."
            enabled={darkMode}
            onToggle={() => {
              setDarkMode((value) => !value);
              toast.message(darkMode ? "Light mode enabled" : "Dark mode enabled");
            }}
          />
          <ToggleCard
            icon={<BellRing className="h-5 w-5 text-emerald-700" />}
            title="Notification preferences"
            description="Receive claim, payout, and disruption alerts in realtime."
            enabled={emailAlerts && pushAlerts}
            onToggle={() => {
              setEmailAlerts((value) => !value);
              setPushAlerts((value) => !value);
              toast.message(emailAlerts && pushAlerts ? "Notifications disabled" : "Notifications enabled");
            }}
          />
        </section>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({ icon, title, description, enabled, onToggle }: { icon: ReactNode; title: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative h-7 w-14 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
          aria-label={title}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-8" : "left-1"}`} />
        </button>
      </div>
    </div>
  );
}
