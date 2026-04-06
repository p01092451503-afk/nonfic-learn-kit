import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type QuestionType = "multiple_choice_4" | "multiple_choice_5" | "short_answer" | "essay" | "ox";

const questionTypeLabels: Record<QuestionType, { ko: string; en: string }> = {
  multiple_choice_4: { ko: "4지선다", en: "4 Choices" },
  multiple_choice_5: { ko: "5지선다", en: "5 Choices" },
  short_answer: { ko: "단답형", en: "Short Answer" },
  essay: { ko: "서술형", en: "Essay" },
  ox: { ko: "OX", en: "True/False" },
};

export default function AssessmentPage() {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { primaryRole } = useUserRole();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const queryClient = useQueryClient();

  const isStudentRoute = location.pathname.startsWith("/student");
  const routePrefix = location.pathname.startsWith("/admin") ? "/admin" : location.pathname.startsWith("/teacher") ? "/teacher" : "/student";

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Fetch assessment
  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ["assessment-detail", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("*").eq("id", assessmentId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId,
  });

  // Fetch questions
  const { data: rawQuestions = [] } = useQuery({
    queryKey: ["assessment-questions-take", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("*")
        .eq("assessment_id", assessmentId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId,
  });

  // Randomize questions if needed
  const questions = useMemo(() => {
    if (!assessment?.randomize_questions) return rawQuestions;
    return [...rawQuestions].sort(() => Math.random() - 0.5);
  }, [rawQuestions, assessment?.randomize_questions]);

  // Fetch previous attempts
  const { data: attempts = [] } = useQuery({
    queryKey: ["assessment-attempts", assessmentId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select("*")
        .eq("assessment_id", assessmentId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId && !!user?.id,
  });

  // Fetch answers for latest completed attempt
  const latestCompleted = attempts.find((a: any) => a.completed_at);
  const { data: previousAnswers = [] } = useQuery({
    queryKey: ["assessment-answers", latestCompleted?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_answers")
        .select("*")
        .eq("attempt_id", latestCompleted!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!latestCompleted?.id && showResults,
  });

  const completedAttempts = attempts.filter((a: any) => a.completed_at);
  const canAttempt = assessment ? completedAttempts.length < assessment.max_attempts : false;
  const bestScore = completedAttempts.length > 0 ? Math.max(...completedAttempts.map((a: any) => Number(a.score) || 0)) : null;
  const passed = bestScore !== null && assessment ? bestScore >= assessment.passing_score : false;

  // Timer
  useEffect(() => {
    if (!currentAttemptId || !assessment?.time_limit_minutes) return;
    setTimeLeft(assessment.time_limit_minutes * 60);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentAttemptId, assessment?.time_limit_minutes]);

  // Start attempt
  const startAttemptMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("assessment_attempts").insert({
        assessment_id: assessmentId!,
        user_id: user!.id,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setCurrentAttemptId(id);
      setAnswers({});
      setShowResults(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  // Submit
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!currentAttemptId) return;

      let totalScore = 0;
      let totalPoints = 0;
      const answerPayloads: any[] = [];

      for (const q of questions) {
        const userAnswer = answers[q.id] || "";
        let isCorrect = false;
        let pointsEarned = 0;

        if (q.question_type === "essay") {
          // Essay questions need manual grading, mark as pending
          isCorrect = false;
          pointsEarned = 0;
        } else {
          isCorrect = userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          pointsEarned = isCorrect ? q.points : 0;
        }

        totalPoints += q.points;
        totalScore += pointsEarned;

        answerPayloads.push({
          attempt_id: currentAttemptId,
          question_id: q.id,
          user_answer: userAnswer || null,
          is_correct: q.question_type === "essay" ? null : isCorrect,
          points_earned: pointsEarned,
        });
      }

      // Insert answers
      const { error: ansErr } = await supabase.from("assessment_answers").insert(answerPayloads);
      if (ansErr) throw ansErr;

      // Update attempt
      const { error: attErr } = await supabase.from("assessment_attempts").update({
        score: totalScore,
        total_points: totalPoints,
        passed: totalScore >= (assessment?.passing_score || 0),
        completed_at: new Date().toISOString(),
      }).eq("id", currentAttemptId);
      if (attErr) throw attErr;
    },
    onSuccess: () => {
      setCurrentAttemptId(null);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["assessment-attempts", assessmentId, user?.id] });
      toast({ title: t("assessment.submitted") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => submitMutation.mutate();

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (assessmentLoading) {
    return (
      <DashboardLayout role={isStudentRoute ? "student" : primaryRole === "admin" ? "admin" : "teacher"}>
        <div className="flex items-center justify-center h-64">
          <span className="h-6 w-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout role="student">
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">{t("assessment.notFound")}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>{t("common.back")}</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Taking assessment
  if (currentAttemptId) {
    const answeredCount = Object.values(answers).filter(a => a.trim()).length;
    const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    return (
      <DashboardLayout role="student">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header with timer */}
          <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-3 border-b border-border">
            <div>
              <h1 className="text-lg font-semibold">{assessment.title}</h1>
              <p className="text-xs text-muted-foreground">
                {answeredCount}/{questions.length} {isEn ? "answered" : "답변 완료"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {timeLeft !== null && (
                <div className={`flex items-center gap-1 text-sm font-mono ${timeLeft < 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                  <Timer className="h-4 w-4" />
                  {formatTime(timeLeft)}
                </div>
              )}
              <Button size="sm" onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? t("common.processing") : t("common.submit")}
              </Button>
            </div>
          </div>

          <Progress value={progressPercent} className="h-1.5" />

          {/* Questions */}
          <div className="space-y-6">
            {questions.map((q: any, idx: number) => (
              <Card key={q.id} className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">Q{idx + 1}</span>
                    <Badge variant="outline" className="text-[9px] h-4">
                      {isEn ? questionTypeLabels[q.question_type as QuestionType]?.en : questionTypeLabels[q.question_type as QuestionType]?.ko}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{q.points}{t("common.points")}</span>
                  </div>
                  <CardTitle className="text-sm font-medium leading-relaxed">{q.question_text}</CardTitle>
                </CardHeader>
                <CardContent>
                  {["multiple_choice_4", "multiple_choice_5", "ox"].includes(q.question_type) && q.options && (
                    <RadioGroup value={answers[q.id] || ""} onValueChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}>
                      <div className="space-y-2">
                        {(q.options as string[]).map((opt: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent/30 transition-colors">
                            <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                            <Label htmlFor={`${q.id}-${i}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                  {q.question_type === "short_answer" && (
                    <Input
                      className="h-9 text-sm"
                      value={answers[q.id] || ""}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      placeholder={isEn ? "Enter your answer" : "답을 입력하세요"}
                    />
                  )}
                  {q.question_type === "essay" && (
                    <Textarea
                      className="text-sm"
                      value={answers[q.id] || ""}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      rows={4}
                      placeholder={isEn ? "Write your answer" : "답안을 작성하세요"}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pb-8">
            <Button onClick={handleSubmit} disabled={submitMutation.isPending} size="lg">
              {submitMutation.isPending ? t("common.processing") : t("assessment.submitAssessment")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Overview / Results
  return (
    <DashboardLayout role={isStudentRoute ? "student" : primaryRole === "admin" ? "admin" : "teacher"}>
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => navigate(`${routePrefix}/courses/${courseId}${isStudentRoute ? "?view=learn" : ""}`)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("course.backToCourse")}
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{assessment.title}</CardTitle>
            </div>
            {assessment.description && <p className="text-sm text-muted-foreground">{assessment.description}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("assessment.passingScore")}</p>
                <p className="text-lg font-bold">{assessment.passing_score}{t("common.points")}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("assessment.maxAttempts")}</p>
                <p className="text-lg font-bold">{completedAttempts.length}/{assessment.max_attempts}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("assessment.questionCount")}</p>
                <p className="text-lg font-bold">{questions.length}</p>
              </div>
              {assessment.time_limit_minutes && (
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("assessment.timeLimit")}</p>
                  <p className="text-lg font-bold">{assessment.time_limit_minutes}{t("common.minutes")}</p>
                </div>
              )}
            </div>

            {/* Best score */}
            {bestScore !== null && (
              <div className={`rounded-lg border p-4 flex items-center gap-3 ${passed ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"}`}>
                {passed ? <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> : <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />}
                <div>
                  <p className="text-sm font-semibold">{passed ? t("assessment.passedResult") : t("assessment.failedResult")}</p>
                  <p className="text-xs text-muted-foreground">{t("assessment.bestScore")}: {bestScore}{t("common.points")}</p>
                </div>
              </div>
            )}

            {/* Attempt history */}
            {completedAttempts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold">{t("assessment.attemptHistory")}</h3>
                {completedAttempts.map((a: any, i: number) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                    <span>{completedAttempts.length - i}{isEn ? "st attempt" : "회차"}</span>
                    <span className={a.passed ? "text-green-600 dark:text-green-400 font-medium" : "text-orange-600 dark:text-orange-400"}>
                      {Number(a.score)}/{Number(a.total_points)}{t("common.points")} {a.passed ? (isEn ? "(Pass)" : "(합격)") : (isEn ? "(Fail)" : "(불합격)")}
                    </span>
                    <span className="text-muted-foreground">{new Date(a.completed_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action */}
            {canAttempt && (
              <Button className="w-full" onClick={() => startAttemptMutation.mutate()} disabled={startAttemptMutation.isPending}>
                {startAttemptMutation.isPending ? t("common.processing") : completedAttempts.length === 0 ? t("assessment.startAssessment") : t("assessment.retakeAssessment")}
              </Button>
            )}
            {!canAttempt && completedAttempts.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">{t("assessment.noMoreAttempts")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
