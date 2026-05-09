import {
  BookOpen, Users, ClipboardCheck, TrendingUp, ArrowRight, Clock, Plus, LayoutDashboard,
  Target, Activity, CheckCircle2, FileText,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import StatCard from "@/components/ui/stat-card";
import DonutChart from "@/components/dashboard/DonutChart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import RadialProgress from "@/components/dashboard/RadialProgress";
import PeriodFilter, { type Period, periodToDays } from "@/components/dashboard/PeriodFilter";
import { useState } from "react";

const TeacherDashboard = () => {
  const { user, profile } = useUser();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language?.startsWith("en") ? enUS : ko;
  const [coursePeriod, setCoursePeriod] = useState<Period>("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-dash-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("instructor_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const courseIds = courses.map((c: any) => c.id);

  const { data: enrollments = [] } = useQuery({
    queryKey: ["teacher-dash-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase.from("enrollments").select("course_id, user_id, progress, completed_at, enrolled_at").in("course_id", courseIds);
      if (error) throw error;
      return data;
    },
    enabled: courseIds.length > 0,
  });

  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ["teacher-dash-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title, course_id, courses(title, instructor_id))")
        .order("submitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []).filter((s: any) => s.assignments?.courses?.instructor_id === user!.id);
    },
    enabled: !!user?.id,
  });

  const { data: submitterProfiles = [] } = useQuery({
    queryKey: ["teacher-dash-profiles", recentSubmissions.map((s: any) => s.student_id)],
    queryFn: async () => {
      const ids = [...new Set(recentSubmissions.map((s: any) => s.student_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: recentSubmissions.length > 0,
  });

  const profileMap = new Map(submitterProfiles.map((p: any) => [p.user_id, p.full_name]));

  // ── Role widgets: 수강생 현황 / 과제 처리율 / 평가 통계 (강사 담당 강의 한정) ──
  const { data: teacherInsights } = useQuery({
    queryKey: ["teacher-insights", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) {
        return {
          assignmentTotal: 0, assignmentGraded: 0, assignmentPending: 0, assignmentRate: 0,
          assessTotal: 0, assessCompleted: 0, assessPassed: 0, assessAvg: 0, assessPassRate: 0,
          activeLearners: 0, completedLearners: 0,
        };
      }
      // assignments under teacher's courses
      const { data: asns } = await supabase
        .from("assignments")
        .select("id")
        .in("course_id", courseIds);
      const asnIds = (asns || []).map((a: any) => a.id);
      let assignmentTotal = 0, assignmentGraded = 0, assignmentPending = 0;
      if (asnIds.length > 0) {
        const [tRes, gRes, pRes] = await Promise.all([
          supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).in("assignment_id", asnIds),
          supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).in("assignment_id", asnIds).eq("status", "graded"),
          supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).in("assignment_id", asnIds).eq("status", "submitted"),
        ]);
        assignmentTotal = tRes.count || 0;
        assignmentGraded = gRes.count || 0;
        assignmentPending = pRes.count || 0;
      }

      // assessments under teacher's courses
      const { data: asses } = await supabase
        .from("assessments")
        .select("id")
        .in("course_id", courseIds);
      const assIds = (asses || []).map((a: any) => a.id);
      let assTotal = 0, assCompleted = 0, assPassed = 0, assAvg = 0;
      if (assIds.length > 0) {
        const [aT, aC, aP, aS] = await Promise.all([
          supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).in("assessment_id", assIds),
          supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).in("assessment_id", assIds).not("completed_at", "is", null),
          supabase.from("assessment_attempts").select("*", { count: "exact", head: true }).in("assessment_id", assIds).eq("passed", true),
          supabase.from("assessment_attempts").select("score").in("assessment_id", assIds).not("score", "is", null).limit(1000),
        ]);
        assTotal = aT.count || 0;
        assCompleted = aC.count || 0;
        assPassed = aP.count || 0;
        const sc = (aS.data || []).map((r: any) => Number(r.score) || 0);
        assAvg = sc.length > 0 ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0;
      }

      return {
        assignmentTotal, assignmentGraded, assignmentPending,
        assignmentRate: assignmentTotal > 0 ? Math.round((assignmentGraded / assignmentTotal) * 100) : 0,
        assessTotal: assTotal, assessCompleted: assCompleted, assessPassed: assPassed, assessAvg: assAvg,
        assessPassRate: assCompleted > 0 ? Math.round((assPassed / assCompleted) * 100) : 0,
      };
    },
    enabled: courseIds.length > 0,
    staleTime: 60_000,
  });

  const completedLearners = enrollments.filter((e: any) => e.completed_at).length;
  const activeLearners = enrollments.filter((e: any) => !e.completed_at && Number(e.progress) > 0).length;
  const notStartedLearners = Math.max(0, enrollments.length - completedLearners - activeLearners);

  const totalStudents = enrollments.length;
  const publishedCourses = courses.filter((c: any) => c.status === "published").length;
  const draftCourses = courses.filter((c: any) => c.status !== "published").length;
  const pendingSubmissions = recentSubmissions.filter((s: any) => s.status === "submitted");
  const gradedSubmissions = recentSubmissions.filter((s: any) => s.status === "graded");
  const returnedSubmissions = recentSubmissions.filter((s: any) => s.status !== "submitted" && s.status !== "graded");

  const enrollmentCountMap = new Map<string, number>();
  enrollments.forEach((e: any) => {
    enrollmentCountMap.set(e.course_id, (enrollmentCountMap.get(e.course_id) || 0) + 1);
  });

  // Per-course enrollment + avg progress for visualization
  const courseSinceMs = coursePeriod === "all" ? 0 : Date.now() - periodToDays(coursePeriod) * 86400000;
  const filteredEnrollments = coursePeriod === "all"
    ? enrollments
    : enrollments.filter((e: any) => e.enrolled_at && new Date(e.enrolled_at).getTime() >= courseSinceMs);
  const courseChartData = courses.slice(0, 8).map((c: any) => {
    const list = filteredEnrollments.filter((e: any) => e.course_id === c.id);
    const avg = list.length > 0
      ? Math.round(list.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / list.length)
      : 0;
    return {
      label: c.title?.length > 10 ? c.title.slice(0, 10) + "…" : c.title,
      students: list.length,
      progress: avg,
    };
  });

  const overallAvgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / enrollments.length)
    : 0;

  const submissionMix = [
    { label: t("teacher.ungraded"), value: pendingSubmissions.length, color: "hsl(var(--chart-4))" },
    { label: t("teacher.graded"), value: gradedSubmissions.length, color: "hsl(var(--chart-2))" },
    { label: t("teacher.returned"), value: returnedSubmissions.length, color: "hsl(var(--muted-foreground))" },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" aria-hidden="true" /> {t("teacher.teacherDashboard")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("teacher.manageStudents")}</p>
          </div>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label={t("teacher.teacherDashboard")}>
          <StatCard label={t("teacher.totalStudents")} value={totalStudents} icon={Users} tone="primary" hint={t("teacher.myStudents")} />
          <StatCard label={t("teacher.activeCourses")} value={publishedCourses} icon={BookOpen} tone="success" hint={t("teacher.waitingCount", { count: draftCourses })} />
          <StatCard label={t("teacher.allCourses")} value={courses.length} icon={LayoutDashboard} tone="info" hint={t("teacher.registeredCourses")} />
          <StatCard label={t("teacher.recentSubmissions")} value={pendingSubmissions.length} icon={TrendingUp} tone="warning" hint={t("teacher.recentAssignmentSub")} />
        </section>

        {/* Role Insight Widgets: 수강생 현황 / 과제 처리율 / 평가 통계 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label={t("teacher.teacherDashboard")}>
          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {i18n.language?.startsWith("en") ? "Learner Status" : "수강생 현황"}
            </h3>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-bold text-foreground leading-none">{enrollments.length}</span>
              <span className="text-xs text-muted-foreground mb-1">{i18n.language?.startsWith("en") ? "total enrollments" : "전체 수강"}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-chart-3" />{i18n.language?.startsWith("en") ? "Active" : "학습 중"}</span>
                <span className="font-semibold text-foreground">{activeLearners}{t("common.people")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />{i18n.language?.startsWith("en") ? "Completed" : "수료"}</span>
                <span className="font-semibold text-chart-2">{completedLearners}{t("common.people")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{i18n.language?.startsWith("en") ? "Not started" : "미시작"}</span>
                <span className="font-semibold text-foreground">{notStartedLearners}{t("common.people")}</span>
              </div>
            </div>
          </div>

          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {i18n.language?.startsWith("en") ? "Assignment Processing" : "과제 처리율"}
            </h3>
            <div className="flex items-center justify-center mb-3">
              <RadialProgress value={teacherInsights?.assignmentRate ?? 0} label={i18n.language?.startsWith("en") ? "Graded" : "채점률"} size={130} color="hsl(var(--chart-2))" />
            </div>
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{i18n.language?.startsWith("en") ? "Total" : "총 제출"}</span>
                <span className="font-semibold text-foreground">{teacherInsights?.assignmentTotal ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("teacher.graded")}</span>
                <span className="font-semibold text-chart-2">{teacherInsights?.assignmentGraded ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("teacher.ungraded")}</span>
                <span className="font-semibold text-amber-600">{teacherInsights?.assignmentPending ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="stat-card !p-5 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              {i18n.language?.startsWith("en") ? "Assessment Stats" : "평가 통계"}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">{i18n.language?.startsWith("en") ? "Pass rate" : "합격률"}</p>
                <p className="text-2xl font-bold text-chart-3 mt-0.5">{teacherInsights?.assessPassRate ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">{i18n.language?.startsWith("en") ? "Avg score" : "평균 점수"}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{teacherInsights?.assessAvg ?? 0}</p>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{i18n.language?.startsWith("en") ? "Total attempts" : "총 응시"}</span>
                <span className="font-semibold text-foreground">{teacherInsights?.assessTotal ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />{i18n.language?.startsWith("en") ? "Passed" : "합격"}</span>
                <span className="font-semibold text-chart-2">{teacherInsights?.assessPassed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{i18n.language?.startsWith("en") ? "Completed" : "완료"}</span>
                <span className="font-semibold text-foreground">{teacherInsights?.assessCompleted ?? 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Visualization row: per-course enrollment + avg progress · submission mix · overall progress */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="stat-card !p-5 lg:col-span-2 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                {t("teacher.myCoursesList")}
              </h3>
              <PeriodFilter
                value={coursePeriod}
                onChange={setCoursePeriod}
                labels={i18n.language?.startsWith("en") ? undefined : { "7d": "7일", "30d": "30일", all: "전체" }}
              />
            </div>
            {courseChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">{t("teacher.noCourses")}</p>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={courseChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={6} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={28} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={32} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltip />} />
                    <Bar yAxisId="left" dataKey="students" name={t("teacher.totalStudents")} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="progress" name={t("dashboard.progressRate")} fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="stat-card !p-5 min-w-0 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              {t("teacher.recentSubmissionsTitle")}
            </h3>
            <DonutChart data={submissionMix} size={140} centerValue={recentSubmissions.length} centerLabel={t("teacher.recentSubmissions")} />
            <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-center">
              <RadialProgress value={overallAvgProgress} label={t("dashboard.progressRate")} size={120} color="hsl(var(--chart-2))" />
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("teacher.myCoursesList")}</h2>
              <p className="text-xs text-muted-foreground">{t("teacher.manageCourseDesc")}</p>
            </div>
            <Link to="/teacher/courses">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" aria-label={t("common.viewAll")}>
                {t("common.viewAll")} <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t("teacher.noCourses")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {courses.slice(0, 5).map((course: any) => {
                const studentCount = enrollmentCountMap.get(course.id) || 0;
                const courseEnrollments = enrollments.filter((e: any) => e.course_id === course.id);
                const avgProgress = courseEnrollments.length > 0
                  ? Math.round(courseEnrollments.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / courseEnrollments.length)
                  : 0;

                return (
                  <Link key={course.id} to={`/teacher/courses/${course.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/20 transition-colors group" aria-label={course.title}>
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="h-10 w-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-accent flex items-center justify-center shrink-0" aria-hidden="true">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{course.title}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] h-4 shrink-0 ${
                            course.status === "published"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {course.status === "published" ? t("teacher.published") : t("teacher.unpublished")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground"><Users className="h-3 w-3 inline mr-0.5" aria-hidden="true" />{studentCount}{t("common.people")}</span>
                        <span className="text-[11px] text-muted-foreground">{t("teacher.progressPercent", { percent: avgProgress })}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{t("teacher.recentSubmissionsTitle")}</h2>
            </div>
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardCheck className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t("teacher.noSubmissions")}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSubmissions.slice(0, 5).map((sub: any) => (
                  <div key={sub.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {(profileMap.get(sub.student_id) || t("teacher.student"))[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{profileMap.get(sub.student_id) || t("teacher.student")}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{sub.assignments?.title} · {sub.assignments?.courses?.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] ${
                          sub.status === "submitted"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : sub.status === "graded"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {sub.status === "submitted" ? t("teacher.ungraded") : sub.status === "graded" ? t("teacher.graded") : t("teacher.returned")}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {sub.submitted_at ? formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true, locale: dateFnsLocale }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{t("teacher.courseStats")}</h2>
              <p className="text-xs text-muted-foreground">{t("teacher.myCourseStatus")}</p>
            </div>
            <div className="px-5 py-3 space-y-0">
              {[
                { label: t("teacher.totalCoursesCount"), value: `${courses.length}${t("common.count")}` },
                { label: t("teacher.activeCoursesCount"), value: `${publishedCourses}${t("common.count")}` },
                { label: t("teacher.totalStudentsCount"), value: `${totalStudents}${t("common.people")}` },
                { label: t("teacher.waitingCoursesCount"), value: `${draftCourses}${t("common.count")}` },
              ].map((row, idx) => (
                <div key={row.label} className={`flex items-center justify-between py-3 ${idx > 0 ? "border-t border-border" : ""}`}>
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;