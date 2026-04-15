import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";

const RealtimeUsersCard = () => {
  const { t } = useTranslation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: onlineCount = 0, refetch } = useQuery({
    queryKey: ["realtime-online-users"],
    queryFn: async () => {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .is("logout_at", null)
        .gte("login_at", fifteenMinAgo);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 20_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("online-users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_sessions" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => refetch(), 3000);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return (
    <div className="stat-card !p-4 sm:!p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Wifi className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{t("stats.realtimeUsers", "현재 동시접속자")}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xl font-bold text-foreground">{onlineCount.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">{t("common.people")}</span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-2 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-chart-2"></span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{t("stats.autoRefresh", "실시간 자동 갱신")}</p>
      </div>
    </div>
  );
};

export default RealtimeUsersCard;
