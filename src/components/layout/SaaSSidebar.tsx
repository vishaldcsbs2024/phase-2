import { NavLink } from "react-router-dom";
import { BarChart3, LayoutDashboard, BellRing, ScrollText, Settings } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/claims", label: "Claims", icon: ScrollText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: BellRing },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function SaaSSidebar() {
  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-64 lg:self-start">
      <div className="mb-4 rounded-[20px] border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-white lg:hidden">
        <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300/80">GigShield</p>
        <h2 className="mt-1 text-base font-black tracking-tight">Control Center</h2>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "border-emerald-300 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                      : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                  }`
                }
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="hidden h-[calc(100vh-2rem)] w-64 flex-col rounded-[24px] border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_4px_12px_-5px_rgba(0,0,0,0.1)] backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] lg:flex">
        <div className="mb-6 border-b border-slate-200 pb-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-[0.34em] text-emerald-600 dark:text-emerald-300/80">GigShield</p>
          <h2 className="mt-2 text-xl font-black tracking-tight">Control Center</h2>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-100">
          Live engine active: disruptions, claims, payouts, and notifications stream in real time.
        </div>
      </div>
    </aside>
  );
}
