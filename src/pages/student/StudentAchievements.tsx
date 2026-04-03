import { Award, Flame, Star, Target, TrendingUp, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";

const badges = [
  { name: "첫 걸음", description: "첫 번째 강의 완료", icon: Star, earned: true },
  { name: "꾸준함", description: "7일 연속 학습", icon: Flame, earned: true },
  { name: "탐구자", description: "3개 강좌 수료", icon: Target, earned: true },
  { name: "우수 학습자", description: "과제 평균 90점 이상", icon: Award, earned: true },
  { name: "마스터", description: "5개 강좌 수료", icon: Zap, earned: false },
  { name: "완벽주의자", description: "모든 과제 만점", icon: Star, earned: false },
];

const leaderboard = [
  { rank: 1, name: "김서연", points: 1240, level: 8 },
  { rank: 2, name: "이민지", points: 1180, level: 7 },
  { rank: 3, name: "박준혁", points: 950, level: 6 },
  { rank: 4, name: "정우진", points: 820, level: 5 },
  { rank: 5, name: "최예린", points: 780, level: 5 },
];

const StudentAchievements = () => {
  const { profile } = useUser();

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">성취</h1>
          <p className="text-muted-foreground mt-1">나의 학습 성과와 보상을 확인하세요.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card text-center">
            <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">Lv.5</p>
            <p className="text-xs text-muted-foreground mt-1">현재 레벨</p>
          </div>
          <div className="stat-card text-center">
            <Zap className="h-5 w-5 text-warning mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">820</p>
            <p className="text-xs text-muted-foreground mt-1">총 포인트</p>
          </div>
          <div className="stat-card text-center">
            <Flame className="h-5 w-5 text-destructive mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">12</p>
            <p className="text-xs text-muted-foreground mt-1">연속 학습일</p>
          </div>
          <div className="stat-card text-center">
            <Award className="h-5 w-5 text-success mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">4</p>
            <p className="text-xs text-muted-foreground mt-1">획득 뱃지</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">다음 레벨까지</span>
            <span className="text-xs text-muted-foreground">820 / 1000 XP</span>
          </div>
          <Progress value={82} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">뱃지 컬렉션</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.name}
                  className={`stat-card text-center !p-4 ${!badge.earned ? "opacity-40 grayscale" : ""}`}
                >
                  <badge.icon className={`h-8 w-8 mx-auto mb-2 ${badge.earned ? "text-warning" : "text-muted-foreground"}`} />
                  <h3 className="text-sm font-medium text-foreground">{badge.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                  {badge.earned && <p className="text-[10px] text-success font-medium mt-1.5">획득 완료</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">리더보드</h2>
            <div className="stat-card !p-0 divide-y divide-border">
              {leaderboard.map((user) => (
                <div key={user.rank} className="p-3 flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center ${user.rank <= 3 ? "text-warning" : "text-muted-foreground"}`}>
                    {user.rank}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                    {user.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">Lv.{user.level}</p>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{user.points}pt</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentAchievements;
