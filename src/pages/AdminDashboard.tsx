import {
  Users, BookOpen, TrendingUp, Activity, ArrowRight, Shield,
  BarChart3, UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AdminDashboard = () => {
  const { profile } = useUser();
  const { t, i18n } = useTranslation();
  const displayName = profile?.full_name || t("roles.adminLabel");

  const { data: profileCount = 0 } = useQuery({
    queryKey: ["admin-dash-profile-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-dash-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, status, instructor_id").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-dash-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("course_id, progress, completed_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: recentProfiles = [] } = useQuery({
    queryKey: ["admin-dash-recent-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, department, created_at").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const activeCourses = courses.filter((c: any) => c.status === "published").length;
  const avgCompletion = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (Number(e.progress) || 0), 0) / enrollments.length)
    : 0;

  const enrollmentCountMap = new Map<string, { count: number; avgProgress: number }>();
  const grouped: Record<string, { total: number; progress: number }> = {};
  enrollments.forEach((e) => {
    if (!grouped[e.course_id]) grouped[e.course_id] = { total: 0, progress: 0 };
    grouped[e.course_id].total++;
    grouped[e.course_id].progress += Number(e.progress) || 0;
  });
  Object.entries(grouped).forEach(([id, v]) => {
    enrollmentCountMap.set(id, { count: v.total, avgProgress: Math.round(v.progress / v.total) });
  });

  const topCourses = courses
    .filter((c: any) => c.status === "published")
    .map((c: any) => ({ ...c, enrollment: enrollmentCountMap.get(c.id) }))
    .sort((a: any, b: any) => (b.enrollment?.count || 0) - (a.enrollment?.count || 0))
    .slice(0, 4);

  const stats = [
    { label: t("admin.totalUsers"), value: String(profileCount), sub: t("common.people"), icon: Users },
    { label: t("admin.activeCourses"), value: String(activeCourses), sub: t("common.count"), icon: BookOpen },
    { label: t("admin.avgCompletionRate"), value: String(avgCompletion), sub: t("common.percent"), icon: TrendingUp },
    { label: t("admin.totalEnrollments"), value: String(enrollments.length), sub: t("common.cases"), icon: Activity },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return i18n.language?.startsWith("en")
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : d.toLocaleDateString("ko-KR");
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("admin.adminDashboard")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.checkSystem", { name: displayName })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.sub}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("admin.courseStatus")}</h2>
              <Link to="/admin/courses">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            {topCourses.length === 0 ? (
              <div className="stat-card text-center py-8">
                <p className="text-sm text-muted-foreground">{t("admin.noCourses")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCourses.map((course: any) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <div className="stat-card flex items-center gap-4 !p-4 cursor-pointer group">
                      <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <BarChart3 className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                        {course.enrollment && (
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={course.enrollment.avgProgress} className="flex-1 h-1.5" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{course.enrollment.avgProgress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">{course.enrollment?.count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">{t("admin.enrolledStudents")}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("admin.recentSignups")}</h2>
              <Link to="/admin/users">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {recentProfiles.length === 0 ? (
              <div className="stat-card text-center py-6">
                <p className="text-sm text-muted-foreground">{t("admin.noRecentSignups")}</p>
              </div>
            ) : (
              <div className="stat-card !p-0 divide-y divide-border">
                {recentProfiles.map((rp: any) => (
                  <div key={rp.user_id} className="p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                      {(rp.full_name || "?").slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rp.full_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{rp.department || "-"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {rp.created_at ? formatDate(rp.created_at) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;