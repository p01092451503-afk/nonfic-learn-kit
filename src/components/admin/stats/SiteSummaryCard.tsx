import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Globe, Monitor } from "lucide-react";
import { format, startOfMonth, startOfDay } from "date-fns";

const SiteSummaryCard = () => {
  const today = startOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: todayVisitors = 0 } = useQuery({
    queryKey: ["stat-today-visitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("user_id")
        .gte("login_at", today);
      if (error) throw error;
      return new Set(data.map((s) => s.user_id)).size;
    },
  });

  const { data: monthNewMembers = 0 } = useQuery({
    queryKey: ["stat-month-new-members"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalMembers = 0 } = useQuery({
    queryKey: ["stat-total-members"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayPageViews = 0 } = useQuery({
    queryKey: ["stat-today-pageviews"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("traffic_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .gte("created_at", today);
      if (error) throw error;
      return count || 0;
    },
  });

  const items = [
    { label: "오늘 방문자 수", value: `${todayVisitors.toLocaleString()}명`, icon: Globe, color: "text-primary" },
    { label: "이번 달 신규 가입", value: `${monthNewMembers.toLocaleString()}명`, icon: UserPlus, color: "text-chart-2" },
    { label: "전체 회원 수", value: `${totalMembers.toLocaleString()}명`, icon: Users, color: "text-chart-3" },
    { label: "오늘 페이지뷰", value: `${todayPageViews.toLocaleString()}건`, icon: Monitor, color: "text-chart-4" },
  ];

  return (
    <div className="stat-card !p-4 sm:!p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">사이트 요약</h3>
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
