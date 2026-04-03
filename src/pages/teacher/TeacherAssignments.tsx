import {
  ClipboardList, Clock, CheckCircle2, Plus, MoreHorizontal, FileText, Info, CalendarIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

const statusLabel: Record<string, string> = {
  draft: "초안",
  published: "진행중",
  closed: "마감",
};

const statusStyle: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-secondary text-muted-foreground",
};

const TeacherAssignments = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formCourseId, setFormCourseId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formMaxScore, setFormMaxScore] = useState("100");
  const [formDueDate, setFormDueDate] = useState<Date | undefined>();
  const [formStatus, setFormStatus] = useState<"draft" | "published">("draft");
  const [formAllowLate, setFormAllowLate] = useState(false);

  // Fetch teacher's courses for the dropdown
  const { data: myCourses = [] } = useQuery({
    queryKey: ["teacher-courses-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", user!.id)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all assignments for teacher's courses
  const { data: assignments = [] } = useQuery({
    queryKey: ["teacher-all-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, courses(title, instructor_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((a: any) => a.courses?.instructor_id === user!.id);
    },
    enabled: !!user?.id,
  });

  // Fetch submissions
  const { data: submissions = [] } = useQuery({
    queryKey: ["teacher-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title, max_score, courses(title, instructor_id))")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((s: any) => s.assignments?.courses?.instructor_id === user!.id);
    },
    enabled: !!user?.id,
  });

  // Fetch student profiles
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["submission-profiles", submissions.map((s: any) => s.student_id)],
    queryFn: async () => {
      const ids = [...new Set(submissions.map((s: any) => s.student_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: submissions.length > 0,
  });

  const profileMap = new Map(studentProfiles.map((p: any) => [p.user_id, p.full_name]));

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignments").insert({
        course_id: formCourseId,
        title: formTitle,
        description: formDescription || null,
        instructions: formInstructions || null,
        max_score: parseInt(formMaxScore) || 100,
        due_date: formDueDate ? formDueDate.toISOString() : null,
        status: formStatus,
        allow_late_submission: formAllowLate,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-all-assignments"] });
      toast({ title: "과제 생성 완료", description: `"${formTitle}" 과제가 생성되었습니다.` });
      resetForm();
      setDialogOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "오류", description: e.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormCourseId("");
    setFormTitle("");
    setFormDescription("");
    setFormInstructions("");
    setFormMaxScore("100");
    setFormDueDate(undefined);
    setFormStatus("draft");
    setFormAllowLate(false);
  };

  const handleSubmit = () => {
    if (!formCourseId) {
      toast({ title: "오류", description: "강좌를 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!formTitle.trim()) {
      toast({ title: "오류", description: "과제 제목을 입력해주세요.", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  // Stats
  const totalAssignments = assignments.length;
  const pendingSubmissions = submissions.filter((s: any) => s.status === "submitted");
  const gradedSubmissions = submissions.filter((s: any) => s.status === "graded" || s.status === "returned");
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / gradedSubmissions.length)
    : 0;

  const submissionCountMap = new Map<string, { total: number; graded: number }>();
  submissions.forEach((s: any) => {
    const existing = submissionCountMap.get(s.assignment_id) || { total: 0, graded: 0 };
    existing.total++;
    if (s.status === "graded" || s.status === "returned") existing.graded++;
    submissionCountMap.set(s.assignment_id, existing);
  });

  const stats = [
    { label: "전체 과제", value: totalAssignments, sub: "생성된 과제", icon: FileText },
    { label: "채점 대기", value: pendingSubmissions.length, sub: "검토 필요", icon: Clock },
    { label: "채점 완료", value: gradedSubmissions.length, sub: "총 채점", icon: CheckCircle2 },
    { label: "평균 점수", value: `${avgScore}점`, sub: "전체 평균", icon: Info },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" /> 과제 관리
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              과제를 생성하고 학생들의 제출물을 평가하세요.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> 새 과제 만들기
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Assignment List Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">과제 목록</h2>
            <p className="text-sm text-muted-foreground mt-0.5">생성된 모든 과제</p>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">생성된 과제가 없습니다.</p>
              <p className="text-xs text-muted-foreground mt-1">새 과제를 만들어 학생들에게 배포해보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">과제명</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">강의</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">마감일</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">배점</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">상태</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 w-16">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignments.map((assignment: any) => {
                    const counts = submissionCountMap.get(assignment.id);
                    return (
                      <tr key={assignment.id} className="hover:bg-accent/20 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-foreground">{assignment.title}</p>
                          {counts && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              제출 {counts.total}건 · 채점 {counts.graded}건
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-muted-foreground">{assignment.courses?.title || "-"}</span>
                        </td>
                        <td className="px-4 py-4 text-center hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {assignment.due_date
                              ? new Date(assignment.due_date).toLocaleDateString("ko-KR")
                              : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">{assignment.max_score || 100}점</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold ${statusStyle[assignment.status || "draft"]}`}
                          >
                            {statusLabel[assignment.status || "draft"]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem className="text-xs">상세 보기</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">수정</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-destructive">삭제</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">최근 제출</h2>
              <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold">
                AI 채점
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">채점이 필요한 제출물</p>
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">채점 대기 중인 제출물이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingSubmissions.slice(0, 10).map((sub: any) => (
                <div key={sub.id} className="px-6 py-4 flex items-center gap-4 hover:bg-accent/20 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {(profileMap.get(sub.student_id) || "학")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{profileMap.get(sub.student_id) || "학생"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sub.assignments?.title} · {sub.assignments?.courses?.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      미채점
                    </Badge>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {sub.submitted_at
                        ? formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true, locale: ko })
                        : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0">
                    채점하기
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graded Submissions */}
        {gradedSubmissions.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">채점 완료</h2>
              <p className="text-sm text-muted-foreground mt-0.5">최근 채점된 제출물</p>
            </div>
            <div className="divide-y divide-border">
              {gradedSubmissions.slice(0, 10).map((sub: any) => (
                <div key={sub.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-sm font-semibold text-success shrink-0">
                    {(profileMap.get(sub.student_id) || "학")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{profileMap.get(sub.student_id) || "학생"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sub.assignments?.title} · {sub.assignments?.courses?.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      {sub.score != null ? `${sub.score}/${sub.assignments?.max_score || 100}점` : "-"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {sub.graded_at
                        ? formatDistanceToNow(new Date(sub.graded_at), { addSuffix: true, locale: ko })
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">새 과제 만들기</DialogTitle>
            <DialogDescription>과제 정보를 입력하고 학생들에게 배포하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Course Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">강좌 선택 *</Label>
              <Select value={formCourseId} onValueChange={setFormCourseId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="과제를 등록할 강좌를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {myCourses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">과제 제목 *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="예: 1주차 실습 과제"
                className="rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">설명</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="과제에 대한 간단한 설명"
                className="rounded-xl resize-none min-h-[80px]"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">제출 안내</Label>
              <Textarea
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="학생들에게 전달할 제출 방법 및 유의사항"
                className="rounded-xl resize-none min-h-[80px]"
              />
            </div>

            {/* Max Score & Due Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">배점</Label>
                <Input
                  type="number"
                  value={formMaxScore}
                  onChange={(e) => setFormMaxScore(e.target.value)}
                  placeholder="100"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">마감일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full rounded-xl justify-start text-left font-normal h-10">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formDueDate ? format(formDueDate, "yyyy.MM.dd", { locale: ko }) : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formDueDate}
                      onSelect={setFormDueDate}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Status & Allow Late */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">상태</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as "draft" | "published")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">초안 (비공개)</SelectItem>
                    <SelectItem value="published">공개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">지각 제출 허용</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={formAllowLate} onCheckedChange={setFormAllowLate} />
                  <span className="text-sm text-muted-foreground">{formAllowLate ? "허용" : "불허"}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="rounded-xl"
            >
              {createMutation.isPending ? "생성 중..." : "과제 생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TeacherAssignments;
