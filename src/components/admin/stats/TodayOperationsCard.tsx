import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay } from "date-fns";

const TodayOperationsCard = () => {
  const today = startOfDay(new Date()).toISOString();

  const { data: todayEnrollments = 0 } = useQuery({
    queryKey: ["stat-today-enrollments"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .gte("enrolled_at", today);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayCompletions = 0 } = useQuery({
    queryKey: ["stat-today-completions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .gte("completed_at", today);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todaySubmissions = 0 } = useQuery({
    queryKey: ["stat-today-submissions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .gte("submitted_at", today);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayAssessments = 0 } = useQuery({
    queryKey: ["stat-today-assessments"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assessment_attempts")
        .select("*", { count: "exact", head: true })
        .gte("started_at", today);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingSubmissions = 0 } = useQuery({
    queryKey: ["stat-pending-submissions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "submitted");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ["stat-unread-notifications"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
  });

  const items = [
    { label: "신규 수강", value: todayEnrollments, color: "text-primary" },
    { label: "이수 완료", value: todayCompletions, color: "text-chart-2" },
    { label: "과제 제출", value: todaySubmissions, color: "text-chart-3" },
    { label: "평가 응시", value: todayAssessments, color: "text-chart-4" },
    { label: "채점 대기", value: pendingSubmissions, color: "text-destructive" },
    { label: "미확인 알림", value: unreadNotifications, color: "text-chart-5" },
  ];

  return (
    <div className="stat-card !p-4 sm:!p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">오늘 운영 현황</h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center p-2 rounded-lg border border-border">
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodayOperationsCard;
