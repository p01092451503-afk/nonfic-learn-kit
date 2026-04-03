import {
  BookOpen, Users, ClipboardCheck, TrendingUp, ArrowRight,
  FileText, Clock, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUser } from "@/contexts/UserContext";

const stats = [
  { label: "담당 강좌", value: "6", sub: "개", icon: BookOpen },
  { label: "수강생", value: "87", sub: "명", icon: Users },
  { label: "미채점 과제", value: "12", sub: "건", icon: ClipboardCheck },
  { label: "평균 수료율", value: "73", sub: "%", icon: TrendingUp },
];

const myCourses = [
  { title: "브랜드 마케팅 기초", students: 45, avgProgress: 72, pendingAssignments: 5 },
  { title: "향수 원료학 심화", students: 28, avgProgress: 58, pendingAssignments: 3 },
  { title: "고객 경험 디자인", students: 36, avgProgress: 85, pendingAssignments: 2 },
];

const pendingSubmissions = [
  { student: "김서연", course: "브랜드 마케팅 기초", assignment: "중간 과제", submittedAt: "2시간 전" },
  { student: "박준혁", course: "향수 원료학 심화", assignment: "실습 과제 1", submittedAt: "5시간 전" },
  { student: "이민지", course: "브랜드 마케팅 기초", assignment: "중간 과제", submittedAt: "어제" },
  { student: "정우진", course: "고객 경험 디자인", assignment: "케이스 스터디", submittedAt: "어제" },
  { student: "최예린", course: "향수 원료학 심화", assignment: "실습 과제 1", submittedAt: "2일 전" },
];

const TeacherDashboard = () => {
  const { profile } = useUser();
  const displayName = profile?.full_name || "강사";

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            안녕하세요, {displayName}님
          </h1>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">내 강좌</h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                전체보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {myCourses.map((course) => (
                <div key={course.title} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {course.students}명
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" /> 미채점 {course.pendingAssignments}건
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={course.avgProgress} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        평균 {course.avgProgress}%
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">미채점 과제</h2>
              <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                {pendingSubmissions.length}건
              </span>
            </div>
            <div className="stat-card !p-0 divide-y divide-border">
              {pendingSubmissions.map((sub, i) => (
                <div key={i} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{sub.student}</span>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{sub.assignment}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground/60">{sub.course}</p>
                    <p className="text-[10px] text-muted-foreground/60">{sub.submittedAt}</p>
                  </div>
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
