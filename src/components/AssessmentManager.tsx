import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, ClipboardCheck, Users } from "lucide-react";
import AssessmentResults from "@/components/AssessmentResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type QuestionType = "multiple_choice_4" | "multiple_choice_5" | "short_answer" | "essay" | "ox";

interface QuestionForm {
  question_type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
  explanation: string;
  hint: string;
}

const emptyQuestion: QuestionForm = {
  question_type: "multiple_choice_4",
  question_text: "",
  options: ["", "", "", ""],
  correct_answer: "",
  points: 10,
  explanation: "",
  hint: "",
};

const questionTypeLabels: Record<QuestionType, { ko: string; en: string }> = {
  multiple_choice_4: { ko: "4지선다", en: "4 Choices" },
  multiple_choice_5: { ko: "5지선다", en: "5 Choices" },
  short_answer: { ko: "단답형", en: "Short Answer" },
  essay: { ko: "서술형", en: "Essay" },
  ox: { ko: "OX", en: "True/False" },
};

export default function AssessmentManager({ courseId }: { courseId: string }) {
  const { user } = useUser();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const queryClient = useQueryClient();

  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestion);

  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    description: "",
    passing_score: 60,
    max_attempts: 3,
    time_limit_minutes: null as number | null,
    completion_threshold: 80,
    require_assessment_for_completion: false,
    randomize_questions: true,
    is_published: false,
  });

  // Fetch assessment for this course
  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch questions
  const { data: questions = [] } = useQuery({
    queryKey: ["assessment-questions", assessment?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("*")
        .eq("assessment_id", assessment!.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!assessment?.id,
  });

  // Create/update assessment
  const upsertAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (assessment) {
        const { error } = await supabase.from("assessments").update({
          ...assessmentForm,
        }).eq("id", assessment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assessments").insert({
          ...assessmentForm,
          course_id: courseId,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment", courseId] });
      setAssessmentDialogOpen(false);
      toast({ title: t("assessment.saved") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  // Add/update question
  const upsertQuestionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        assessment_id: assessment!.id,
        question_type: questionForm.question_type,
        question_text: questionForm.question_text,
        options: ["multiple_choice_4", "multiple_choice_5", "ox"].includes(questionForm.question_type)
          ? questionForm.options
          : null,
        correct_answer: questionForm.correct_answer,
        points: questionForm.points,
        explanation: questionForm.explanation || null,
        hint: questionForm.hint || null,
      };

      if (editingQuestionId) {
        const { error } = await supabase.from("assessment_questions").update(payload).eq("id", editingQuestionId);
        if (error) throw error;
      } else {
        const maxOrder = questions.length > 0 ? Math.max(...questions.map((q: any) => q.order_index ?? 0)) + 1 : 0;
        const { error } = await supabase.from("assessment_questions").insert({ ...payload, order_index: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-questions", assessment?.id] });
      setQuestionDialogOpen(false);
      setEditingQuestionId(null);
      setQuestionForm(emptyQuestion);
      toast({ title: editingQuestionId ? t("assessment.questionUpdated") : t("assessment.questionAdded") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-questions", assessment?.id] });
      toast({ title: t("assessment.questionDeleted") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assessments").update({ is_published: !assessment!.is_published }).eq("id", assessment!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment", courseId] });
      toast({ title: assessment?.is_published ? t("assessment.unpublished") : t("assessment.published") });
    },
  });

  const openEditAssessment = () => {
    if (assessment) {
      setAssessmentForm({
        title: assessment.title,
        description: assessment.description || "",
        passing_score: assessment.passing_score,
        max_attempts: assessment.max_attempts,
        time_limit_minutes: assessment.time_limit_minutes,
        completion_threshold: Number(assessment.completion_threshold),
        require_assessment_for_completion: assessment.require_assessment_for_completion,
        randomize_questions: assessment.randomize_questions,
        is_published: assessment.is_published,
      });
    } else {
      setAssessmentForm({
        title: isEn ? "Course Assessment" : "과정 평가",
        description: "",
        passing_score: 60,
        max_attempts: 3,
        time_limit_minutes: null,
        completion_threshold: 80,
        require_assessment_for_completion: false,
        randomize_questions: true,
        is_published: false,
      });
    }
    setAssessmentDialogOpen(true);
  };

  const openAddQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestion);
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    const opts = q.options || [];
    setQuestionForm({
      question_type: q.question_type,
      question_text: q.question_text,
      options: q.question_type === "multiple_choice_5"
        ? [...opts, ...Array(5 - opts.length).fill("")]
        : q.question_type === "multiple_choice_4"
        ? [...opts, ...Array(4 - opts.length).fill("")]
        : q.question_type === "ox"
        ? ["O", "X"]
        : [],
      correct_answer: q.correct_answer,
      points: q.points,
      explanation: q.explanation || "",
      hint: q.hint || "",
    });
    setQuestionDialogOpen(true);
  };

  const handleTypeChange = (type: QuestionType) => {
    let options: string[] = [];
    if (type === "multiple_choice_4") options = ["", "", "", ""];
    else if (type === "multiple_choice_5") options = ["", "", "", "", ""];
    else if (type === "ox") options = ["O", "X"];
    setQuestionForm(f => ({ ...f, question_type: type, options, correct_answer: "" }));
  };

  const totalPoints = questions.reduce((s: number, q: any) => s + (q.points || 0), 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          {t("assessment.title")}
        </h2>
        <div className="flex items-center gap-2">
          {assessment && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => togglePublishMutation.mutate()}
            >
              {assessment.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {assessment.is_published ? t("assessment.unpublishBtn") : t("assessment.publishBtn")}
            </Button>
          )}
          <Button size="sm" className="h-8 text-xs gap-1" onClick={openEditAssessment}>
            {assessment ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {assessment ? t("assessment.editSettings") : t("assessment.create")}
          </Button>
        </div>
      </div>

      {!assessment ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-2">
          <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("assessment.noAssessment")}</p>
          <Button variant="outline" size="sm" onClick={openEditAssessment} className="text-xs">
            {t("assessment.create")}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Assessment info */}
          <div className="bg-secondary/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{assessment.title}</span>
                <Badge variant={assessment.is_published ? "default" : "secondary"} className="text-[10px] h-5">
                  {assessment.is_published ? t("assessment.publishedStatus") : t("assessment.draftStatus")}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("assessment.passingScore")}: {assessment.passing_score}{t("common.points")} | {t("assessment.maxAttempts")}: {assessment.max_attempts}{isEn ? " times" : "회"} | {t("assessment.completionThreshold")}: {Number(assessment.completion_threshold)}% | {t("assessment.questionCount")}: {questions.length}{isEn ? "" : "문항"} ({totalPoints}{t("common.points")})
              </p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={openAddQuestion}>
              <Plus className="h-3 w-3" />
              {t("assessment.addQuestion")}
            </Button>
          </div>

          {/* Questions list */}
          {questions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("assessment.noQuestions")}
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {questions.map((q: any, idx: number) => (
                <li key={q.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/20 transition-colors group">
                  <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">{idx + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                        {isEn ? questionTypeLabels[q.question_type as QuestionType]?.en : questionTypeLabels[q.question_type as QuestionType]?.ko}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{q.points}{t("common.points")}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{q.question_text}</p>
                    {q.options && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(q.options as string[]).map((opt: string, i: number) => (
                          <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${opt === q.correct_answer ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium" : "bg-muted text-muted-foreground"}`}
                          >
                            {opt || `(${i + 1})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {!q.options && q.correct_answer && (
                      <p className="text-[10px] text-green-600 dark:text-green-400">
                        {t("assessment.answer")}: {q.correct_answer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => openEditQuestion(q)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button" className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("assessment.deleteQuestion")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("assessment.deleteQuestionConfirm")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteQuestionMutation.mutate(q.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Assessment Settings Dialog */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{assessment ? t("assessment.editSettings") : t("assessment.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">{t("assessment.assessmentTitle")}</Label>
              <Input className="h-9 text-sm" value={assessmentForm.title} onChange={e => setAssessmentForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("assessment.description")}</Label>
              <Textarea className="text-sm" value={assessmentForm.description} onChange={e => setAssessmentForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.passingScore")}</Label>
                <Input className="h-9 text-sm" type="number" value={assessmentForm.passing_score} onChange={e => setAssessmentForm(f => ({ ...f, passing_score: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.maxAttempts")}</Label>
                <Input className="h-9 text-sm" type="number" value={assessmentForm.max_attempts} onChange={e => setAssessmentForm(f => ({ ...f, max_attempts: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.timeLimit")}</Label>
                <Input className="h-9 text-sm" type="number" placeholder={isEn ? "No limit" : "제한 없음"} value={assessmentForm.time_limit_minutes ?? ""} onChange={e => setAssessmentForm(f => ({ ...f, time_limit_minutes: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.completionThreshold")}</Label>
                <Input className="h-9 text-sm" type="number" value={assessmentForm.completion_threshold} onChange={e => setAssessmentForm(f => ({ ...f, completion_threshold: Number(e.target.value) }))} />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">{t("assessment.requireForCompletion")}</Label>
                <p className="text-[10px] text-muted-foreground">{t("assessment.requireForCompletionDesc")}</p>
              </div>
              <Switch checked={assessmentForm.require_assessment_for_completion} onCheckedChange={v => setAssessmentForm(f => ({ ...f, require_assessment_for_completion: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">{t("assessment.randomize")}</Label>
                <p className="text-[10px] text-muted-foreground">{t("assessment.randomizeDesc")}</p>
              </div>
              <Switch checked={assessmentForm.randomize_questions} onCheckedChange={v => setAssessmentForm(f => ({ ...f, randomize_questions: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssessmentDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={() => upsertAssessmentMutation.mutate()} disabled={!assessmentForm.title.trim() || upsertAssessmentMutation.isPending}>
              {upsertAssessmentMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editingQuestionId ? t("assessment.editQuestion") : t("assessment.addQuestion")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.questionType")}</Label>
                <Select value={questionForm.question_type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(questionTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{isEn ? v.en : v.ko}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.pointsLabel")}</Label>
                <Input className="h-9 text-sm" type="number" value={questionForm.points} onChange={e => setQuestionForm(f => ({ ...f, points: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("assessment.questionText")}</Label>
              <Textarea className="text-sm" value={questionForm.question_text} onChange={e => setQuestionForm(f => ({ ...f, question_text: e.target.value }))} rows={3} />
            </div>

            {/* Options for MCQ and OX */}
            {["multiple_choice_4", "multiple_choice_5", "ox"].includes(questionForm.question_type) && (
              <div className="space-y-2">
                <Label className="text-xs">{t("assessment.options")}</Label>
                {questionForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={questionForm.correct_answer === opt && opt !== ""}
                      onChange={() => setQuestionForm(f => ({ ...f, correct_answer: opt }))}
                      className="h-4 w-4 text-primary"
                    />
                    {questionForm.question_type === "ox" ? (
                      <span className="text-sm font-medium">{opt}</span>
                    ) : (
                      <Input
                        className="h-8 text-sm flex-1"
                        value={opt}
                        placeholder={`${isEn ? "Option" : "보기"} ${i + 1}`}
                        onChange={e => {
                          const newOpts = [...questionForm.options];
                          const wasSelected = questionForm.correct_answer === newOpts[i];
                          newOpts[i] = e.target.value;
                          setQuestionForm(f => ({
                            ...f,
                            options: newOpts,
                            correct_answer: wasSelected ? e.target.value : f.correct_answer,
                          }));
                        }}
                      />
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">{t("assessment.selectCorrect")}</p>
              </div>
            )}

            {/* Short answer / essay correct answer */}
            {["short_answer", "essay"].includes(questionForm.question_type) && (
              <div className="space-y-1">
                <Label className="text-xs">{t("assessment.correctAnswer")}</Label>
                {questionForm.question_type === "short_answer" ? (
                  <Input className="h-9 text-sm" value={questionForm.correct_answer} onChange={e => setQuestionForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder={isEn ? "Exact match answer" : "정답 (일치하는 답)"} />
                ) : (
                  <Textarea className="text-sm" value={questionForm.correct_answer} onChange={e => setQuestionForm(f => ({ ...f, correct_answer: e.target.value }))} rows={2} placeholder={isEn ? "Model answer / keywords" : "모범 답안 / 키워드"} />
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">{t("assessment.explanation")}</Label>
              <Textarea className="text-sm" value={questionForm.explanation} onChange={e => setQuestionForm(f => ({ ...f, explanation: e.target.value }))} rows={2} placeholder={isEn ? "Explanation shown after grading (optional)" : "채점 후 표시될 해설 (선택사항)"} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{isEn ? "Hint" : "힌트"}</Label>
              <Textarea className="text-sm" value={questionForm.hint} onChange={e => setQuestionForm(f => ({ ...f, hint: e.target.value }))} rows={2} placeholder={isEn ? "Hint shown to students during test (optional)" : "시험 중 학생에게 보여줄 힌트 (선택사항)"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQuestionDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={() => upsertQuestionMutation.mutate()} disabled={!questionForm.question_text.trim() || !questionForm.correct_answer.trim() || upsertQuestionMutation.isPending}>
              {upsertQuestionMutation.isPending ? t("common.saving") : editingQuestionId ? t("common.edit") : t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
