import {
  BookOpen, Clock, Target, TrendingUp, Play, Award, Flame, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";

const stats = [
  { label: "수강 중", value: "4", sub: "강좌", icon: BookOpen },
  { label: "완료율", value: "67", sub: "%", icon: Target },
  { label: "학습 시간", value: "24", sub: "시간", icon: Clock },
  { label: "연속 학습", value: "5", sub: "일", icon: Flame },
];

const courses = [
  { title: "브랜드 마케팅 기초", category: "마케팅", progress: 75, lessons: 12, completed: 9 },
  { title: "향수 원료학 심화", category: "제품", progress: 45, lessons: 8, completed: 4 },
  { title: "고객 경험 디자인", category: "CX", progress: 90, lessons: 10, completed: 9 },
  { title: "비주얼 머천다이징", category: "디자인", progress: 20, lessons: 15, completed: 3 },
];

const recentActivities = [
  { action: "강의 완료", detail: "브랜드 마케팅 기초 - 5강", time: "2시간 전", points: "+10" },
  { action: "과제 제출", detail: "향수 원료학 심화 - 중간 과제", time: "어제", points: "+8" },
  { action: "뱃지 획득", detail: "꾸준함 뱃지", time: "3일 전", points: "" },
];

const StudentDashboard = () => {
  const { profile } = useUser();
  const displayName = profile?.full_name || "사용자";

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            안녕하세요, {displayName}님
          </h1>
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
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                전체보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.title} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <Play className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded-full">
                        {course.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={course.progress} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {course.completed}/{course.lessons}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">최근 활동</h2>
            <div className="stat-card !p-0 divide-y divide-border">
              {recentActivities.map((activity, i) => (
                <div key={i} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{activity.action}</span>
                    {activity.points && <span className="text-xs font-semibold text-success">{activity.points}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  <p className="text-[10px] text-muted-foreground/60">{activity.time}</p>
                </div>
              ))}
            </div>

            <div className="stat-card space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">나의 성취</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">280</p>
                  <p className="text-[10px] text-muted-foreground">포인트</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">Lv.3</p>
                  <p className="text-[10px] text-muted-foreground">레벨</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">4</p>
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
