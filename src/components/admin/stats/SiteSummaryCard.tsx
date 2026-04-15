import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Globe, Monitor } from "lucide-react";
import { startOfMonth, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";

const SiteSummaryCard = () => {
  const { t } = useTranslation();
  const today = startOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  const { data } = useQuery({
    queryKey: ["stat-site-summary", today, monthStart],
    queryFn: async () => {
      const [sessionsRes, monthMembersRes, totalMembersRes, pageViewsRes] = await Promise.all([
        supabase.from("user_sessions").select("user_id").gte("login_at", today),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("traffic_logs").select("*", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", today),
      ]);
      return {
        todayVisitors: sessionsRes.data ? new Set(sessionsRes.data.map((s) => s.user_id)).size : 0,
        monthNewMembers: monthMembersRes.count || 0,
        totalMembers: totalMembersRes.count || 0,
        todayPageViews: pageViewsRes.count || 0,
      };
    },
    staleTime: 3 * 60 * 1000,
  });

  const stats = data || { todayVisitors: 0, monthNewMembers: 0, totalMembers: 0, todayPageViews: 0 };

  const items = [
    { label: t("stats.todayVisitors"), value: `${stats.todayVisitors.toLocaleString()}${t("common.people")}`, icon: Globe, color: "text-primary" },
    { label: t("stats.monthNewSignups"), value: `${stats.monthNewMembers.toLocaleString()}${t("common.people")}`, icon: UserPlus, color: "text-chart-2" },
    { label: t("stats.totalMembers"), value: `${stats.totalMembers.toLocaleString()}${t("common.people")}`, icon: Users, color: "text-chart-3" },
    { label: t("stats.todayPageViews"), value: `${stats.todayPageViews.toLocaleString()}${t("common.cases")}`, icon: Monitor, color: "text-chart-4" },
  ];

  return (
    <div className="stat-card !p-4 sm:!p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t("stats.siteSummary")}</h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              {item.label}
            </div>
            <span className="text-sm font-bold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SiteSummaryCard;
