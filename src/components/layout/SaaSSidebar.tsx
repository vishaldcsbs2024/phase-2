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
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 p-4 text-slate-900 dark:text-white shadow-[0_4px_12px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] backdrop-blur lg:flex transition-colors">
      <div className="mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
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
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-100">
        Live engine active: disruptions, claims, payouts, and notifications stream in real time.
      </div>
    </aside>
  );
}
