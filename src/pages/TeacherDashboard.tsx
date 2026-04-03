import {
  BookOpen, Users, ClipboardCheck, TrendingUp, ArrowRight, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

const TeacherDashboard = () => {
  const { user, profile } = useUser();
  const displayName = profile?.full_name || "강사";

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-dash-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: allCourseIds = [] } = useQuery({
    queryKey: ["teacher-all-course-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id")
        .eq("instructor_id", user!.id);
      if (error) throw error;
      return data.map((c) => c.id);
    },
    enabled: !!user?.id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["teacher-dash-enrollments", allCourseIds],
    queryFn: async () => {
      if (allCourseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, progress")
        .in("course_id", allCourseIds);
      if (error) throw error;
      return data;
    },
    enabled: allCourseIds.length > 0,
  });

  const { data: pendingSubmissions = [] } = useQuery({
    queryKey: ["teacher-dash-pending", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title, courses(title, instructor_id))")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).filter((s: any) => s.assignments?.courses?.instructor_id === user!.id);
    },
    enabled: !!user?.id,
  });

  const { data: submitterProfiles = [] } = useQuery({
    queryKey: ["teacher-dash-profiles", pendingSubmissions.map((s: any) => s.student_id)],
    queryFn: async () => {
      const ids = [...new Set(pendingSubmissions.map((s: any) => s.student_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: pendingSubmissions.length > 0,
  });

  const profileMap = new Map(submitterProfiles.map((p: any) => [p.user_id, p.full_name]));
  const uniqueStudents = new Set(enrollments.map((e) => e.course_id + "-student")).size;
  const totalStudents = enrollments.length;
  const avgCompletion = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (Number(e.progress) || 0), 0) / enrollments.length)
    : 0;

  const enrollmentCountMap = new Map<string, number>();
  enrollments.forEach((e) => {
    enrollmentCountMap.set(e.course_id, (enrollmentCountMap.get(e.course_id) || 0) + 1);
  });

  const stats = [
    { label: "담당 강좌", value: String(allCourseIds.length), sub: "개", icon: BookOpen },
    { label: "수강생", value: String(totalStudents), sub: "명", icon: Users },
    { label: "미채점 과제", value: String(pendingSubmissions.length), sub: "건", icon: ClipboardCheck },
    { label: "평균 수료율", value: String(avgCompletion), sub: "%", icon: TrendingUp },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">안녕하세요, {displayName}님</h1>
          <p className="text-muted-foreground mt-1">강좌 및 수강생 현황을 확인하세요.</p>
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
            <div className="flex items-center justify-between h-9">
              <h2 className="text-lg font-semibold text-foreground">내 강좌</h2>
              <Link to="/teacher/courses">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  전체보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            {courses.length === 0 ? (
              <div className="stat-card text-center py-8">
                <p className="text-sm text-muted-foreground">담당 강좌가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course: any) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <div className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                      <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {enrollmentCountMap.get(course.id) || 0}명
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between h-9">
              <h2 className="text-lg font-semibold text-foreground">미채점 과제</h2>
              {pendingSubmissions.length > 0 && (
                <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                  {pendingSubmissions.length}건
                </span>
              )}
            </div>
            {pendingSubmissions.length === 0 ? (
              <div className="stat-card text-center py-6">
                <p className="text-sm text-muted-foreground">미채점 과제가 없습니다.</p>
              </div>
            ) : (
              <div className="stat-card !p-0 divide-y divide-border">
                {pendingSubmissions.map((sub: any) => (
                  <div key={sub.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{profileMap.get(sub.student_id) || "학생"}</span>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">{sub.assignments?.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground/60">{sub.assignments?.courses?.title}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("ko-KR") : ""}
                      </p>
                    </div>
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

export default TeacherDashboard;
