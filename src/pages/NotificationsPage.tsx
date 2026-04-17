import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { CheckCircle2, BellRing, Loader2, AlertTriangle } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearNotifications, getNotifications, markNotificationRead } from "@/services/gigshieldApi";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["gigshield-notifications-page"],
    queryFn: () => getNotifications(),
    refetchInterval: 6000,
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const socket = io("http://localhost:3001", { transports: ["websocket"] });
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["gigshield-notifications-page"] });

    socket.on("notification:new", refresh);
    socket.on("claim:status", refresh);
    socket.on("payout:processed", refresh);

    return () => {
      socket.off("notification:new", refresh);
      socket.off("claim:status", refresh);
      socket.off("payout:processed", refresh);
      socket.disconnect();
    };
  }, [queryClient]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Notifications</p>
              <h1 className="text-2xl font-black text-slate-950 dark:text-white">Live alert center</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Claim updates, payout events, and disruption alerts in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">{unreadCount} unread</Badge>
              <Button
                variant="outline"
                className="rounded-2xl dark:border-slate-700 dark:text-white dark:hover:bg-slate-900"
                onClick={async () => {
                  await clearNotifications();
                  await notificationsQuery.refetch();
                }}
              >
                Mark all read
              </Button>
            </div>
          </div>
        </section>

        {notificationsQuery.isLoading ? (
          <div className="flex justify-center rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-10 shadow-md"><Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" /></div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-8 text-center shadow-md">
            <BellRing className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-3 text-lg font-bold text-slate-950 dark:text-white">No notifications yet</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Triggered claim approvals and payout alerts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className={`rounded-[24px] border bg-white dark:bg-slate-900/50 p-5 shadow-md transition hover:shadow-lg ${notification.read ? "border-slate-200 dark:border-slate-700" : "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 rounded-full p-2 ${notification.type === "warning" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {notification.type === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950 dark:text-white">{notification.title}</h3>
                        {!notification.read ? <Badge className="rounded-full bg-emerald-500 text-white">New</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{new Date(notification.timestamp).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  {!notification.read ? (
                    <Button
                      variant="ghost"
                      className="rounded-full border border-slate-200 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
                      onClick={async () => {
                        await markNotificationRead(notification.id);
                        await notificationsQuery.refetch();
                      }}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
