import { ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

const statusConfig = {
  submitted: { label: "제출 완료", icon: Clock, color: "text-info" },
  graded: { label: "채점 완료", icon: CheckCircle2, color: "text-success" },
  returned: { label: "반환됨", icon: AlertCircle, color: "text-warning" },
};

const StudentAssignments = () => {
  const { user } = useUser();

  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title, due_date, max_score, courses(title))")
        .eq("student_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: ["my-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, courses(title)")
        .eq("status", "published")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const submittedIds = new Set(submissions.map((s: any) => s.assignment_id));
  const pending = myAssignments.filter((a: any) => !submittedIds.has(a.id));
  const submitted = submissions.filter((s: any) => s.status === "submitted");
  const graded = submissions.filter((s: any) => s.status === "graded" || s.status === "returned");

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
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

        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">미제출 과제</h2>
            {pending.map((assignment: any) => (
              <div key={assignment.id} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{assignment.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{assignment.courses?.title}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-warning">
                    <AlertCircle className="h-3 w-3" /> 미제출
                  </div>
                  {assignment.due_date && (
                    <p className="text-[10px] text-muted-foreground">
                      마감: {new Date(assignment.due_date).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
        )}

        {submissions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">제출한 과제</h2>
            {submissions.map((sub: any) => {
              const config = statusConfig[sub.status as keyof typeof statusConfig] || statusConfig.submitted;
              const StatusIcon = config.icon;
              return (
                <div key={sub.id} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                  <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{sub.assignments?.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub.assignments?.courses?.title}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                      {sub.status === "graded" && sub.score != null && (
                        <span className="ml-1">{sub.score}/{sub.assignments?.max_score || 100}점</span>
                      )}
                    </div>
                    {sub.submitted_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(sub.submitted_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pending.length === 0 && submissions.length === 0 && (
          <div className="stat-card text-center py-10">
            <p className="text-sm text-muted-foreground">등록된 과제가 없습니다.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentAssignments;
