import { useState, useMemo } from "react";
import {
  Users, BookOpen, Activity, BarChart3, Building2, GraduationCap, Clock, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--destructive))",
];
const PIE_COLORS = ["#3b82f6", "#64748b", "#f59e0b"];

const AdminDashboard = () => {
  const { profile } = useUser();
  const { t, i18n } = useTranslation();
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // ── Data Queries ──
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
      const { data, error } = await supabase.from("enrollments").select("course_id, user_id, progress, completed_at, enrolled_at");
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

  // ── Derived Data ──
  const branchUserIds = branchFilter === "all"
    ? null
    : new Set(allProfiles.filter((p: any) => p.department_id === branchFilter).map((p: any) => p.user_id));

  const filteredEnrollments = branchUserIds
    ? enrollments.filter((e: any) => branchUserIds.has(e.user_id))
    : enrollments;

  const filteredProfileCount = branchFilter === "all" ? profileCount : (branchUserIds?.size || 0);
  const activeCourses = courses.filter((c: any) => c.status === "published").length;
  const completedEnrollments = filteredEnrollments.filter((e: any) => e.completed_at).length;
  const avgCompletion = filteredEnrollments.length > 0
    ? Math.round(filteredEnrollments.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / filteredEnrollments.length)
    : 0;

  const mandatoryCourses = courses.filter((c: any) => c.is_mandatory && c.status === "published");
  const overdueMandatory = mandatoryCourses.filter((c: any) => c.deadline && new Date(c.deadline) < new Date());

  // ── Chart Data: 7-day enrollment/completion trend ──
  const trendData = useMemo(() => {
    const days: { date: string; enrolled: number; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = i18n.language?.startsWith("en")
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `${d.getMonth() + 1}/${d.getDate()}`;
      days.push({ date: label, enrolled: 0, completed: 0 });
      filteredEnrollments.forEach((e: any) => {
        if (e.enrolled_at?.slice(0, 10) === key) days[days.length - 1].enrolled++;
        if (e.completed_at?.slice(0, 10) === key) days[days.length - 1].completed++;
      });
    }
    return days;
  }, [filteredEnrollments, i18n.language]);

  // ── Chart Data: Role distribution ──
  const roleData = useMemo(() => [
    { name: t("roles.studentLabel"), value: roleCounts.student },
    { name: t("roles.teacherLabel"), value: roleCounts.teacher },
    { name: t("roles.adminLabel"), value: roleCounts.admin },
  ], [roleCounts, t]);

  // ── Chart Data: Top courses by enrollment with progress ──
  const topCourseData = useMemo(() => {
    const grouped: Record<string, { count: number; progress: number }> = {};
    filteredEnrollments.forEach((e: any) => {
      if (!grouped[e.course_id]) grouped[e.course_id] = { count: 0, progress: 0 };
      grouped[e.course_id].count++;
      grouped[e.course_id].progress += Number(e.progress) || 0;
    });
    return courses
      .filter((c: any) => c.status === "published" && grouped[c.id])
      .map((c: any) => ({
        name: c.title.length > 12 ? c.title.slice(0, 12) + "…" : c.title,
        fullName: c.title,
        enrolled: grouped[c.id].count,
        avgProgress: Math.round(grouped[c.id].progress / grouped[c.id].count),
      }))
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, 5);
  }, [courses, filteredEnrollments]);

  // ── Chart Data: Mandatory deadline timeline ──
  const mandatoryTimeline = useMemo(() => {
    const now = new Date();
    return mandatoryCourses
      .filter((c: any) => c.deadline)
      .map((c: any) => {
        const deadline = new Date(c.deadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { title: c.title, deadline: c.deadline, daysLeft, id: c.id };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [mandatoryCourses]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-[11px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
            {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
          </p>
        ))}
      </div>
    );
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

        {/* KPI Cards - compact row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[
            { label: t("admin.totalUsers"), value: filteredProfileCount, icon: Users, sub: `${t("roles.studentLabel")} ${roleCounts.student}` },
            { label: t("admin.activeCourses"), value: activeCourses, icon: BookOpen, sub: `${courses.length} ${t("admin.totalLabel", "전체")}` },
            { label: t("admin.totalEnrollments"), value: filteredEnrollments.length, icon: Activity, sub: t("admin.enrolledLabel") },
            { label: t("admin.avgCompletionRate"), value: `${avgCompletion}%`, icon: GraduationCap, sub: `${completedEnrollments} ${t("admin.completedLabel", "수료")}` },
            { label: t("admin.alertsTitle"), value: overdueMandatory.length, icon: AlertTriangle, sub: t("admin.overdueMandatory"), isDanger: overdueMandatory.length > 0 },
          ].map((s) => (
            <div key={s.label} className="stat-card !p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.isDanger ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-2xl font-bold ${s.isDanger ? "text-destructive" : "text-foreground"}`}>{s.value}</span>
              <p className="text-xs text-muted-foreground mt-1 truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1: Trend + Role Donut */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* 7-day Enrollment/Completion Trend */}
          <div className="stat-card !p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {t("admin.enrollmentTrend", "수강/수료 추이")} <span className="text-[10px] font-normal text-muted-foreground ml-1">{t("admin.last7Days", "최근 7일")}</span>
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="enrolled" name={t("admin.newEnrollments", "신규 수강")} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name={t("admin.completions", "수료")} stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Role Distribution Donut */}
          <div className="stat-card !p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("admin.userStats")}</h3>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string, entry: any) => (
                      <span className="text-[11px] text-muted-foreground">{value} <span className="font-semibold text-foreground">{entry.payload.value}</span></span>
                    )}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs font-medium text-foreground">{d.name}: {d.value}{t("common.people")}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Top Courses Progress + Mandatory Timeline */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Top Courses by Enrollment with Progress */}
          <div className="stat-card !p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("admin.topCourses", "인기 강의 진도 현황")}</h3>
            {topCourseData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("common.noData")}</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCourseData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} className="text-muted-foreground" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} className="text-muted-foreground" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-medium text-foreground mb-1">{d.fullName}</p>
                            <p className="text-[11px] text-muted-foreground">{t("admin.enrolledLabel")}: {d.enrolled}{t("common.people")}</p>
                            <p className="text-[11px] text-muted-foreground">{t("admin.avgProgressLabel")}: {d.avgProgress}%</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="avgProgress" name={t("admin.avgProgressLabel")} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Mandatory Training Timeline */}
          <div className="stat-card !p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">{t("admin.mandatoryTimeline", "필수교육 마감 현황")}</h3>
              <Link to="/admin/learning">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground">{t("common.viewAll")}</Button>
              </Link>
            </div>
            {mandatoryTimeline.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{t("admin.noMandatory", "필수교육 없음")}</p>
            ) : (
              <div className="space-y-3">
                {mandatoryTimeline.map((item) => {
                  const isOverdue = item.daysLeft < 0;
                  const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 3;
                  const progressPct = isOverdue ? 100 : Math.max(0, Math.min(100, 100 - (item.daysLeft / 30) * 100));

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground font-medium truncate flex-1">{item.title}</span>
                        <Badge
                          variant={isOverdue ? "destructive" : isUrgent ? "secondary" : "outline"}
                          className="text-[10px] shrink-0 whitespace-nowrap"
                        >
                          {isOverdue
                            ? t("admin.overdue", "기한 초과")
                            : item.daysLeft === 0
                              ? t("admin.dDay", "D-Day")
                              : `D-${item.daysLeft}`
                          }
                        </Badge>
                      </div>
                      <Progress
                        value={progressPct}
                        className={`h-1.5 ${isOverdue ? "[&>div]:bg-destructive" : isUrgent ? "[&>div]:bg-amber-500" : ""}`}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {i18n.language?.startsWith("en")
                          ? new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : new Date(item.deadline).toLocaleDateString("ko-KR")
                        }
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
