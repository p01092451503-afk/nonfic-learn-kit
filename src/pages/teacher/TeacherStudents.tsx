import { Users, Search, Filter, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const students = [
  { name: "김서연", department: "마케팅팀", courses: 3, avgProgress: 78, lastActive: "오늘" },
  { name: "박준혁", department: "디자인팀", courses: 2, avgProgress: 62, lastActive: "오늘" },
  { name: "이민지", department: "제품개발팀", courses: 4, avgProgress: 85, lastActive: "어제" },
  { name: "정우진", department: "영업팀", courses: 2, avgProgress: 45, lastActive: "3일 전" },
  { name: "최예린", department: "마케팅팀", courses: 3, avgProgress: 91, lastActive: "오늘" },
  { name: "한도윤", department: "디자인팀", courses: 1, avgProgress: 30, lastActive: "5일 전" },
  { name: "송하늘", department: "제품개발팀", courses: 3, avgProgress: 55, lastActive: "어제" },
];

const TeacherStudents = () => {
  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">수강생 관리</h1>
          <p className="text-muted-foreground mt-1">담당 강좌 수강생의 학습 현황을 확인하세요.</p>
        </div>

        <div className="stat-card text-center">
          <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{students.length}</p>
          <p className="text-xs text-muted-foreground mt-1">총 수강생</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="수강생 검색" className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.name} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground shrink-0">
                {student.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground">{student.name}</h3>
                <p className="text-xs text-muted-foreground">{student.department} · {student.courses}강좌 수강</p>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={student.avgProgress} className="flex-1 h-1.5" />
                  <span className="text-xs text-muted-foreground">{student.avgProgress}%</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground">최근 활동</p>
                <p className="text-xs font-medium text-foreground">{student.lastActive}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudents;
