import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const CourseStatsCard = () => {
  const { data: courses = [] } = useQuery({
    queryKey: ["stat-courses-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, is_mandatory, deadline");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["stat-enrollments-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, progress, completed_at, status");
      if (error) throw error;
      return data;
    },
  });

  const totalCourses = courses.length;
  const published = courses.filter((c: any) => c.status === "published").length;
  const draft = courses.filter((c: any) => c.status === "draft").length;
  const mandatory = courses.filter((c: any) => c.is_mandatory).length;

  const totalEnrollments = enrollments.length;
  const completed = enrollments.filter((e: any) => e.completed_at).length;
  const completionRate = totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0;
  const avgProgress = totalEnrollments > 0
    ? Math.round(enrollments.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / totalEnrollments)
    : 0;

  const pendingEnrollments = enrollments.filter((e: any) => e.status === "pending").length;
  const approvedEnrollments = enrollments.filter((e: any) => e.status === "approved").length;

  // Top courses by enrollment
  const courseEnrollMap = new Map<string, { count: number; completions: number }>();
  enrollments.forEach((e: any) => {
    const entry = courseEnrollMap.get(e.course_id) || { count: 0, completions: 0 };
    entry.count++;
    if (e.completed_at) entry.completions++;
    courseEnrollMap.set(e.course_id, entry);
  });

  const topCourses = courses
    .map((c: any) => ({
      title: c.title,
      ...courseEnrollMap.get(c.id) || { count: 0, completions: 0 },
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm font-medium">강의 현황</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "총 강의 수", value: `${totalCourses}개` },
            { label: "게시된 강의", value: `${published}개` },
            { label: "필수 교육", value: `${mandatory}개` },
            { label: "임시저장", value: `${draft}개` },
          ].map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "총 수강생", value: `${totalEnrollments}명` },
            { label: "이수 완료", value: `${completed}명` },
            { label: "평균 진도율", value: `${avgProgress}%` },
            { label: "이수율", value: `${completionRate}%` },
          ].map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">수강생 기준 인기 강의 TOP 5</p>
          <div className="space-y-2">
            {topCourses.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{c.title}</p>
                  <Progress value={topCourses[0]?.count > 0 ? (c.count / topCourses[0].count) * 100 : 0} className="h-1.5 mt-1" />
                </div>
                <span className="text-xs font-semibold text-foreground shrink-0">{c.count}명</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <div className="text-center flex-1">
            <p className="text-[10px] text-muted-foreground">수강 대기</p>
            <p className="text-sm font-bold text-foreground">{pendingEnrollments}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] text-muted-foreground">수강 승인</p>
            <p className="text-sm font-bold text-foreground">{approvedEnrollments}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseStatsCard;
