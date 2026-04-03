import { BookOpen, Plus, Users, Search, Filter, ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const courses = [
  { title: "브랜드 마케팅 기초", instructor: "이민지", students: 45, completion: 72, status: "published", category: "마케팅" },
  { title: "향수 원료학 심화", instructor: "한도윤", students: 28, completion: 58, status: "published", category: "제품" },
  { title: "고객 경험 디자인", instructor: "이민지", students: 36, completion: 85, status: "published", category: "CX" },
  { title: "비주얼 머천다이징", instructor: "한도윤", students: 52, completion: 34, status: "published", category: "디자인" },
  { title: "신규 직원 온보딩", instructor: "관리자", students: 0, completion: 0, status: "draft", category: "기초" },
  { title: "리더십 스킬", instructor: "관리자", students: 0, completion: 0, status: "draft", category: "리더십" },
];

const statusLabel: Record<string, { text: string; className: string }> = {
  published: { text: "공개", className: "text-success bg-success/10" },
  draft: { text: "초안", className: "text-muted-foreground bg-secondary" },
};

const AdminCourses = () => {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">강좌 관리</h1>
            <p className="text-muted-foreground mt-1">전체 강좌를 관리하고 모니터링하세요.</p>
          </div>
          <Button className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> 새 강좌
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{courses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">전체 강좌</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{courses.filter((c) => c.status === "published").length}</p>
            <p className="text-xs text-muted-foreground mt-1">공개 강좌</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{courses.reduce((sum, c) => sum + c.students, 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">총 수강생</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="강좌 검색" className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        <div className="space-y-3">
          {courses.map((course) => {
            const status = statusLabel[course.status];
            return (
              <div key={course.title} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.text}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{course.category}</span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground">강사: {course.instructor}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {course.students}명
                    </span>
                  </div>
                  {course.status === "published" && (
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={course.completion} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground">{course.completion}%</span>
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCourses;
