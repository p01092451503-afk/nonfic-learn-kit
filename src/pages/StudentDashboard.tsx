import {
  BookOpen, Clock, ClipboardCheck, Award, Play, ArrowRight, TrendingUp, BarChart3, Star,
  AlertTriangle, Calendar, Target, Users, CheckCircle2, FileText,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import RadialProgress from "@/components/dashboard/RadialProgress";
import DonutChart from "@/components/dashboard/DonutChart";
import MiniBarChart from "@/components/dashboard/MiniBarChart";
import { format, subDays, startOfDay } from "date-fns";
import { useState } from "react";
import PeriodFilter, { type Period, periodToDays } from "@/components/dashboard/PeriodFilter";
import StatCard from "@/components/ui/stat-card";
import { useStudentSparklines, computeDelta } from "@/hooks/useStudentSparklines";

const StudentDashboard = () => {
  const { user, profile } = useUser();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "ko";
  const displayName = profile?.full_name || t("common.user");
  const [activityPeriod, setActivityPeriod] = useState<Period>("7d");
  const activityDays = periodToDays(activityPeriod);
  const { data: spark } = useStudentSparklines(user?.id, 14);

  // 수강 중인 강좌 (진행 중)
  const { data: enrollments = [] } = useQuery({
    queryKey: ["dash-enrollments", user?.id, lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(id, title, instructor_id, difficulty_level, course_i18n(language_code, title))")
        .eq("user_id", user!.id)
        .is("completed_at", null)
        .order("enrolled_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (lang === "ko") return data;
      return (data || []).map((e: any) => {
        if (!e.courses) return e;
        const tr = (e.courses.course_i18n || []).find((x: any) => x.language_code === lang);
        return { ...e, courses: { ...e.courses, title: tr?.title || e.courses.title } };
      });
    },
    enabled: !!user?.id,
  });

  // 강사 프로필 조회
  const instructorIds = [...new Set(enrollments.map((e: any) => e.courses?.instructor_id).filter(Boolean))];
  const { data: instructorProfiles = [] } = useQuery({
    queryKey: ["dash-instructors", instructorIds],
    queryFn: async () => {
      if (instructorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", instructorIds);
      if (error) throw error;
      return data;
    },
    enabled: instructorIds.length > 0,
  });
  const instructorMap = new Map(instructorProfiles.map((p: any) => [p.user_id, p.full_name]));

  // 각 강좌의 다음 차시 조회
  const courseIds = enrollments.map((e: any) => e.course_id);
  const { data: courseContents = [] } = useQuery({
    queryKey: ["dash-course-contents", courseIds, lang],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("course_contents")
        .select("id, course_id, title, order_index, course_content_i18n(language_code, title)")
        .in("course_id", courseIds)
        .order("order_index", { ascending: true });
      if (error) throw error;
      if (lang === "ko") return data;
      return (data || []).map((c: any) => {
        const tr = (c.course_content_i18n || []).find((x: any) => x.language_code === lang);
        return { ...c, title: tr?.title || c.title };
      });
    },
    enabled: courseIds.length > 0,
  });

  const { data: contentProgress = [] } = useQuery({
    queryKey: ["dash-content-progress", user?.id, courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const contentIds = courseContents.map((c: any) => c.id);
      if (contentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("content_progress")
        .select("content_id, completed")
        .eq("user_id", user!.id)
        .in("content_id", contentIds);
      if (error) throw error;
      return data;
    },
    enabled: courseContents.length > 0 && !!user?.id,
  });

  const completedContentIds = new Set(contentProgress.filter((p: any) => p.completed).map((p: any) => p.content_id));

  const getNextContent = (courseId: string) => {
    const contents = courseContents.filter((c: any) => c.course_id === courseId);
    return contents.find((c: any) => !completedContentIds.has(c.id));
  };

  // 통계
  const { data: enrollmentStats } = useQuery({
    queryKey: ["dash-enrollment-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("progress, completed_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      const total = data.length;
      const completed = data.filter((e) => e.completed_at).length;
      const inProgress = total - completed;
      const avgProgress = total > 0 ? Math.round(data.reduce((s, e) => s + (Number(e.progress) || 0), 0) / total) : 0;
      return { total, completed, inProgress, avgProgress };
    },
    enabled: !!user?.id,
  });

  // 완료한 과제
  const { data: completedAssignments = 0 } = useQuery({
    queryKey: ["dash-completed-assignments", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user!.id)
        .eq("status", "graded");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: totalAssignments = 0 } = useQuery({
    queryKey: ["dash-total-assignments", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // 뱃지
  const { data: badgeCount = 0 } = useQuery({
    queryKey: ["dash-badge-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // 게이미피케이션
  const { data: gamification } = useQuery({
    queryKey: ["dash-gamification", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // 필수교육 (마감 임박 우선)
  const { data: mandatoryCourses = [] } = useQuery({
    queryKey: ["dash-mandatory", user?.id, lang],
    queryFn: async () => {
      // Get enrolled mandatory courses that are not completed
      const { data: myEnrollments } = await supabase
        .from("enrollments")
        .select("course_id, progress")
        .eq("user_id", user!.id)
        .is("completed_at", null);

      if (!myEnrollments || myEnrollments.length === 0) return [];
      const enrolledMap = new Map(myEnrollments.map(e => [e.course_id, Number(e.progress) || 0]));

      const { data: courses, error } = await supabase
        .from("courses")
        .select("id, title, deadline, is_mandatory, course_i18n(language_code, title)")
        .eq("is_mandatory", true)
        .eq("status", "published")
        .in("id", [...enrolledMap.keys()])
        .order("deadline", { ascending: true });

      if (error) throw error;
      return (courses || []).map(c => ({
        ...c,
        title: lang === "en"
          ? ((c as any).course_i18n?.find((x: any) => x.language_code === "en")?.title || c.title)
          : c.title,
        progress: enrolledMap.get(c.id) || 0,
        daysLeft: c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      }));
    },
    enabled: !!user?.id,
  });

  // 추천 강의 (수강하지 않은 published 강좌)
  const { data: recommendedCourses = [] } = useQuery({
    queryKey: ["dash-recommended", user?.id, lang],
    queryFn: async () => {
      const { data: enrolledData } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      const enrolledIds = (enrolledData || []).map((e) => e.course_id);

      let query = supabase
        .from("courses")
        .select("id, title, instructor_id, course_i18n(language_code, title)")
        .eq("status", "published")
        .limit(3);

      if (enrolledIds.length > 0) {
        // Filter out enrolled courses - use not.in
        const { data, error } = await supabase
          .from("courses")
          .select("id, title, instructor_id, course_i18n(language_code, title)")
          .eq("status", "published")
          .not("id", "in", `(${enrolledIds.join(",")})`)
          .limit(3);
        if (error) throw error;
        return (data || []).map((c: any) => ({
          ...c,
          title: lang === "en" ? (c.course_i18n?.find((x: any) => x.language_code === "en")?.title || c.title) : c.title,
        }));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        title: lang === "en" ? (c.course_i18n?.find((x: any) => x.language_code === "en")?.title || c.title) : c.title,
      }));
    },
    enabled: !!user?.id,
  });

  // 추천 강좌 강사 정보
  const recInstructorIds = [...new Set(recommendedCourses.map((c: any) => c.instructor_id).filter(Boolean))];
  const { data: recInstructorProfiles = [] } = useQuery({
    queryKey: ["dash-rec-instructors", recInstructorIds],
    queryFn: async () => {
      if (recInstructorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", recInstructorIds);
      if (error) throw error;
      return data;
    },
    enabled: recInstructorIds.length > 0,
  });
  const recInstructorMap = new Map(recInstructorProfiles.map((p: any) => [p.user_id, p.full_name]));

  // 추천 강좌 수강생 수
  const { data: recEnrollCounts = [] } = useQuery({
    queryKey: ["dash-rec-enroll-counts", recommendedCourses.map((c: any) => c.id)],
    queryFn: async () => {
      const ids = recommendedCourses.map((c: any) => c.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: recommendedCourses.length > 0,
  });
  const recEnrollCountMap = new Map<string, number>();
  recEnrollCounts.forEach((e: any) => {
    recEnrollCountMap.set(e.course_id, (recEnrollCountMap.get(e.course_id) || 0) + 1);
  });

  const assignmentCompletionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  // ── Student role widgets: 평가 통계 / 과제 처리 / 동기 현황 ──
  const { data: myAssessmentStats } = useQuery({
    queryKey: ["dash-my-assessment-stats", user?.id],
    queryFn: async () => {
      const [tRes, cRes, pRes, sRes] = await Promise.all([
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id).not("completed_at", "is", null),
        supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("passed", true),
        supabase.from("assessment_attempts").select("score").eq("user_id", user!.id).not("score", "is", null),
      ]);
      const completed = cRes.count || 0;
      const passed = pRes.count || 0;
      const scores = (sRes.data || []).map((r: any) => Number(r.score) || 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const best = scores.length > 0 ? Math.max(...scores) : 0;
      return { total: tRes.count || 0, completed, passed, avg, best, passRate: completed > 0 ? Math.round((passed / completed) * 100) : 0 };
    },
    enabled: !!user?.id,
  });

  const { data: myAssignmentBreakdown } = useQuery({
    queryKey: ["dash-my-assignment-breakdown", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("status, score")
        .eq("student_id", user!.id);
      if (error) throw error;
      const rows = data || [];
      const submitted = rows.filter((r: any) => r.status === "submitted").length;
      const graded = rows.filter((r: any) => r.status === "graded").length;
      const scores = rows.filter((r: any) => r.score !== null).map((r: any) => Number(r.score) || 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { total: rows.length, submitted, graded, avg };
    },
    enabled: !!user?.id,
  });

  const { data: cohortStats } = useQuery({
    queryKey: ["dash-cohort-stats", user?.id, courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return { peers: 0, avgPeerProgress: 0, myRank: 0 };
      const { data, error } = await supabase
        .from("enrollments")
        .select("user_id, progress")
        .in("course_id", courseIds);
      if (error) throw error;
      const peerByUser = new Map<string, { sum: number; n: number }>();
      (data || []).forEach((e: any) => {
        const cur = peerByUser.get(e.user_id) || { sum: 0, n: 0 };
        cur.sum += Number(e.progress) || 0;
        cur.n += 1;
        peerByUser.set(e.user_id, cur);
      });
      const averages = Array.from(peerByUser.entries()).map(([uid, v]) => ({ uid, avg: v.n ? v.sum / v.n : 0 }));
      averages.sort((a, b) => b.avg - a.avg);
      const myEntry = averages.find((a) => a.uid === user!.id);
      const myRank = myEntry ? averages.findIndex((a) => a.uid === user!.id) + 1 : 0;
      const others = averages.filter((a) => a.uid !== user!.id);
      const avgPeerProgress = others.length > 0 ? Math.round(others.reduce((s, a) => s + a.avg, 0) / others.length) : 0;
      return { peers: averages.length, avgPeerProgress, myRank };
    },
    enabled: !!user?.id && courseIds.length > 0,
  });

  // 7일 학습 활동 (content_progress 완료 기준)
  const { data: weeklyActivity = [] } = useQuery({
    queryKey: ["dash-weekly-activity", user?.id, activityDays],
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), activityDays - 1)).toISOString();
      const { data, error } = await supabase
        .from("content_progress")
        .select("completed_at, completed")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .gte("completed_at", since);
      if (error) throw error;
      const labels = lang === "en"
        ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
        : ["일","월","화","수","목","금","토"];
      const buckets = Array.from({ length: activityDays }, (_, i) => {
        const d = subDays(new Date(), activityDays - 1 - i);
        const label = activityDays <= 7
          ? labels[d.getDay()]
          : activityDays <= 30
            ? format(d, "M/d")
            : format(d, "M/d");
        return { key: format(d, "yyyy-MM-dd"), label, value: 0 };
      });
      (data || []).forEach((r: any) => {
        if (!r.completed_at) return;
        const k = format(new Date(r.completed_at), "yyyy-MM-dd");
        const b = buckets.find(b => b.key === k);
        if (b) b.value += 1;
      });
      // For longer periods, thin x-axis labels to avoid overlap
      return buckets.map(({ label, value }, i) => {
        const everyN = activityDays <= 7 ? 1 : activityDays <= 30 ? 3 : 14;
        return { label: i % everyN === 0 ? label : "", value };
      });
    },
    enabled: !!user?.id,
  });

  const overallProgress = enrollmentStats?.avgProgress || 0;
  const enrollmentMix = [
    { label: t("dashboard.coursesCompleted"), value: enrollmentStats?.completed || 0, color: "hsl(var(--chart-2))" },
    { label: t("dashboard.coursesInProgress"), value: enrollmentStats?.inProgress || 0, color: "hsl(var(--primary))" },
  ];

  const stats = [
    { label: t("dashboard.coursesInProgress"), value: String(enrollmentStats?.inProgress || 0), sub: t("dashboard.inProgress"), icon: BookOpen, href: "/dashboard/courses" },
    { label: t("dashboard.coursesCompleted"), value: String(enrollmentStats?.completed || 0), sub: t("dashboard.totalCourses", { count: enrollmentStats?.total || 0 }), icon: ClipboardCheck, href: "/dashboard/courses" },
    { label: t("dashboard.learningTime"), value: `${gamification?.experience_points ? Math.round(gamification.experience_points / 60) : 0}h`, sub: t("dashboard.cumulativeLearning"), icon: Clock },
    { label: t("dashboard.badgesEarned"), value: String(badgeCount), sub: t("dashboard.earnedBadges"), icon: Award, href: "/dashboard/achievements" },
  ];

  const detailStats = [
    { label: t("dashboard.consecutiveLearning"), value: `${gamification?.streak_days || 0}${t("common.days")}`, sub: t("dashboard.consecutiveDays"), icon: TrendingUp },
    { label: t("dashboard.level"), value: `Lv.${gamification?.level || 1}`, sub: `${gamification?.experience_points || 0} XP`, icon: Star },
    { label: t("dashboard.completedAssignments"), value: String(completedAssignments), sub: t("dashboard.totalAssignmentsSub", { count: totalAssignments }), icon: ClipboardCheck },
    { label: t("dashboard.totalPoints"), value: String(gamification?.total_points || 0), sub: t("dashboard.cumulativePoints"), icon: Award },
  ];

  const trendHint = lang === "en" ? "vs last 7 days" : "최근 7일 대비";
  type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  const visualStats: Array<{
    label: string; value: string; unit?: string; icon: any; tone: Tone;
    trend?: number[]; delta?: number | null; hint?: string; href?: string;
  }> = [
    {
      label: t("dashboard.coursesInProgress"), value: String(enrollmentStats?.inProgress || 0),
      icon: BookOpen, tone: "primary",
      trend: spark?.enrollments, delta: computeDelta(spark?.enrollments),
      hint: t("dashboard.inProgress"), href: "/dashboard/courses",
    },
    {
      label: t("dashboard.coursesCompleted"), value: String(enrollmentStats?.completed || 0),
      icon: ClipboardCheck, tone: "success",
      trend: spark?.completions, delta: computeDelta(spark?.completions),
      hint: t("dashboard.totalCourses", { count: enrollmentStats?.total || 0 }), href: "/dashboard/courses",
    },
    {
      label: t("dashboard.learningTime"),
      value: String(gamification?.experience_points ? Math.round(gamification.experience_points / 60) : 0),
      unit: "h", icon: Clock, tone: "info",
      trend: spark?.sessions, delta: computeDelta(spark?.sessions),
      hint: t("dashboard.cumulativeLearning"),
    },
    {
      label: t("dashboard.badgesEarned"), value: String(badgeCount),
      icon: Award, tone: "warning",
      trend: spark?.badges, delta: computeDelta(spark?.badges),
      hint: t("dashboard.earnedBadges"), href: "/dashboard/achievements",
    },
    {
      label: t("dashboard.consecutiveLearning"),
      value: String(gamification?.streak_days || 0), unit: t("common.days"),
      icon: TrendingUp, tone: "primary",
      trend: spark?.sessions, delta: computeDelta(spark?.sessions),
      hint: t("dashboard.consecutiveDays"),
    },
    {
      label: t("dashboard.level"), value: `Lv.${gamification?.level || 1}`,
      icon: Star, tone: "info",
      trend: spark?.points, delta: computeDelta(spark?.points),
      hint: `${gamification?.experience_points || 0} XP`, href: "/dashboard/achievements",
    },
    {
      label: t("dashboard.completedAssignments"), value: String(completedAssignments),
      icon: ClipboardCheck, tone: "success",
      trend: spark?.assignments, delta: computeDelta(spark?.assignments),
      hint: t("dashboard.totalAssignmentsSub", { count: totalAssignments }),
      href: "/dashboard/assignments",
    },
    {
      label: t("dashboard.totalPoints"), value: String(gamification?.total_points || 0),
      icon: Award, tone: "warning",
      trend: spark?.points, delta: computeDelta(spark?.points),
      hint: t("dashboard.cumulativePoints"), href: "/dashboard/achievements",
    },
  ];

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />
            {t("dashboard.learningDashboard")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("dashboard.hello")}</p>
        </div>

        {/* Stat Cards — visualization-rich (sparkline + delta) */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" aria-label={t("dashboard.stats", "학습 통계")}>
          {visualStats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              unit={s.unit}
              icon={s.icon}
              tone={s.tone}
              trend={s.trend}
              delta={s.delta}
              hint={s.hint}
              onClick={s.href ? () => navigate(s.href!) : undefined}
            />
          ))}
        </section>

        {/* Role Insight Widgets: 동기 현황 / 과제 처리 / 평가 통계 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label={t("dashboard.learningStats")}>
          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {lang === "en" ? "Cohort Status" : "수강생 현황"}
            </h3>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-bold text-foreground leading-none">{cohortStats?.peers ?? 0}</span>
              <span className="text-xs text-muted-foreground mb-1">{lang === "en" ? "peers in your courses" : "함께 수강 중"}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "Peer avg progress" : "동기 평균 진도"}</span>
                <span className="font-semibold text-foreground">{cohortStats?.avgPeerProgress ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "My progress" : "내 진도"}</span>
                <span className="font-semibold text-primary">{overallProgress}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "My rank" : "내 순위"}</span>
                <span className="font-semibold text-foreground">
                  {cohortStats?.myRank ? `${cohortStats.myRank} / ${cohortStats.peers}` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {lang === "en" ? "Assignment Processing" : "과제 처리율"}
            </h3>
            <div className="flex items-center justify-center mb-3">
              <RadialProgress
                value={myAssignmentBreakdown && myAssignmentBreakdown.total > 0 ? Math.round((myAssignmentBreakdown.graded / myAssignmentBreakdown.total) * 100) : 0}
                label={lang === "en" ? "Graded" : "채점률"}
                size={130}
                color="hsl(var(--chart-2))"
              />
            </div>
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "Total submissions" : "총 제출"}</span>
                <span className="font-semibold text-foreground">{myAssignmentBreakdown?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "Graded" : "채점 완료"}</span>
                <span className="font-semibold text-chart-2">{myAssignmentBreakdown?.graded ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "Avg score" : "평균 점수"}</span>
                <span className="font-semibold text-foreground">{myAssignmentBreakdown?.avg ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              {lang === "en" ? "Assessment Stats" : "평가 통계"}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">{lang === "en" ? "Pass rate" : "합격률"}</p>
                <p className="text-2xl font-bold text-chart-3 mt-0.5">{myAssessmentStats?.passRate ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">{lang === "en" ? "Best score" : "최고 점수"}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{myAssessmentStats?.best ?? 0}</p>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "Total attempts" : "총 응시"}</span>
                <span className="font-semibold text-foreground">{myAssessmentStats?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />{lang === "en" ? "Passed" : "합격"}</span>
                <span className="font-semibold text-chart-2">{myAssessmentStats?.passed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lang === "en" ? "Avg score" : "평균 점수"}</span>
                <span className="font-semibold text-foreground">{myAssessmentStats?.avg ?? 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Visualization Hero — overall progress · enrollment mix · weekly activity */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label={t("dashboard.learningStats")}>
          <div className="stat-card !p-5 flex flex-col items-center justify-center min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 self-start flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> {t("dashboard.progressRate")}
            </h3>
            <RadialProgress
              value={overallProgress}
              label={t("dashboard.averageScore")}
              sublabel={`${enrollmentStats?.completed || 0} / ${enrollmentStats?.total || 0}`}
              size={170}
            />
          </div>
          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" /> {t("dashboard.coursesInProgress")} · {t("dashboard.coursesCompleted")}
            </h3>
            <DonutChart
              data={enrollmentMix}
              size={150}
              centerValue={enrollmentStats?.total || 0}
              centerLabel={t("dashboard.totalCourses", { count: enrollmentStats?.total || 0 })}
            />
          </div>
          <div className="stat-card !p-5 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {lang === "en"
                  ? activityPeriod === "all" ? "All-period activity" : `Last ${activityDays} days`
                  : activityPeriod === "all" ? "전체 기간 활동" : `최근 ${activityDays}일 활동`}
              </h3>
              <PeriodFilter
                value={activityPeriod}
                onChange={setActivityPeriod}
                labels={lang === "en" ? undefined : { "7d": "7일", "30d": "30일", all: "전체" }}
              />
            </div>
            <MiniBarChart data={weeklyActivity as any} height={150} />
            <p className="text-[11px] text-muted-foreground text-right mt-2">
              {weeklyActivity.reduce((s: number, d: any) => s + d.value, 0)} {lang === "en" ? "lessons" : "차시"}
            </p>
          </div>
        </section>

        {/* 필수교육 안내 */}
        {mandatoryCourses.length > 0 && (
          <section className="stat-card !p-6 space-y-4 border-destructive/30" aria-label={t("mandatory.title")} role="alert">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("mandatory.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("mandatory.subtitle")}</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border">
              {mandatoryCourses.map((mc: any, index: number) => {
                const isOverdue = mc.daysLeft !== null && mc.daysLeft < 0;
                const isToday = mc.daysLeft === 0;
                const isUrgent = mc.daysLeft !== null && mc.daysLeft <= 3;
                return (
                  <div key={mc.id} className={`!p-3 sm:!p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-b-2 border-border/80 last:border-b-0 ${isOverdue ? "bg-destructive/5" : isUrgent ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}`} role="article" aria-label={mc.title}>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">{mc.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isOverdue ? "bg-destructive/10 text-destructive" :
                          isToday ? "bg-destructive/10 text-destructive" :
                          isUrgent ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                          "bg-muted text-muted-foreground"
                        }`} role="status">
                          {isOverdue ? t("mandatory.overdue") :
                           isToday ? t("mandatory.today") :
                           mc.daysLeft !== null ? t("mandatory.daysLeft", { days: mc.daysLeft }) : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={mc.progress} className="h-2 flex-1" aria-label={`${t("dashboard.progressRate")}: ${Math.round(mc.progress)}%`} />
                        <span className="text-xs font-semibold text-foreground shrink-0">{Math.round(mc.progress)}%</span>
                      </div>
                      {mc.deadline && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          <time dateTime={mc.deadline}>{t("mandatory.deadline")}: {mc.deadline}</time>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant={isOverdue || isUrgent ? "destructive" : "outline"} className="shrink-0 rounded-full gap-1.5 w-full sm:w-auto" onClick={() => navigate(`/student/courses/${mc.id}?view=learn`)} aria-label={`${mc.title} - ${t("common.continue")}`}>
                      <Play className="h-3.5 w-3.5" aria-hidden="true" /> {t("common.continue")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="stat-card !p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">{t("dashboard.ongoingCourses")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t("dashboard.continueStudy")}</p>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{t("dashboard.noCourses")}</p>
            </div>
          ) : (
            <div className="space-y-0 rounded-2xl overflow-hidden border border-border">
              {enrollments.map((enrollment: any, index: number) => {
                const nextContent = getNextContent(enrollment.course_id);
                const progress = Math.round(Number(enrollment.progress) || 0);
                const instructorName = instructorMap.get(enrollment.courses?.instructor_id) || t("dashboard.instructor");

                return (
                  <div key={enrollment.id} className="!p-4 sm:!p-5 space-y-3 border-b-2 border-border/80 last:border-b-0" role="article" aria-label={enrollment.courses?.title}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                          {enrollment.courses?.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{instructorName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0 rounded-full w-full sm:w-auto"
                        onClick={() => {
                          if (nextContent) {
                            navigate(`/student/courses/${enrollment.course_id}/content/${nextContent.id}?view=learn`);
                          } else {
                            navigate(`/student/courses/${enrollment.course_id}?view=learn`);
                          }
                        }}
                        aria-label={`${enrollment.courses?.title} - ${t("common.continue")}`}
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" /> {t("common.continue")}
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("dashboard.progressRate")}</span>
                        <span className="font-semibold text-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2.5" aria-label={`${t("dashboard.progressRate")}: ${progress}%`} />
                    </div>

                    {nextContent && (
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.nextLesson", { title: nextContent.title })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 학습 통계 + 추천 강의 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 학습 통계 */}
          <div className="stat-card !p-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5" aria-hidden="true" /> {t("dashboard.learningStats")}
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("dashboard.weeklyGoal")}</span>
                  <span className="font-semibold text-foreground">
                    {gamification?.experience_points ? Math.round(gamification.experience_points / 60) : 0}h / 20h
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((gamification?.experience_points ? gamification.experience_points / 60 : 0) / 20) * 100)}
                  className="h-3"
                  aria-label={`${t("dashboard.weeklyGoal")}: ${gamification?.experience_points ? Math.round(gamification.experience_points / 60) : 0}h / 20h`}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("dashboard.assignmentCompletionRate")}</span>
                  <span className="font-semibold text-foreground">{assignmentCompletionRate}%</span>
                </div>
                <Progress value={assignmentCompletionRate} className="h-3" aria-label={`${t("dashboard.assignmentCompletionRate")}: ${assignmentCompletionRate}%`} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("dashboard.averageScore")}</span>
                  <span className="font-semibold text-foreground">{enrollmentStats?.avgProgress || 0}{t("common.points")}</span>
                </div>
                <Progress value={enrollmentStats?.avgProgress || 0} className="h-3" aria-label={`${t("dashboard.averageScore")}: ${enrollmentStats?.avgProgress || 0}${t("common.points")}`} />
              </div>
            </div>
          </div>

          {/* 추천 강의 */}
          <div className="stat-card !p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("dashboard.recommendedCourses")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dashboard.recommendedDesc")}</p>
            </div>
            {recommendedCourses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">{t("dashboard.noRecommended")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedCourses.map((course: any) => (
                  <div key={course.id} className="stat-card !p-3 sm:!p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4" role="article" aria-label={course.title}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{course.title}</h3>
                      <p className="text-xs text-muted-foreground">{recInstructorMap.get(course.instructor_id) || t("dashboard.instructor")}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                        <span>{(recEnrollCountMap.get(course.id) || 0).toLocaleString()} {t("dashboard.students")}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 rounded-full w-full sm:w-auto"
                      onClick={() => navigate(`/student/courses/${course.id}?view=learn`)}
                      aria-label={`${course.title} - ${t("common.details")}`}
                    >
                      {t("common.details")}
                    </Button>
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

export default StudentDashboard;
