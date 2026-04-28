import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import Sparkline from "@/components/ui/sparkline";
import { useDashboardSparklines } from "@/hooks/useDashboardSparklines";

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

  const { data: spark } = useDashboardSparklines(7);
  const enroll7 = spark?.enrollments ?? [];
  const compl7 = spark?.completions ?? [];
  const subm7 = spark?.submissions ?? [];
  const assess7 = spark?.assessments ?? [];

  const items = [
    { label: t("stats.newEnroll"), value: stats.todayEnrollments, color: "text-primary",     chart: "hsl(var(--primary))",     trend: enroll7 },
    { label: t("stats.completionToday"), value: stats.todayCompletions, color: "text-chart-2", chart: "hsl(var(--chart-2))",   trend: compl7 },
    { label: t("stats.submissionToday"), value: stats.todaySubmissions, color: "text-chart-3", chart: "hsl(var(--chart-3))",   trend: subm7 },
    { label: t("stats.assessmentToday"), value: stats.todayAssessments, color: "text-chart-4", chart: "hsl(var(--chart-4))",   trend: assess7 },
    { label: t("stats.pendingGrade"), value: stats.pendingSubmissions, color: "text-destructive", chart: "hsl(var(--destructive))", trend: [] as number[] },
    { label: t("stats.unreadNotif"), value: stats.unreadNotifications, color: "text-chart-5", chart: "hsl(var(--chart-5))", trend: [] as number[] },
  ];

  return (
    <div className="stat-card !p-4 sm:!p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t("stats.todayOps")}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {items.map((item) => (
          <div key={item.label} className="p-2.5 rounded-lg border border-border min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
            <p className={`text-xl font-bold mt-0.5 tabular-nums ${item.color}`}>{item.value}</p>
            {item.trend.length > 1 && (
              <div className="mt-1 h-5">
                <Sparkline data={item.trend} color={item.chart} height={20} showLastDot={false} strokeWidth={1.25} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodayOperationsCard;
