import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, ChevronDown, ChevronRight, ClipboardCheck, Users, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface Props {
  courseId: string;
  assessmentId: string;
  assessmentTitle: string;
  passingScore: number;
}

export default function AssessmentResults({ courseId, assessmentId, assessmentTitle, passingScore }: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [search, setSearch] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Fetch all attempts for this assessment
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["assessment-results", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select("*")
        .eq("assessment_id", assessmentId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId,
  });

  // Get unique user IDs
  const userIds = [...new Set(attempts.map((a: any) => a.user_id))];

  // Fetch profiles for those users
  const { data: profiles = [] } = useQuery({
    queryKey: ["assessment-result-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department, employee_id")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  // Fetch answers for expanded student
  const { data: expandedAnswers = [] } = useQuery({
    queryKey: ["assessment-result-answers", expandedStudent],
    queryFn: async () => {
      if (!expandedStudent) return [];
      const studentAttempts = attempts.filter((a: any) => a.user_id === expandedStudent);
      const latestAttempt = studentAttempts[0];
      if (!latestAttempt) return [];
      const { data, error } = await supabase
        .from("assessment_answers")
        .select("*, assessment_questions(question_text, correct_answer, question_type, options, explanation, points)")
        .eq("attempt_id", latestAttempt.id);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedStudent,
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  // Group attempts by student, get best score
  const studentSummaries = userIds.map(uid => {
    const studentAttempts = attempts.filter((a: any) => a.user_id === uid);
    const profile = profileMap.get(uid);
    const bestAttempt = studentAttempts.reduce((best: any, a: any) =>
      (!best || Number(a.score) > Number(best.score)) ? a : best, null);
    const latestAttempt = studentAttempts[0];
    return {
      userId: uid,
      name: profile?.full_name || (isEn ? "Unknown" : "알 수 없음"),
      department: profile?.department || "",
      employeeId: profile?.employee_id || "",
      attemptCount: studentAttempts.length,
      bestScore: Number(bestAttempt?.score || 0),
      totalPoints: Number(bestAttempt?.total_points || 0),
      passed: bestAttempt?.passed || false,
      latestScore: Number(latestAttempt?.score || 0),
      latestDate: latestAttempt?.completed_at,
    };
  });

  const filtered = studentSummaries.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const passedCount = studentSummaries.filter(s => s.passed).length;
  const avgScore = studentSummaries.length > 0
    ? Math.round(studentSummaries.reduce((sum, s) => sum + (s.totalPoints > 0 ? (s.bestScore / s.totalPoints) * 100 : 0), 0) / studentSummaries.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{isEn ? "Total Students" : "응시자 수"}</p>
          <p className="text-xl font-bold text-foreground">{studentSummaries.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{isEn ? "Passed" : "합격"}</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{passedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{isEn ? "Failed" : "불합격"}</p>
          <p className="text-xl font-bold text-destructive">{studentSummaries.length - passedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{isEn ? "Avg Score" : "평균 점수"}</p>
          <p className="text-xl font-bold text-foreground">{avgScore}%</p>
        </div>
      </div>

      {/* Pass rate bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isEn ? "Pass Rate" : "합격률"}</span>
          <span>{studentSummaries.length > 0 ? Math.round((passedCount / studentSummaries.length) * 100) : 0}%</span>
        </div>
        <Progress value={studentSummaries.length > 0 ? (passedCount / studentSummaries.length) * 100 : 0} className="h-2" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isEn ? "Search by name, department..." : "이름, 부서로 검색..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {studentSummaries.length === 0
            ? (isEn ? "No students have taken this assessment yet." : "아직 응시한 학생이 없습니다.")
            : (isEn ? "No matching results." : "검색 결과가 없습니다.")}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_100px_80px_80px] gap-2 px-4 py-2 bg-secondary/30 text-[10px] font-semibold text-muted-foreground uppercase">
            <span>{isEn ? "Student" : "학생"}</span>
            <span className="text-center">{isEn ? "Best Score" : "최고 점수"}</span>
            <span className="text-center">{isEn ? "Result" : "결과"}</span>
            <span className="text-center">{isEn ? "Attempts" : "응시 횟수"}</span>
            <span className="text-center">{isEn ? "Detail" : "상세"}</span>
          </div>

          {filtered.map(student => {
            const isExpanded = expandedStudent === student.userId;
            const scorePercent = student.totalPoints > 0 ? Math.round((student.bestScore / student.totalPoints) * 100) : 0;

            return (
              <div key={student.userId}>
                <div
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_100px_100px_80px_80px] gap-2 px-4 py-3 items-center hover:bg-accent/20 transition-colors cursor-pointer"
                  onClick={() => setExpandedStudent(isExpanded ? null : student.userId)}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[student.department, student.employeeId].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  {/* Best score */}
                  <div className="hidden sm:block text-center">
                    <span className="text-sm font-semibold">{student.bestScore}/{student.totalPoints}</span>
                    <p className="text-[10px] text-muted-foreground">{scorePercent}%</p>
                  </div>

                  {/* Result */}
                  <div className="hidden sm:flex justify-center">
                    <Badge variant={student.passed ? "default" : "destructive"} className="text-[10px] h-5">
                      {student.passed ? (isEn ? "Pass" : "합격") : (isEn ? "Fail" : "불합격")}
                    </Badge>
                  </div>

                  {/* Attempts */}
                  <div className="hidden sm:block text-center text-xs text-muted-foreground">
                    {student.attemptCount}{isEn ? "" : "회"}
                  </div>

                  {/* Expand */}
                  <div className="flex items-center justify-center gap-2 sm:gap-0">
                    {/* Mobile badges */}
                    <Badge variant={student.passed ? "default" : "destructive"} className="text-[10px] h-5 sm:hidden">
                      {student.passed ? (isEn ? "Pass" : "합격") : (isEn ? "Fail" : "불합격")}
                    </Badge>
                    <span className="text-xs text-muted-foreground sm:hidden">{student.bestScore}/{student.totalPoints}</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-accent/10">
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {isEn ? "Latest attempt answers" : "최근 응시 답안"}
                      </p>
                      {expandedAnswers.length === 0 ? (
                        <div className="flex justify-center py-4">
                          <span className="h-4 w-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {expandedAnswers.map((ans: any, idx: number) => {
                            const q = ans.assessment_questions;
                            return (
                              <div key={ans.id} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm text-foreground flex-1">
                                    <span className="font-semibold text-muted-foreground mr-1.5">{idx + 1}.</span>
                                    {q?.question_text}
                                  </p>
                                  {ans.is_correct === true && (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold shrink-0">
                                      <Check className="h-3.5 w-3.5" /> {isEn ? "Correct" : "정답"}
                                    </span>
                                  )}
                                  {ans.is_correct === false && (
                                    <span className="flex items-center gap-1 text-destructive text-xs font-semibold shrink-0">
                                      <X className="h-3.5 w-3.5" /> {isEn ? "Wrong" : "오답"}
                                    </span>
                                  )}
                                  {ans.is_correct === null && (
                                    <span className="text-xs text-muted-foreground shrink-0">{isEn ? "Pending" : "채점 대기"}</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">{isEn ? "Student answer: " : "학생 답변: "}</span>
                                    <span className="text-foreground">{ans.user_answer || (isEn ? "(No answer)" : "(미답변)")}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{isEn ? "Correct answer: " : "정답: "}</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">{q?.correct_answer}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {ans.points_earned}/{q?.points} {isEn ? "points" : "점"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
