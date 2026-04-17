import type { ReactNode } from "react";
import SaaSSidebar from "./SaaSSidebar";
import DashboardTopbar from "./DashboardTopbar";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(180deg,_#0f172a_0%,_#1a1f3a_100%)] dark:text-white transition-colors">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <SaaSSidebar />
        <main className="min-w-0 flex-1">
          <DashboardTopbar />
          {children}
        </main>
      </div>
    </div>
  );
}
