import { ClipboardCheck, Clock, CheckCircle2, Search, Filter, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const submissions = [
  { student: "김서연", course: "브랜드 마케팅 기초", assignment: "브랜드 포지셔닝 분석 리포트", submittedAt: "2시간 전", status: "submitted" },
  { student: "박준혁", course: "향수 원료학 심화", assignment: "향료 블렌딩 실습 보고서", submittedAt: "5시간 전", status: "submitted" },
  { student: "이민지", course: "브랜드 마케팅 기초", assignment: "마케팅 전략 분석", submittedAt: "어제", status: "submitted" },
  { student: "정우진", course: "고객 경험 디자인", assignment: "CX 개선 제안서", submittedAt: "어제", status: "graded", score: 92 },
  { student: "최예린", course: "향수 원료학 심화", assignment: "원료 분석 보고서", submittedAt: "2일 전", status: "graded", score: 88 },
  { student: "한도윤", course: "브랜드 마케팅 기초", assignment: "소비자 조사 리포트", submittedAt: "3일 전", status: "graded", score: 95 },
];

const TeacherAssignments = () => {
  const pending = submissions.filter((s) => s.status === "submitted");
  const graded = submissions.filter((s) => s.status === "graded");

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">과제 관리</h1>
          <p className="text-muted-foreground mt-1">제출된 과제를 확인하고 채점하세요.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-1">채점 대기</p>
          </div>
          <div className="stat-card text-center">
            <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{graded.length}</p>
            <p className="text-xs text-muted-foreground mt-1">채점 완료</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="학생 또는 과제 검색" className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">채점 대기</h2>
          <div className="space-y-3">
            {pending.map((sub, i) => (
              <div key={i} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{sub.student}</h3>
                  <p className="text-xs text-muted-foreground truncate">{sub.assignment}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub.course} · {sub.submittedAt}</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0">채점하기</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">채점 완료</h2>
          <div className="space-y-3">
            {graded.map((sub, i) => (
              <div key={i} className="stat-card flex items-center gap-4 !p-4 opacity-80">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{sub.student}</h3>
                  <p className="text-xs text-muted-foreground truncate">{sub.assignment}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub.course} · {sub.submittedAt}</p>
                </div>
                <span className="text-sm font-semibold text-success">{(sub as any).score}점</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssignments;
