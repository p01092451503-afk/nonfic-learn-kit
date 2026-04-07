import { useState } from "react";
import {
  Users, BookOpen, TrendingUp, Activity, ArrowRight, Shield,
  BarChart3, UserPlus, AlertTriangle, GraduationCap, Clock, Building2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AdminDashboard = () => {
  const { profile } = useUser();
  const { t, i18n } = useTranslation();
  const displayName = profile?.full_name || t("roles.adminLabel");
  const [branchFilter, setBranchFilter] = useState<string>("all");

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
      const { data, error } = await supabase.from("courses").select("id, title, status, instructor_id, is_mandatory, deadline").order("created_at", { ascending: false });
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

  const { data: branches = [] } = useQuery({
    queryKey: ["admin-dash-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name, name_en").eq("is_active", true).order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-dash-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, department_id, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roleCounts = { student: 0, teacher: 0, admin: 0 } } = useQuery({
    queryKey: ["admin-dash-role-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      const counts = { student: 0, teacher: 0, admin: 0 };
      data?.forEach((r: any) => { if (counts[r.role as keyof typeof counts] !== undefined) counts[r.role as keyof typeof counts]++; });
      return counts;
    },
  });

  // Filter profiles by branch
  const branchUserIds = branchFilter === "all"
    ? null
    : new Set(allProfiles.filter((p: any) => p.department_id === branchFilter).map((p: any) => p.user_id));

  const filteredEnrollments = branchUserIds
    ? enrollments.filter((e: any) => branchUserIds.has(e.user_id))
    : enrollments;

  const recentProfiles = (branchFilter === "all"
    ? allProfiles
    : allProfiles.filter((p: any) => p.department_id === branchFilter)
  ).slice(0, 5);

  const filteredProfileCount = branchFilter === "all" ? profileCount : (branchUserIds?.size || 0);


  const activeCourses = courses.filter((c: any) => c.status === "published").length;
  const draftCourses = courses.filter((c: any) => c.status === "draft").length;
  const pendingCourses = courses.filter((c: any) => c.status !== "published" && c.status !== "draft").length;
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

  // Alerts
  const mandatoryCourses = courses.filter((c: any) => c.is_mandatory && c.status === "published");
  const overdueMandatory = mandatoryCourses.filter((c: any) => c.deadline && new Date(c.deadline) < new Date());

  const stats = [
    { label: t("admin.totalUsers"), value: String(profileCount), sub: t("admin.studentCount2", { count: roleCounts.student }), icon: Users },
    { label: t("admin.activeCourses"), value: String(activeCourses), sub: t("admin.draftCount", { count: draftCourses }), icon: BookOpen },
    { label: t("admin.totalEnrollments"), value: String(enrollments.length), sub: t("admin.enrolledLabel"), icon: Activity },
    { label: t("admin.pendingReview"), value: String(pendingCourses), sub: t("admin.reviewNeeded"), icon: Clock },
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              {t("admin.adminDashboard")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.platformOverview")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card !p-4 sm:!p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{stat.label}</span>
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 ml-1" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</span>
              <p className="text-[10px] sm:text-xs text-primary mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Middle Row: User Stats + Course Status + Summary */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("admin.userStats")}</h3>
            <div className="space-y-3">
              {[
                { label: t("roles.studentLabel"), count: roleCounts.student },
                { label: t("roles.teacherLabel"), count: roleCounts.teacher },
                { label: t("roles.adminLabel"), count: roleCounts.admin },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("admin.courseOverview")}</h3>
            <div className="space-y-3">
              {[
                { label: t("admin.activeCoursesLabel"), count: activeCourses },
                { label: t("admin.pendingReview"), count: pendingCourses },
                { label: t("admin.archivedLabel"), count: draftCourses },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("admin.overallSummary")}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("admin.avgCompletionRate")}</span>
                <span className="text-sm font-semibold text-foreground">{avgCompletion}%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("admin.totalUsers")}</span>
                <span className="text-sm font-semibold text-foreground">{profileCount}{t("common.people")}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t("admin.totalEnrollments")}</span>
                <span className="text-sm font-semibold text-foreground">{enrollments.length}{t("common.cases")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Recent Signups + Alerts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("admin.recentSignups")}</h2>
              <Link to="/admin/users">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{t("admin.recentSignupsDesc")}</p>
            {recentProfiles.length === 0 ? (
              <div className="stat-card text-center py-6">
                <p className="text-sm text-muted-foreground">{t("admin.noRecentSignups")}</p>
              </div>
            ) : (
              <div className="stat-card !p-0 divide-y divide-border">
                {recentProfiles.map((rp: any) => (
                  <div key={rp.user_id} className="p-4 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{t("admin.newSignup")}: {rp.full_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{rp.created_at ? formatDate(rp.created_at) : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("admin.alertsTitle")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{t("admin.alertsDesc")}</p>
            <div className="stat-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("admin.recentCoursesAlert")}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeCourses > 0 ? t("admin.coursesRegistered", { count: activeCourses }) : t("admin.noCoursesRegistered")}
                  </p>
                </div>
                <Link to="/admin/courses">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs">{t("nav.courseManagement")}</Button>
                </Link>
              </div>
              {overdueMandatory.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-sm font-medium text-destructive">{t("admin.overdueMandatory")}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.overdueMandatoryDesc", { count: overdueMandatory.length })}</p>
                  </div>
                  <Link to="/admin/learning">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs">{t("admin.learningManagement")}</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
