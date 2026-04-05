import { ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight, Send, Paperclip, X, FileIcon, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/webp", "text/plain",
];

const StudentAssignments = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [submitTarget, setSubmitTarget] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewTarget, setViewTarget] = useState<any>(null);

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
        .select("*, assignments(title, due_date, max_score, instructions, courses(title))")
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name}: 10MB 초과`, variant: "destructive" });
        return false;
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast({ title: `${f.name}: 지원하지 않는 형식`, variant: "destructive" });
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("assignment-files").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("assignment-files").getPublicUrl(filePath);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let fileUrls: string[] = [];
      if (files.length > 0) {
        fileUrls = await uploadFiles();
      }
      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: submitTarget.id,
        student_id: user!.id,
        submission_text: submissionText,
        file_urls: fileUrls.length > 0 ? fileUrls : null,
        status: "submitted" as any,
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast({ title: t("assignments.submitSuccess") });
      setSubmitTarget(null);
      setSubmissionText("");
      setFiles([]);
      setUploading(false);
    },
    onError: (e: any) => {
      setUploading(false);
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    },
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

        <section className="grid grid-cols-3 gap-2 sm:gap-4" aria-label={t("assignments.title")}>
          <div className="stat-card text-center !p-3 sm:!p-6" role="group" aria-label={t("assignments.unsubmitted")}>
            <p className="text-xl sm:text-2xl font-bold text-warning">{pending.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t("assignments.unsubmitted")}</p>
          </div>
          <div className="stat-card text-center !p-3 sm:!p-6" role="group" aria-label={t("assignments.waitingGrade")}>
            <p className="text-xl sm:text-2xl font-bold text-info">{submitted.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t("assignments.waitingGrade")}</p>
          </div>
          <div className="stat-card text-center !p-3 sm:!p-6" role="group" aria-label={t("assignments.graded")}>
            <p className="text-xl sm:text-2xl font-bold text-success">{graded.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t("assignments.graded")}</p>
          </div>
        </section>

        {/* Pending assignments */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("assignments.unsubmittedAssignments")}</h2>
            {pending.map((assignment: any) => (
              <div
                key={assignment.id}
                className="stat-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer group !p-3 sm:!p-4 hover:shadow-md transition-all"
                onClick={() => { setSubmitTarget(assignment); setSubmissionText(""); }}
                role="button"
                tabIndex={0}
                aria-label={`${assignment.title} - ${t("common.submit")}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSubmitTarget(assignment); setSubmissionText(""); } }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0" aria-hidden="true">
                    <ClipboardList className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{assignment.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{assignment.courses?.title}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-left sm:text-right shrink-0 space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-warning" role="status">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" /> {t("assignments.unsubmitted")}
                    </div>
                    {assignment.due_date && (
                      <p className="text-[10px] text-muted-foreground">
                        {t("assignments.dueDate", { date: formatDate(assignment.due_date) })}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0 gap-1.5" tabIndex={-1} aria-hidden="true">
                    <Send className="h-3 w-3" /> {t("common.submit")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submitted assignments */}
        {submissions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("assignments.submittedAssignments")}</h2>
            {submissions.map((sub: any) => {
              const config = statusConfig[sub.status as keyof typeof statusConfig] || statusConfig.submitted;
              const StatusIcon = config.icon;
              return (
                <div
                  key={sub.id}
                  className="stat-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer group !p-3 sm:!p-4 hover:shadow-md transition-all"
                  onClick={() => setViewTarget(sub)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${sub.assignments?.title} - ${config.label}`}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewTarget(sub); } }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0" aria-hidden="true">
                      <ClipboardList className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{sub.assignments?.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub.assignments?.courses?.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right shrink-0 space-y-1">
                      <div className={`flex items-center gap-1 text-xs font-medium ${config.color}`} role="status">
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {config.label}
                        {sub.status === "graded" && sub.score != null && (
                          <span className="ml-1">{sub.score}/{sub.assignments?.max_score || 100}{t("common.points")}</span>
                        )}
                      </div>
                      {sub.submitted_at && (
                        <p className="text-[10px] text-muted-foreground"><time dateTime={sub.submitted_at}>{formatDate(sub.submitted_at)}</time></p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
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

      {/* Submit Dialog */}
      <Dialog open={!!submitTarget} onOpenChange={(v) => !v && setSubmitTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("assignments.submitDialogTitle")}</DialogTitle>
            <DialogDescription>{t("assignments.submitDialogDesc")}</DialogDescription>
          </DialogHeader>
          {submitTarget && (
            <div className="space-y-4 py-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{submitTarget.title}</h3>
                <p className="text-xs text-muted-foreground">{submitTarget.courses?.title}</p>
                {submitTarget.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">{t("assignments.dueDate", { date: formatDate(submitTarget.due_date) })}</p>
                )}
              </div>
              {submitTarget.instructions && (
                <div className="p-3 bg-secondary/30 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap">
                  {submitTarget.instructions}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("assignments.submissionText")} *</Label>
                <Textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder={t("assignments.submissionPlaceholder")}
                  className="rounded-xl resize-none min-h-[120px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitTarget(null)} className="rounded-xl">{t("common.cancel")}</Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !submissionText.trim()}
              className="rounded-xl gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {submitMutation.isPending ? t("assignments.submitting") : t("common.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submission Detail Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(v) => !v && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("assignments.submissionDetail")}</DialogTitle>
            <DialogDescription>{viewTarget?.assignments?.title} · {viewTarget?.assignments?.courses?.title}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("assignments.submissionContent")}</Label>
                <div className="p-3 bg-secondary/30 rounded-xl text-sm text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {viewTarget.submission_text || t("assignments.noSubmissionText")}
                </div>
              </div>
              {viewTarget.submitted_at && (
                <p className="text-xs text-muted-foreground">{t("assignments.submitted")}: {formatDate(viewTarget.submitted_at)}</p>
              )}
              {viewTarget.score != null && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t("assignments.scoreLabel")}: {viewTarget.score}/{viewTarget.assignments?.max_score || 100}{t("common.points")}
                  </p>
                </div>
              )}
              {viewTarget.feedback && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t("assignments.feedbackLabel")}</Label>
                  <div className="p-3 bg-secondary/30 rounded-xl text-sm text-foreground whitespace-pre-wrap">
                    {viewTarget.feedback}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)} className="rounded-xl">{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StudentAssignments;
