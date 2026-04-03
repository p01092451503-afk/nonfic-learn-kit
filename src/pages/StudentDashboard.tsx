import {
  BookOpen, Clock, ClipboardCheck, Award, Play, ArrowRight, TrendingUp, BarChart3, Star,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

const StudentDashboard = () => {
  const { user, profile } = useUser();
  const navigate = useNavigate();
  const displayName = profile?.full_name || "사용자";

  // 수강 중인 강좌 (진행 중)
  const { data: enrollments = [] } = useQuery({
    queryKey: ["dash-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(id, title, instructor_id, difficulty_level)")
        .eq("user_id", user!.id)
        .is("completed_at", null)
        .order("enrolled_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
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

  // 각 강좌의 다음 콘텐츠 조회
  const courseIds = enrollments.map((e: any) => e.course_id);
  const { data: courseContents = [] } = useQuery({
    queryKey: ["dash-course-contents", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("course_contents")
        .select("id, course_id, title, order_index")
        .in("course_id", courseIds)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
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

  // 추천 강의 (수강하지 않은 published 강좌)
  const { data: recommendedCourses = [] } = useQuery({
    queryKey: ["dash-recommended", user?.id],
    queryFn: async () => {
      const { data: enrolledData } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      const enrolledIds = (enrolledData || []).map((e) => e.course_id);

      let query = supabase
        .from("courses")
        .select("id, title, instructor_id")
        .eq("status", "published")
        .limit(3);

      if (enrolledIds.length > 0) {
        // Filter out enrolled courses - use not.in
        const { data, error } = await supabase
          .from("courses")
          .select("id, title, instructor_id")
          .eq("status", "published")
          .not("id", "in", `(${enrolledIds.join(",")})`)
          .limit(3);
        if (error) throw error;
        return data || [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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

  const stats = [
    { label: "수강 중인 강의", value: String(enrollmentStats?.inProgress || 0), sub: "진행 중", icon: BookOpen },
    { label: "수강 완료", value: String(enrollmentStats?.completed || 0), sub: `총 ${enrollmentStats?.total || 0}개 강좌 중`, icon: ClipboardCheck },
    { label: "학습 시간", value: `${gamification?.experience_points ? Math.round(gamification.experience_points / 60) : 0}h`, sub: "누적 학습", icon: Clock },
    { label: "획득 뱃지", value: String(badgeCount), sub: "획득한 배지", icon: Award },
  ];

  const detailStats = [
    { label: "연속 학습", value: `${gamification?.streak_days || 0}일`, sub: "연속 출석일", icon: TrendingUp },
    { label: "레벨", value: `Lv.${gamification?.level || 1}`, sub: `${gamification?.experience_points || 0} XP`, icon: Star },
    { label: "완료한 과제", value: String(completedAssignments), sub: `총 ${totalAssignments}개 중`, icon: ClipboardCheck },
    { label: "총 포인트", value: String(gamification?.total_points || 0), sub: "누적 포인트", icon: Award },
  ];

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            학습 대시보드
          </h1>
          <p className="text-muted-foreground mt-1">안녕하세요! 오늘도 열심히 학습해봅시다</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Detail Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {detailStats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
        <div className="stat-card !p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">진행 중인 강의</h2>
            <p className="text-sm text-muted-foreground mt-0.5">계속해서 학습을 진행하세요</p>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">수강 중인 강좌가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment: any) => {
                const nextContent = getNextContent(enrollment.course_id);
                const progress = Math.round(Number(enrollment.progress) || 0);
                const instructorName = instructorMap.get(enrollment.courses?.instructor_id) || "강사";

                return (
                  <div key={enrollment.id} className="stat-card !p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {enrollment.courses?.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{instructorName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0 rounded-full"
                        onClick={() => {
                          if (nextContent) {
                            navigate(`/courses/${enrollment.course_id}/content/${nextContent.id}`);
                          } else {
                            navigate(`/courses/${enrollment.course_id}`);
                          }
                        }}
                      >
                        <Play className="h-3.5 w-3.5" /> 계속하기
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">진행률</span>
                        <span className="font-semibold text-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2.5" />
                    </div>

                    {nextContent && (
                      <p className="text-xs text-muted-foreground">
                        다음: {nextContent.title}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 학습 통계 + 추천 강의 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 학습 통계 */}
          <div className="stat-card !p-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> 학습 통계
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">주간 목표</span>
                  <span className="font-semibold text-foreground">
                    {gamification?.experience_points ? Math.round(gamification.experience_points / 60) : 0}h / 20h
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((gamification?.experience_points ? gamification.experience_points / 60 : 0) / 20) * 100)}
                  className="h-3"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">과제 완료율</span>
                  <span className="font-semibold text-foreground">{assignmentCompletionRate}%</span>
                </div>
                <Progress value={assignmentCompletionRate} className="h-3" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">평균 점수</span>
                  <span className="font-semibold text-foreground">{enrollmentStats?.avgProgress || 0}점</span>
                </div>
                <Progress value={enrollmentStats?.avgProgress || 0} className="h-3" />
              </div>
            </div>
          </div>

          {/* 추천 강의 */}
          <div className="stat-card !p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">추천 강의</h2>
              <p className="text-sm text-muted-foreground mt-0.5">학습 패턴을 분석하여 추천합니다</p>
            </div>
            {recommendedCourses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">추천 강의가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedCourses.map((course: any) => (
                  <div key={course.id} className="stat-card !p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{course.title}</h3>
                      <p className="text-xs text-muted-foreground">{recInstructorMap.get(course.instructor_id) || "강사"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{(recEnrollCountMap.get(course.id) || 0).toLocaleString()} 수강생</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 rounded-full"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      자세히 보기
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
