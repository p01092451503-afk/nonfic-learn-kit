import {
  Users, BookOpen, TrendingUp, Activity, ArrowRight, Shield,
  BarChart3, UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { profile } = useUser();
  const displayName = profile?.full_name || "관리자";

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
      const { data, error } = await supabase.from("courses").select("id, title, status, instructor_id").order("created_at", { ascending: false });
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

  const { data: recentProfiles = [] } = useQuery({
    queryKey: ["admin-dash-recent-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, department, created_at").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const activeCourses = courses.filter((c: any) => c.status === "published").length;
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

  const stats = [
    { label: "전체 사용자", value: String(profileCount), sub: "명", icon: Users },
    { label: "활성 강좌", value: String(activeCourses), sub: "개", icon: BookOpen },
    { label: "평균 수료율", value: String(avgCompletion), sub: "%", icon: TrendingUp },
    { label: "총 수강", value: String(enrollments.length), sub: "건", icon: Activity },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground mt-1">{displayName}님, 시스템 현황을 확인하세요.</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin</span>
          </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">강좌 현황</h2>
              <Link to="/admin/courses">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  전체보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            {topCourses.length === 0 ? (
              <div className="stat-card text-center py-8">
                <p className="text-sm text-muted-foreground">강좌가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCourses.map((course: any) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <div className="stat-card flex items-center gap-4 !p-4 cursor-pointer group">
                      <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <BarChart3 className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                        {course.enrollment && (
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={course.enrollment.avgProgress} className="flex-1 h-1.5" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{course.enrollment.avgProgress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">{course.enrollment?.count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">수강생</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">최근 가입</h2>
              <Link to="/admin/users">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {recentProfiles.length === 0 ? (
              <div className="stat-card text-center py-6">
                <p className="text-sm text-muted-foreground">최근 가입자가 없습니다.</p>
              </div>
            ) : (
              <div className="stat-card !p-0 divide-y divide-border">
                {recentProfiles.map((rp: any) => (
                  <div key={rp.user_id} className="p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                      {(rp.full_name || "?").slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rp.full_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{rp.department || "-"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {rp.created_at ? new Date(rp.created_at).toLocaleDateString("ko-KR") : ""}
                    </span>
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

export default AdminDashboard;
