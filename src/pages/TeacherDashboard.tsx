import {
  BookOpen, Users, ClipboardCheck, TrendingUp, ArrowRight, Clock, Plus, LayoutDashboard,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const TeacherDashboard = () => {
  const { user, profile } = useUser();
  const navigate = useNavigate();

  // All courses
  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-dash-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const courseIds = courses.map((c: any) => c.id);

  // Enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ["teacher-dash-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, user_id, progress, completed_at")
        .in("course_id", courseIds);
      if (error) throw error;
      return data;
    },
    enabled: courseIds.length > 0,
  });

  // Recent submissions
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

  // Submitter profiles
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

  // Computed stats
  const totalStudents = enrollments.length;
  const publishedCourses = courses.filter((c: any) => c.status === "published").length;
  const draftCourses = courses.filter((c: any) => c.status !== "published").length;
  const pendingSubmissions = recentSubmissions.filter((s: any) => s.status === "submitted");

  const enrollmentCountMap = new Map<string, number>();
  enrollments.forEach((e: any) => {
    enrollmentCountMap.set(e.course_id, (enrollmentCountMap.get(e.course_id) || 0) + 1);
  });

  const stats = [
    { label: "전체 학생", value: totalStudents, sub: "내 강좌 수강생", icon: Users, color: "text-primary" },
    { label: "활성 강의", value: publishedCourses, sub: `대기 중 ${draftCourses}개`, icon: BookOpen, color: "text-primary" },
    { label: "전체 강좌", value: courses.length, sub: "등록한 강좌", icon: LayoutDashboard, color: "text-primary" },
    { label: "최근 제출", value: pendingSubmissions.length, sub: "최근 과제 제출", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" /> 강사 대시보드
            </h1>
            <p className="text-sm text-muted-foreground mt-1">학생들의 학습을 관리하고 분석하세요</p>
          </div>
          <Button size="sm" className="gap-1.5 h-9" onClick={() => navigate("/teacher/courses/create")}>
            <Plus className="h-3.5 w-3.5" /> 새 강의 만들기
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-primary mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* My Courses section */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">내 강의</h2>
              <p className="text-xs text-muted-foreground">강의를 관리하고 학생들의 진행상황을 확인하세요</p>
            </div>
            <Link to="/teacher/courses">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                전체보기 <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">등록된 강좌가 없습니다. 새 강의를 만들어보세요!</p>
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
                  <Link key={course.id} to={`/courses/${course.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/20 transition-colors group">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="" className="h-10 w-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-accent flex items-center justify-center shrink-0">
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
                          {course.status === "published" ? "공개" : "비공개"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground"><Users className="h-3 w-3 inline mr-0.5" />{studentCount}명</span>
                        <span className="text-[11px] text-muted-foreground">진행률 {avgProgress}%</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom row: Recent submissions + Course stats */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent submissions */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">최근 과제 제출</h2>
            </div>
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardCheck className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">최근 제출된 과제가 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSubmissions.slice(0, 5).map((sub: any) => (
                  <div key={sub.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {(profileMap.get(sub.student_id) || "학")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{profileMap.get(sub.student_id) || "학생"}</p>
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
                        {sub.status === "submitted" ? "미채점" : sub.status === "graded" ? "채점완료" : "반환"}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {sub.submitted_at ? formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true, locale: ko }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Course stats */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">강좌 통계</h2>
              <p className="text-xs text-muted-foreground">내 강좌 현황</p>
            </div>
            <div className="px-5 py-3 space-y-0">
              {[
                { label: "전체 강좌", value: `${courses.length}개` },
                { label: "활성 강좌", value: `${publishedCourses}개` },
                { label: "전체 수강생", value: `${totalStudents}명` },
                { label: "대기 중 강좌", value: `${draftCourses}개` },
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
