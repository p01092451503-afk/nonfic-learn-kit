import { ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const assignments = [
  { title: "브랜드 포지셔닝 분석 리포트", course: "브랜드 마케팅 기초", dueDate: "2026-04-10", status: "pending", maxScore: 100 },
  { title: "향료 블렌딩 실습 보고서", course: "향수 원료학 심화", dueDate: "2026-04-08", status: "submitted", maxScore: 100, score: null },
  { title: "CX 개선 제안서", course: "고객 경험 디자인", dueDate: "2026-04-05", status: "graded", maxScore: 100, score: 92 },
  { title: "매장 디스플레이 기획안", course: "비주얼 머천다이징", dueDate: "2026-04-15", status: "pending", maxScore: 100 },
  { title: "마케팅 전략 분석", course: "브랜드 마케팅 기초", dueDate: "2026-03-28", status: "graded", maxScore: 100, score: 88 },
];

const statusConfig = {
  pending: { label: "미제출", icon: AlertCircle, color: "text-warning" },
  submitted: { label: "제출 완료", icon: Clock, color: "text-info" },
  graded: { label: "채점 완료", icon: CheckCircle2, color: "text-success" },
};

const StudentAssignments = () => {
  const pending = assignments.filter((a) => a.status === "pending");
  const submitted = assignments.filter((a) => a.status === "submitted");
  const graded = assignments.filter((a) => a.status === "graded");

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">과제</h1>
          <p className="text-muted-foreground mt-1">과제 현황을 확인하고 제출하세요.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-warning">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-1">미제출</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-info">{submitted.length}</p>
            <p className="text-xs text-muted-foreground mt-1">채점 대기</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-success">{graded.length}</p>
            <p className="text-xs text-muted-foreground mt-1">채점 완료</p>
          </div>
        </div>

        <div className="space-y-3">
          {assignments.map((assignment, i) => {
            const config = statusConfig[assignment.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            return (
              <div key={i} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{assignment.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{assignment.course}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                    {assignment.status === "graded" && <span className="ml-1">{assignment.score}점</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">마감: {assignment.dueDate}</p>
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

export default StudentAssignments;
