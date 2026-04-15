import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";

const TodayOperationsCard = () => {
  const { t } = useTranslation();
  const today = startOfDay(new Date()).toISOString();

  const { data } = useQuery({
    queryKey: ["stat-today-operations", today],
    queryFn: async () => {
      const [enrollRes, complRes, subRes, assessRes, pendingRes, unreadRes] = await Promise.all([
        supabase.from("enrollments").select("*", { count: "exact", head: true }).gte("enrolled_at", today),
        supabase.from("enrollments").select("*", { count: "exact", head: true }).gte("completed_at", today),
        supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).gte("submitted_at", today),
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).gte("started_at", today),
        supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false),
      ]);
      return {
        todayEnrollments: enrollRes.count || 0,
        todayCompletions: complRes.count || 0,
        todaySubmissions: subRes.count || 0,
        todayAssessments: assessRes.count || 0,
        pendingSubmissions: pendingRes.count || 0,
        unreadNotifications: unreadRes.count || 0,
      };
    },
    staleTime: 3 * 60 * 1000,
  });

  const stats = data || {
    todayEnrollments: 0, todayCompletions: 0, todaySubmissions: 0,
    todayAssessments: 0, pendingSubmissions: 0, unreadNotifications: 0,
  };

  const items = [
    { label: t("stats.newEnroll"), value: stats.todayEnrollments, color: "text-primary" },
    { label: t("stats.completionToday"), value: stats.todayCompletions, color: "text-chart-2" },
    { label: t("stats.submissionToday"), value: stats.todaySubmissions, color: "text-chart-3" },
    { label: t("stats.assessmentToday"), value: stats.todayAssessments, color: "text-chart-4" },
    { label: t("stats.pendingGrade"), value: stats.pendingSubmissions, color: "text-destructive" },
    { label: t("stats.unreadNotif"), value: stats.unreadNotifications, color: "text-chart-5" },
  ];

  return (
    <div className="stat-card !p-4 sm:!p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t("stats.todayOps")}</h3>
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
