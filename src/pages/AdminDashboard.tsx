import { useState } from "react";
import {
  Users, BookOpen, TrendingUp, Activity, ArrowRight, Shield,
  BarChart3, UserPlus, AlertTriangle, GraduationCap, Clock, Building2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AdminDashboard = () => {
  const { profile } = useUser();
  const { t, i18n } = useTranslation();
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
      const { data, error } = await supabase.from("enrollments").select("course_id, user_id, progress, completed_at");
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
  const avgCompletion = filteredEnrollments.length > 0
    ? Math.round(filteredEnrollments.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / filteredEnrollments.length)
    : 0;

  const mandatoryCourses = courses.filter((c: any) => c.is_mandatory && c.status === "published");
  const overdueMandatory = mandatoryCourses.filter((c: any) => c.deadline && new Date(c.deadline) < new Date());

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return i18n.language?.startsWith("en")
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              {t("admin.adminDashboard")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.platformOverview")}</p>
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder={t("branches.allBranches")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("branches.allBranches")}</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{i18n.language?.startsWith("en") ? b.name_en || b.name : b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Main KPIs - larger */}
          <div className="stat-card !p-3.5 col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{t("admin.totalUsers")}</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{filteredProfileCount}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t("roles.studentLabel")} {roleCounts.student} · {t("roles.teacherLabel")} {roleCounts.teacher} · {t("roles.adminLabel")} {roleCounts.admin}
            </p>
          </div>

          <div className="stat-card !p-3.5 col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{t("admin.activeCourses")}</span>
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{activeCourses}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t("admin.pendingReview")} {pendingCourses} · {t("admin.archivedLabel")} {draftCourses}
            </p>
          </div>

          <div className="stat-card !p-3.5 col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{t("admin.totalEnrollments")}</span>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{filteredEnrollments.length}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("admin.enrolledLabel")}</p>
          </div>

          <div className="stat-card !p-3.5 col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{t("admin.avgCompletionRate")}</span>
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{avgCompletion}%</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("admin.totalEnrollments")} {filteredEnrollments.length}{t("common.cases")}</p>
          </div>

          <div className="stat-card !p-3.5 col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{t("admin.pendingReview")}</span>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{pendingCourses}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("admin.reviewNeeded")}</p>
          </div>

          <div className="stat-card !p-3.5 col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{t("admin.alertsTitle")}</span>
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{overdueMandatory.length}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("admin.overdueMandatory")}</p>
          </div>
        </div>

        {/* Bottom: Recent Signups + Quick Links */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Signups - compact */}
          <div className="stat-card !p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">{t("admin.recentSignups")}</h3>
              <Link to="/admin/users">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {recentProfiles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("admin.noRecentSignups")}</p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {recentProfiles.map((rp: any) => (
                  <div key={rp.user_id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{rp.full_name || "-"}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{rp.created_at ? formatDate(rp.created_at) : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="stat-card !p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("admin.alertsTitle")}</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{t("admin.recentCoursesAlert")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {activeCourses > 0 ? t("admin.coursesRegistered", { count: activeCourses }) : t("admin.noCoursesRegistered")}
                  </p>
                </div>
                <Link to="/admin/courses">
                  <Button size="sm" variant="outline" className="rounded-xl text-[10px] h-7 px-2.5">{t("nav.courseManagement")}</Button>
                </Link>
              </div>
              {overdueMandatory.length > 0 && (
                <div className="flex items-center justify-between pt-2.5 border-t border-border">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-destructive">{t("admin.overdueMandatory")}</p>
                    <p className="text-[10px] text-muted-foreground">{t("admin.overdueMandatoryDesc", { count: overdueMandatory.length })}</p>
                  </div>
                  <Link to="/admin/learning">
                    <Button size="sm" variant="outline" className="rounded-xl text-[10px] h-7 px-2.5">{t("admin.learningManagement")}</Button>
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
