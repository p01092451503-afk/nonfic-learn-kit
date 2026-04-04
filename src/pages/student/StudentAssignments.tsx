import { ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useTranslation } from "react-i18next";

const StudentAssignments = () => {
  const { user } = useUser();
  const { t, i18n } = useTranslation();

  const statusConfig = {
    submitted: { label: t("assignments.submitted"), icon: Clock, color: "text-info" },
    graded: { label: t("assignments.gradedComplete"), icon: CheckCircle2, color: "text-success" },
    returned: { label: t("assignments.returnedLabel"), icon: AlertCircle, color: "text-warning" },
  };

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return i18n.language?.startsWith("en")
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : d.toLocaleDateString("ko-KR");
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("assignments.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("assignments.subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-warning">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("assignments.unsubmitted")}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-info">{submitted.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("assignments.waitingGrade")}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-success">{graded.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("assignments.graded")}</p>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("assignments.unsubmittedAssignments")}</h2>
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
                    <AlertCircle className="h-3 w-3" /> {t("assignments.unsubmitted")}
                  </div>
                  {assignment.due_date && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("assignments.dueDate", { date: formatDate(assignment.due_date) })}
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
            <h2 className="text-lg font-semibold text-foreground">{t("assignments.submittedAssignments")}</h2>
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
                        <span className="ml-1">{sub.score}/{sub.assignments?.max_score || 100}{t("common.points")}</span>
                      )}
                    </div>
                    {sub.submitted_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(sub.submitted_at)}
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
            <p className="text-sm text-muted-foreground">{t("assignments.noAssignments")}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentAssignments;