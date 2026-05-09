import { useMemo, useState } from "react";
import {
  Users, BookOpen, Activity, LayoutDashboard, Building2, GraduationCap,
  AlertTriangle, ClipboardCheck, Bell, Megaphone, Clock, ChevronRight,
  UserPlus, CheckCircle2, FileText, ArrowRight, Target, Percent, ListChecks,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import StatCard from "@/components/ui/stat-card";
import RankBar from "@/components/ui/rank-bar";
import { useDashboardSparklines, computeDelta } from "@/hooks/useDashboardSparklines";
import MultiTrendChart from "@/components/dashboard/MultiTrendChart";
import DonutChart from "@/components/dashboard/DonutChart";
import RadialProgress from "@/components/dashboard/RadialProgress";
import PeriodFilter, { type Period, periodToDays } from "@/components/dashboard/PeriodFilter";

const AdminDashboard = () => {
  const { profile } = useUser();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = i18n.language?.startsWith("en");
  const locale = isEn ? enUS : ko;
  const [trendPeriod, setTrendPeriod] = useState<Period>("7d");
  const trendDays = periodToDays(trendPeriod);

  // ── Data Queries ──
  const { data: realtimeSessions = [] } = useQuery({
    queryKey: ["dash-realtime-sessions"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("user_sessions").select("user_id").gte("login_at", fiveMinAgo);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: todayStats } = useQuery({
    queryKey: ["dash-today-stats"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [signupsRes, completionsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("enrollments").select("*", { count: "exact", head: true }).gte("completed_at", todayISO),
      ]);
      return {
        todaySignups: signupsRes.count || 0,
        todayCompletions: completionsRes.count || 0,
      };
    },
    staleTime: 60000,
  });

  const { data: pendingEnrollments = 0 } = useQuery({
    queryKey: ["dash-pending-enrollments"],
    queryFn: async () => {
      const { count, error } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: ungradedSubmissions = 0 } = useQuery({
    queryKey: ["dash-ungraded-submissions"],
    queryFn: async () => {
      const { count, error } = await supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).eq("status", "submitted");
      if (error) throw error;
      return count || 0;
    },
  });

  // ── Role widgets: 수강생 현황 / 과제 처리율 / 평가 통계 ──
  const { data: learnerStats } = useQuery({
    queryKey: ["dash-learner-stats"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [totalRes, activeRes, newRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_sessions").select("user_id").gte("login_at", sevenDaysAgo),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      ]);
      const activeIds = new Set((activeRes.data || []).map((s: any) => s.user_id));
      return {
        total: totalRes.count || 0,
        active7d: activeIds.size,
        new30d: newRes.count || 0,
      };
    },
    staleTime: 60_000,
  });

  const { data: assignmentStats } = useQuery({
    queryKey: ["dash-assignment-stats"],
    queryFn: async () => {
      const [totalRes, gradedRes, submittedRes] = await Promise.all([
        supabase.from("assignment_submissions").select("*", { count: "exact", head: true }),
        supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).eq("status", "graded"),
        supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      ]);
      const total = totalRes.count || 0;
      const graded = gradedRes.count || 0;
      return { total, graded, pending: submittedRes.count || 0, rate: total > 0 ? Math.round((graded / total) * 100) : 0 };
    },
    staleTime: 60_000,
  });

  const { data: assessmentStats } = useQuery({
    queryKey: ["dash-assessment-stats"],
    queryFn: async () => {
      const [totalRes, passedRes, completedRes, scoreRes] = await Promise.all([
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }),
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).eq("passed", true),
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).not("completed_at", "is", null),
        supabase.from("assessment_attempts").select("score").not("score", "is", null).limit(1000),
      ]);
      const completed = completedRes.count || 0;
      const passed = passedRes.count || 0;
      const scores = (scoreRes.data || []).map((r: any) => Number(r.score) || 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return {
        total: totalRes.count || 0,
        completed,
        passed,
        avgScore,
        passRate: completed > 0 ? Math.round((passed / completed) * 100) : 0,
      };
    },
    staleTime: 60_000,
  });

  // Only the slim columns we actually use, and only mandatory/published rows
  // (urgentMandatory + courseMap for activity feed). For 9K+ users this avoids
  // pulling the whole table on every dashboard mount.
  const { data: courses = [] } = useQuery({
    queryKey: ["dash-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, is_mandatory, deadline")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentAnnouncements = [] } = useQuery({
    queryKey: ["dash-recent-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("id, title, created_at, is_published").eq("is_published", true).order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Aggregated server-side summary — replaces the full enrollments + full
  // profiles scans (the previous biggest bottleneck for the dashboard).
  const { data: summary } = useQuery({
    queryKey: ["dash-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_summary");
      if (error) throw error;
      return data as {
        total_enrollments: number;
        total_completions: number;
        active_courses: number;
        top_courses: Array<{ id: string; title: string; enrolled: number; avg_progress: number }>;
      };
    },
    staleTime: 60_000,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["dash-recent-activity"],
    queryFn: async () => {
      const [recentEnrollRes, recentCompleteRes, recentSignupRes] = await Promise.all([
        supabase.from("enrollments").select("user_id, course_id, enrolled_at").order("enrolled_at", { ascending: false }).limit(5),
        supabase.from("enrollments").select("user_id, course_id, completed_at").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("user_id, full_name, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const activities: { type: string; userId: string; name?: string; courseId?: string; time: string }[] = [];

      recentSignupRes.data?.forEach((p: any) => {
        activities.push({ type: "signup", userId: p.user_id, name: p.full_name, time: p.created_at });
      });
      recentCompleteRes.data?.forEach((e: any) => {
        activities.push({ type: "complete", userId: e.user_id, courseId: e.course_id, time: e.completed_at });
      });
      recentEnrollRes.data?.forEach((e: any) => {
        activities.push({ type: "enroll", userId: e.user_id, courseId: e.course_id, time: e.enrolled_at });
      });

      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
    },
    staleTime: 60_000,
  });

  // Only fetch full_name for the user_ids that appear in the activity feed
  // (was previously pulling ALL 9K profiles on every dashboard load).
  const activityUserIds = useMemo(() => {
    const ids = new Set<string>();
    recentActivity.forEach((a: any) => { if (a.userId) ids.add(a.userId); });
    return Array.from(ids);
  }, [recentActivity]);

  const { data: profileMap = {} } = useQuery({
    queryKey: ["dash-profile-map", activityUserIds.join(",")],
    enabled: activityUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", activityUserIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.user_id] = p.full_name || ""; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived ──
  const onlineUsers = new Set(realtimeSessions.map((s: any) => s.user_id)).size;
  const mandatoryCourses = courses.filter((c: any) => c.is_mandatory && c.status === "published");
  const urgentMandatory = mandatoryCourses.filter((c: any) => {
    if (!c.deadline) return false;
    const daysLeft = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  });

  // Time-series for visualization on stat cards
  const { data: spark } = useDashboardSparklines(trendDays);
  const sessions7   = (spark?.sessions ?? []).slice(-7);
  const signups7    = (spark?.signups ?? []).slice(-7);
  const completions7 = (spark?.completions ?? []).slice(-7);
  const enrollDelta  = computeDelta(spark?.enrollments);
  const sessionsDelta = computeDelta(spark?.sessions);
  const signupsDelta = computeDelta(spark?.signups);
  const completionsDelta = computeDelta(spark?.completions);

  // Comes pre-aggregated from the server now.
  const topCourses = useMemo(
    () =>
      (summary?.top_courses ?? []).map((c) => ({
        title: c.title,
        enrolled: Number(c.enrolled) || 0,
        avgProgress: Number(c.avg_progress) || 0,
      })),
    [summary]
  );

  const completionRate = useMemo(() => {
    const total = summary?.total_enrollments ?? 0;
    const done = summary?.total_completions ?? 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [summary]);

  const enrollmentMix = useMemo(() => {
    const total = summary?.total_enrollments ?? 0;
    const done = summary?.total_completions ?? 0;
    const inProgress = Math.max(0, total - done);
    return [
      { label: isEn ? "Completed" : "수료 완료", value: done, color: "hsl(var(--chart-2))" },
      { label: isEn ? "In Progress" : "학습 중", value: inProgress, color: "hsl(var(--primary))" },
    ];
  }, [summary, isEn]);

  const courseMap = useMemo(() => {
    const m: Record<string, string> = {};
    courses.forEach((c: any) => { m[c.id] = c.title; });
    return m;
  }, [courses]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "signup": return <UserPlus className="h-4 w-4 text-chart-2" />;
      case "complete": return <CheckCircle2 className="h-4 w-4 text-chart-3" />;
      case "enroll": return <BookOpen className="h-4 w-4 text-primary" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (item: any) => {
    const name = item.name || profileMap[item.userId] || t("common.user");
    const course = item.courseId ? courseMap[item.courseId] : "";
    switch (item.type) {
      case "signup": return isEn ? `${name} joined the platform` : `${name}님이 가입했습니다`;
      case "complete": return isEn ? `${name} completed "${course}"` : `${name}님이 "${course}" 수료`;
      case "enroll": return isEn ? `${name} enrolled in "${course}"` : `${name}님이 "${course}" 수강 신청`;
      default: return "";
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
            {t("admin.adminDashboard")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.platformOverview")}</p>
        </div>

        {/* ① Live Status Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label={isEn ? "Online Now" : "현재 접속"}
            value={onlineUsers}
            unit={t("common.people")}
            icon={Activity}
            tone="info"
            trend={sessions7}
            delta={sessionsDelta}
            badge={
              <span className="relative flex h-2.5 w-2.5 mt-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-3 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-chart-3" />
              </span>
            }
          />
          <StatCard
            label={isEn ? "Today Signups" : "오늘 가입"}
            value={todayStats?.todaySignups || 0}
            unit={t("common.people")}
            icon={UserPlus}
            tone="success"
            trend={signups7}
            delta={signupsDelta}
          />
          <StatCard
            label={isEn ? "Today Completions" : "오늘 수료"}
            value={todayStats?.todayCompletions || 0}
            unit={t("common.people")}
            icon={GraduationCap}
            tone="warning"
            trend={completions7}
            delta={completionsDelta}
          />
        </div>

        {/* ② Action Required Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pending Enrollments */}
          <button
            onClick={() => navigate("/admin/enrollments")}
            className="stat-card !p-4 text-left hover:border-primary/30 transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              {pendingEnrollments > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  {pendingEnrollments}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground mt-3">
              {isEn ? "Pending Enrollments" : "승인 대기 수강신청"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingEnrollments > 0
                ? (isEn ? `${pendingEnrollments} requests waiting` : `${pendingEnrollments}건 처리 필요`)
                : (isEn ? "All caught up!" : "처리할 항목 없음")
              }
            </p>
            <div className="flex items-center text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEn ? "Go to review" : "바로가기"} <ChevronRight className="h-3 w-3 ml-0.5" />
            </div>
          </button>

          {/* Urgent Mandatory Training */}
          <button
            onClick={() => navigate("/admin/learning")}
            className="stat-card !p-4 text-left hover:border-destructive/30 transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-2.5 ${urgentMandatory.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${urgentMandatory.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              {urgentMandatory.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {urgentMandatory.length}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground mt-3">
              {isEn ? "Urgent Mandatory" : "긴급 필수교육"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {urgentMandatory.length > 0
                ? (isEn ? `${urgentMandatory.length} courses within D-3` : `D-3 이내 ${urgentMandatory.length}개 강의`)
                : (isEn ? "No urgent items" : "긴급 항목 없음")
              }
            </p>
            <div className="flex items-center text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEn ? "View details" : "바로가기"} <ChevronRight className="h-3 w-3 ml-0.5" />
            </div>
          </button>

          {/* Ungraded Assignments */}
          <button
            onClick={() => navigate("/admin/courses")}
            className="stat-card !p-4 text-left hover:border-chart-2/30 transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-2.5 ${ungradedSubmissions > 0 ? "bg-chart-2/10" : "bg-muted"}`}>
                <FileText className={`h-5 w-5 ${ungradedSubmissions > 0 ? "text-chart-2" : "text-muted-foreground"}`} />
              </div>
              {ungradedSubmissions > 0 && (
                <Badge className="text-xs bg-chart-2 text-white">
                  {ungradedSubmissions}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground mt-3">
              {isEn ? "Ungraded Submissions" : "미채점 과제"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {ungradedSubmissions > 0
                ? (isEn ? `${ungradedSubmissions} submissions pending` : `${ungradedSubmissions}건 채점 대기`)
                : (isEn ? "All graded!" : "채점 완료")
              }
            </p>
            <div className="flex items-center text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEn ? "Go to grade" : "바로가기"} <ChevronRight className="h-3 w-3 ml-0.5" />
            </div>
          </button>

          {/* Recent Announcements */}
          <button
            onClick={() => navigate("/admin/announcements")}
            className="stat-card !p-4 text-left hover:border-chart-4/30 transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-chart-4/10 p-2.5">
                <Megaphone className="h-5 w-5 text-chart-4" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground mt-3">
              {isEn ? "Announcements" : "공지사항"}
            </p>
            {recentAnnouncements.length > 0 ? (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {recentAnnouncements[0]?.title}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {isEn ? "No announcements" : "공지 없음"}
              </p>
            )}
            <div className="flex items-center text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEn ? "View all" : "바로가기"} <ChevronRight className="h-3 w-3 ml-0.5" />
            </div>
          </button>
        </div>

        {/* ③ Bottom Row: Activity Feed + Quick Summary */}
        {/* ②-b Role Insight Widgets: 수강생 현황 / 과제 처리율 / 평가 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 수강생 현황 */}
          <div className="stat-card !p-5 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {isEn ? "Learner Status" : "수강생 현황"}
              </h3>
              <Link to="/admin/users" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-bold text-foreground leading-none">{learnerStats?.total ?? 0}</span>
              <span className="text-xs text-muted-foreground mb-1">{isEn ? "total learners" : "전체 수강생"}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-chart-3" />{isEn ? "Active (7d)" : "활동(7일)"}</span>
                <span className="font-semibold text-foreground">{learnerStats?.active7d ?? 0}{t("common.people")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5 text-chart-2" />{isEn ? "New (30d)" : "신규(30일)"}</span>
                <span className="font-semibold text-foreground">{learnerStats?.new30d ?? 0}{t("common.people")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5 text-primary" />{isEn ? "Pending approval" : "승인 대기"}</span>
                <span className="font-semibold text-foreground">{pendingEnrollments}{t("common.count")}</span>
              </div>
            </div>
          </div>

          {/* 과제 처리율 */}
          <div className="stat-card !p-5 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {isEn ? "Assignment Processing" : "과제 처리율"}
              </h3>
              <Link to="/admin/courses" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-center justify-center mb-3">
              <RadialProgress value={assignmentStats?.rate ?? 0} label={isEn ? "Graded" : "채점률"} size={130} color="hsl(var(--chart-2))" />
            </div>
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isEn ? "Total submissions" : "총 제출"}</span>
                <span className="font-semibold text-foreground">{assignmentStats?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isEn ? "Graded" : "채점 완료"}</span>
                <span className="font-semibold text-chart-2">{assignmentStats?.graded ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isEn ? "Pending" : "대기"}</span>
                <span className="font-semibold text-amber-600">{assignmentStats?.pending ?? 0}</span>
              </div>
            </div>
          </div>

          {/* 평가 통계 */}
          <div className="stat-card !p-5 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                {isEn ? "Assessment Stats" : "평가 통계"}
              </h3>
              <Link to="/admin/courses" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">{isEn ? "Pass rate" : "합격률"}</p>
                <p className="text-2xl font-bold text-chart-3 mt-0.5">{assessmentStats?.passRate ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">{isEn ? "Avg score" : "평균 점수"}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{assessmentStats?.avgScore ?? 0}</p>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" />{isEn ? "Total attempts" : "총 응시"}</span>
                <span className="font-semibold text-foreground">{assessmentStats?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />{isEn ? "Passed" : "합격"}</span>
                <span className="font-semibold text-chart-2">{assessmentStats?.passed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" />{isEn ? "Completed" : "완료"}</span>
                <span className="font-semibold text-foreground">{assessmentStats?.completed ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ③ Trend visualization (kept) */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="stat-card !p-5 lg:col-span-2 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                {isEn
                  ? trendPeriod === "all" ? "All-Period Trends" : `${trendDays}-Day Trends`
                  : trendPeriod === "all" ? "전체 기간 추이" : `${trendDays}일 추이`}
              </h3>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[11px] text-muted-foreground">
                  {isEn ? "signups · enrollments · completions" : "가입 · 수강 · 수료"}
                </span>
                <PeriodFilter
                  value={trendPeriod}
                  onChange={setTrendPeriod}
                  labels={isEn ? undefined : { "7d": "7일", "30d": "30일", all: "전체" }}
                />
              </div>
            </div>
            <MultiTrendChart
              days={spark?.days ?? []}
              series={[
                { key: "signups", label: isEn ? "Signups" : "가입", color: "hsl(var(--chart-2))", values: spark?.signups ?? [] },
                { key: "enrollments", label: isEn ? "Enrollments" : "수강", color: "hsl(var(--primary))", values: spark?.enrollments ?? [] },
                { key: "completions", label: isEn ? "Completions" : "수료", color: "hsl(var(--chart-4))", values: spark?.completions ?? [] },
              ]}
              height={240}
            />
          </div>
          <div className="stat-card !p-5 min-w-0 flex flex-col">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {isEn ? "Completion Mix" : "수료 비율"}
            </h3>
            <div className="flex items-center justify-center gap-4 flex-1">
              <RadialProgress value={completionRate} label={isEn ? "Completion" : "수료율"} size={140} />
            </div>
            <div className="mt-3 pt-3 border-t border-border/60">
              <DonutChart data={enrollmentMix} size={120} />
            </div>
          </div>
        </div>

        {/* ④ Activity Feed + Top Courses */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Recent Activity Feed */}
          <div className="stat-card !p-5 lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {isEn ? "Recent Activity" : "최근 활동"}
              </h3>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("common.noData")}</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <div className="mt-0.5 shrink-0">
                      {getActivityIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {getActivityText(item)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Weekly Summary */}
            <div className="stat-card !p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">
                {isEn ? "Quick Summary" : "빠른 요약"}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {isEn ? "Total Enrollments" : "전체 수강"}
                  </span>
                    <span className="text-sm font-bold text-foreground">{summary?.total_enrollments ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {isEn ? "Completions" : "수료 완료"}
                  </span>
                    <span className="text-sm font-bold text-foreground">{summary?.total_completions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {isEn ? "Active Courses" : "활성 강의"}
                  </span>
                    <span className="text-sm font-bold text-foreground">{summary?.active_courses ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Top Courses */}
            <div className="stat-card !p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">
                  {isEn ? "Popular Courses" : "인기 강의 TOP 3"}
                </h3>
                <Link to="/admin/courses">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                    {t("common.viewAll")} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              {topCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
              ) : (
                <div className="space-y-3">
                  {topCourses.map((course, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-foreground font-medium truncate flex-1">
                          <span className="text-xs text-muted-foreground mr-1.5">{idx + 1}.</span>
                          {course.title}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{course.enrolled}{t("common.people")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RankBar value={course.avgProgress} className="h-2" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{course.avgProgress}%</span>
                      </div>
                    </div>
                  ))}
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
