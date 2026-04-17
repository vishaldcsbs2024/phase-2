import { LogOut, MoonStar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function DashboardTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/90 dark:text-white">
      <div className="hidden w-full md:block" />
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" className="rounded-full border border-slate-200 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700" onClick={() => navigate('/settings')}>
          <MoonStar className="mr-2 h-4 w-4" /> Settings
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Signed in</p>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{user?.name ?? 'GigShield user'}</p>
        </div>
        <Button variant="ghost" className="rounded-full border border-slate-200 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700" onClick={() => { logout(); navigate('/register'); }}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}
