import { BookOpen, Play, ArrowRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const courses = [
  { title: "브랜드 마케팅 기초", category: "마케팅", progress: 75, lessons: 12, completed: 9, instructor: "김지현", status: "진행중" },
  { title: "향수 원료학 심화", category: "제품", progress: 45, lessons: 8, completed: 4, instructor: "박민수", status: "진행중" },
  { title: "고객 경험 디자인", category: "CX", progress: 90, lessons: 10, completed: 9, instructor: "이서윤", status: "진행중" },
  { title: "비주얼 머천다이징", category: "디자인", progress: 20, lessons: 15, completed: 3, instructor: "정하늘", status: "진행중" },
  { title: "뷰티 트렌드 분석", category: "마케팅", progress: 100, lessons: 6, completed: 6, instructor: "최예린", status: "완료" },
  { title: "디지털 마케팅 입문", category: "마케팅", progress: 100, lessons: 10, completed: 10, instructor: "한도윤", status: "완료" },
];

const StudentCourses = () => {
  const inProgress = courses.filter((c) => c.status === "진행중");
  const completed = courses.filter((c) => c.status === "완료");

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">내 강좌</h1>
          <p className="text-muted-foreground mt-1">수강 중인 강좌와 완료한 강좌를 확인하세요.</p>
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

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">수강 중 ({inProgress.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {inProgress.map((course) => (
              <div key={course.title} className="stat-card cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <Play className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded-full">
                      {course.category}
                    </span>
                    <h3 className="text-sm font-medium text-foreground mt-1.5 truncate">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{course.instructor}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Progress value={course.progress} className="flex-1 h-1.5" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {course.completed}/{course.lessons}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">완료 ({completed.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {completed.map((course) => (
              <div key={course.title} className="stat-card opacity-80">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded-full">
                      {course.category}
                    </span>
                    <h3 className="text-sm font-medium text-foreground mt-1.5 truncate">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{course.instructor}</p>
                    <p className="text-xs text-success font-medium mt-2">수료 완료</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentCourses;
