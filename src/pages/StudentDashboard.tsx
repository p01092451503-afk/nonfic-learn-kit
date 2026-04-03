import {
  BookOpen, Clock, Target, TrendingUp, Play, Award, Flame, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

const StudentDashboard = () => {
  const { user, profile } = useUser();
  const displayName = profile?.full_name || "사용자";

  const { data: enrollments = [] } = useQuery({
    queryKey: ["dash-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(id, title, difficulty_level)")
        .eq("user_id", user!.id)
        .is("completed_at", null)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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
      const avgProgress = total > 0 ? Math.round(data.reduce((s, e) => s + (Number(e.progress) || 0), 0) / total) : 0;
      return { total, completed, inProgress: total - completed, avgProgress };
    },
    enabled: !!user?.id,
  });

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

  const { data: recentPoints = [] } = useQuery({
    queryKey: ["dash-recent-points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_history")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  const stats = [
    { label: "수강 중", value: String(enrollmentStats?.inProgress || 0), sub: "강좌", icon: BookOpen },
    { label: "완료율", value: String(enrollmentStats?.avgProgress || 0), sub: "%", icon: Target },
    { label: "총 포인트", value: String(gamification?.total_points || 0), sub: "pt", icon: Clock },
    { label: "연속 학습", value: String(gamification?.streak_days || 0), sub: "일", icon: Flame },
  ];

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">안녕하세요, {displayName}님</h1>
          <p className="text-muted-foreground mt-1">오늘도 한 걸음 성장해봐요.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <TrendingUp className="h-3.5 w-3.5 text-success" />
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
              <h2 className="text-lg font-semibold text-foreground">수강 중인 강좌</h2>
              <Link to="/dashboard/courses">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  전체보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            {enrollments.length === 0 ? (
              <div className="stat-card text-center py-8">
                <p className="text-sm text-muted-foreground">수강 중인 강좌가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment: any) => (
                  <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`}>
                    <div className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                      <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <Play className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{enrollment.courses?.title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <Progress value={Number(enrollment.progress) || 0} className="flex-1 h-1.5" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {Math.round(Number(enrollment.progress) || 0)}%
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
            <h2 className="text-lg font-semibold text-foreground">최근 활동</h2>
            {recentPoints.length === 0 ? (
              <div className="stat-card text-center py-6">
                <p className="text-sm text-muted-foreground">최근 활동이 없습니다.</p>
              </div>
            ) : (
              <div className="stat-card !p-0 divide-y divide-border">
                {recentPoints.map((activity: any) => (
                  <div key={activity.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{activity.action_type}</span>
                      <span className="text-xs font-semibold text-success">+{activity.points}</span>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(activity.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="stat-card space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">나의 성취</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{gamification?.total_points || 0}</p>
                  <p className="text-[10px] text-muted-foreground">포인트</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">Lv.{gamification?.level || 1}</p>
                  <p className="text-[10px] text-muted-foreground">레벨</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{badgeCount}</p>
                  <p className="text-[10px] text-muted-foreground">뱃지</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
