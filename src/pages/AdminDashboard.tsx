import {
  Users, BookOpen, TrendingUp, Activity, ArrowRight, Shield,
  BarChart3, UserPlus, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";

const stats = [
  { label: "전체 사용자", value: "128", sub: "명", icon: Users, trend: "+12" },
  { label: "활성 강좌", value: "24", sub: "개", icon: BookOpen, trend: "+3" },
  { label: "이번 달 수료율", value: "78", sub: "%", icon: TrendingUp, trend: "+5%" },
  { label: "오늘 접속자", value: "42", sub: "명", icon: Activity, trend: "+8" },
];

const recentUsers = [
  { name: "김서연", department: "마케팅팀", role: "학습자", joinedAt: "오늘" },
  { name: "박준혁", department: "디자인팀", role: "학습자", joinedAt: "어제" },
  { name: "이민지", department: "제품개발팀", role: "강사", joinedAt: "3일 전" },
  { name: "정우진", department: "영업팀", role: "학습자", joinedAt: "5일 전" },
];

const courseStats = [
  { title: "브랜드 마케팅 기초", enrolled: 45, completion: 72, status: "active" },
  { title: "향수 원료학 심화", enrolled: 28, completion: 58, status: "active" },
  { title: "고객 경험 디자인", enrolled: 36, completion: 85, status: "active" },
  { title: "비주얼 머천다이징", enrolled: 52, completion: 34, status: "active" },
];

const alerts = [
  { message: "미승인 신규 가입 3건", type: "warning", time: "1시간 전" },
  { message: "서버 스토리지 사용량 85%", type: "info", time: "3시간 전" },
];

const AdminDashboard = () => {
  const { profile } = useUser();
  const displayName = profile?.full_name || "관리자";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              관리자 대시보드
            </h1>
            <p className="text-muted-foreground mt-1">
              {displayName}님, 시스템 현황을 확인하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin</span>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <span className="text-sm text-foreground flex-1">{alert.message}</span>
                <span className="text-xs text-muted-foreground">{alert.time}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-success">{stat.trend}</span>
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
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                전체보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {courseStats.map((course) => (
                <div key={course.title} className="stat-card flex items-center gap-4 !p-4">
                  <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={course.completion} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {course.completion}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{course.enrolled}</p>
                    <p className="text-[10px] text-muted-foreground">수강생</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">최근 가입</h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="stat-card !p-0 divide-y divide-border">
              {recentUsers.map((user, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                    {user.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.department}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{user.joinedAt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
