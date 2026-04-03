import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Clock, Users, ArrowLeft, CheckCircle2, Lock,
  FileText, Video, ChevronRight, BarChart3, Plus, Pencil,
  Trash2, GripVertical, Eye, EyeOff, Settings, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

const contentTypeIcon: Record<string, React.ElementType> = {
  video: Video, document: FileText, quiz: BarChart3, assignment: FileText, live: Video,
};
const contentTypeLabel: Record<string, string> = {
  video: "영상", document: "문서", quiz: "퀴즈", assignment: "과제", live: "라이브",
};

type ContentFormData = {
  title: string;
  content_type: string;
  video_url: string;
  video_provider: string;
  duration_minutes: number | null;
  description: string;
  is_preview: boolean;
  is_published: boolean;
};

const emptyContent: ContentFormData = {
  title: "", content_type: "video", video_url: "", video_provider: "",
  duration_minutes: null, description: "", is_preview: false, is_published: true,
};

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { primaryRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState<ContentFormData>(emptyContent);
  const [courseEditOpen, setCourseEditOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", status: "draft" });

  const isTeacherOrAdmin = primaryRole === "admin" || primaryRole === "teacher";
  const role = primaryRole === "admin" ? "admin" : primaryRole === "teacher" ? "teacher" : "student";

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: contents = [] } = useQuery({
    queryKey: ["course-contents", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_contents").select("*").eq("course_id", courseId!).order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*").eq("course_id", courseId!).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user?.id,
  });

  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ["enrollment-count", courseId],
    queryFn: async () => {
      const { count, error } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", courseId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!courseId && isTeacherOrAdmin,
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ["content-progress", courseId, user?.id],
    queryFn: async () => {
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length === 0) return [];
      const { data, error } = await supabase.from("content_progress").select("*").eq("user_id", user!.id).in("content_id", contentIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && contents.length > 0 && !isTeacherOrAdmin,
  });

  // --- Mutations ---
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    queryClient.invalidateQueries({ queryKey: ["course-contents", courseId] });
  };

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({ user_id: user!.id, course_id: courseId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId] });
      toast({ title: "수강 등록 완료", description: "강좌에 등록되었습니다." });
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (vals: { title: string; description: string; status: string }) => {
      const { error } = await supabase.from("courses").update(vals).eq("id", courseId!);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setCourseEditOpen(false); toast({ title: "강좌 정보 수정 완료" }); },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const upsertContentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        course_id: courseId!,
        title: contentForm.title,
        content_type: contentForm.content_type as any,
        video_url: contentForm.video_url || null,
        video_provider: (contentForm.video_provider || null) as any,
        duration_minutes: contentForm.duration_minutes,
        description: contentForm.description || null,
        is_preview: contentForm.is_preview,
        is_published: contentForm.is_published,
      };
      if (editingContentId) {
        const { error } = await supabase.from("course_contents").update(payload).eq("id", editingContentId);
        if (error) throw error;
      } else {
        const maxOrder = contents.length > 0 ? Math.max(...contents.map(c => c.order_index ?? 0)) + 1 : 0;
        const { error } = await supabase.from("course_contents").insert({ ...payload, order_index: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setContentDialogOpen(false);
      setEditingContentId(null);
      setContentForm(emptyContent);
      toast({ title: editingContentId ? "콘텐츠 수정 완료" : "콘텐츠 추가 완료" });
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "콘텐츠 삭제 완료" }); },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newIndex }: { id: string; newIndex: number }) => {
      const sorted = [...contents].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const currentIdx = sorted.findIndex(c => c.id === id);
      if (currentIdx === -1 || newIndex < 0 || newIndex >= sorted.length) return;
      const [item] = sorted.splice(currentIdx, 1);
      sorted.splice(newIndex, 0, item);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].order_index !== i) {
          await supabase.from("course_contents").update({ order_index: i }).eq("id", sorted[i].id);
        }
      }
    },
    onSuccess: () => invalidateAll(),
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("course_contents").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  // --- Helpers ---
  const openAddContent = () => {
    setEditingContentId(null);
    setContentForm(emptyContent);
    setContentDialogOpen(true);
  };
  const openEditContent = (c: typeof contents[0]) => {
    setEditingContentId(c.id);
    setContentForm({
      title: c.title, content_type: c.content_type || "video",
      video_url: c.video_url || "", video_provider: c.video_provider || "",
      duration_minutes: c.duration_minutes, description: c.description || "",
      is_preview: c.is_preview ?? false, is_published: c.is_published ?? true,
    });
    setContentDialogOpen(true);
  };
  const openCourseEdit = () => {
    if (!course) return;
    setCourseForm({ title: course.title, description: course.description || "", status: course.status || "draft" });
    setCourseEditOpen(true);
  };

  const progressMap = new Map(progressData.map((p) => [p.content_id, p]));
  const completedCount = progressData.filter((p) => p.completed).length;
  const overallProgress = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;

  if (courseLoading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center h-64">
          <span className="h-6 w-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout role={role}>
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">강좌를 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>돌아가기</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-4xl space-y-8">
        {/* Back */}
        <button
          onClick={() => navigate(role === "student" ? "/student/courses" : "/teacher/courses")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> 목록으로
        </button>

        {/* Header */}
        <div className="stat-card space-y-5">
          <div className="flex items-start gap-5">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" className="h-16 w-16 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shrink-0">
                <BookOpen className="h-7 w-7 text-accent-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {course.difficulty_level || "기초"}
                </Badge>
                {course.is_mandatory && <Badge variant="destructive" className="text-[10px]">필수</Badge>}
                <Badge variant="outline" className="text-[10px]">
                  {course.status === "published" ? "공개" : "비공개"}
                </Badge>
              </div>
              <h1 className="text-xl font-semibold text-foreground">{course.title}</h1>
              {course.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
              )}
            </div>
            {isTeacherOrAdmin && (
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={openCourseEdit}>
                <Settings className="h-3.5 w-3.5" /> 편집
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5" /> {contents.length}개 콘텐츠</span>
            {course.estimated_duration_hours && (
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 약 {course.estimated_duration_hours}시간</span>
            )}
            {isTeacherOrAdmin && (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 수강생 {enrollmentCount}명</span>
            )}
            {!isTeacherOrAdmin && course.max_students && (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 최대 {course.max_students}명</span>
            )}
          </div>

          {/* Student enrollment */}
          {role === "student" && (
            <div className="pt-2">
              {enrollment ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">수강 진행률</span>
                    <span className="font-medium text-foreground">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{completedCount}/{contents.length} 완료</p>
                </div>
              ) : (
                <Button variant="login" size="xl" className="w-full sm:w-auto" onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                  {enrollMutation.isPending ? "등록 중..." : "수강 등록하기"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">강의 콘텐츠</h2>
            {isTeacherOrAdmin && (
              <Button size="sm" className="gap-1.5" onClick={openAddContent}>
                <Plus className="h-3.5 w-3.5" /> 콘텐츠 추가
              </Button>
            )}
          </div>

          {contents.length === 0 ? (
            <div className="stat-card text-center py-10 space-y-3">
              <p className="text-sm text-muted-foreground">등록된 콘텐츠가 없습니다.</p>
              {isTeacherOrAdmin && (
                <Button variant="outline" size="sm" onClick={openAddContent} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> 첫 번째 콘텐츠 추가하기
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {contents.map((content, idx) => {
                const progress = progressMap.get(content.id);
                const isCompleted = progress?.completed;
                const isAccessible = enrollment || role !== "student" || content.is_preview;
                const Icon = contentTypeIcon[content.content_type || "video"] || Video;
                const isUnpublished = !content.is_published;

                return (
                  <div
                    key={content.id}
                    className={`stat-card flex items-center gap-3 group transition-all ${
                      isUnpublished && isTeacherOrAdmin ? "opacity-60 border-dashed" : ""
                    } ${!isAccessible && !isTeacherOrAdmin ? "opacity-60" : "hover:shadow-md cursor-pointer"}`}
                    onClick={() => {
                      if (isAccessible || isTeacherOrAdmin) {
                        navigate(`/courses/${courseId}/content/${content.id}`);
                      }
                    }}
                  >
                    {/* Reorder for teachers */}
                    {isTeacherOrAdmin && (
                      <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => reorderMutation.mutate({ id: content.id, newIndex: idx - 1 })}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={idx === contents.length - 1}
                          onClick={() => reorderMutation.mutate({ id: content.id, newIndex: idx + 1 })}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-accent text-accent-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : !isAccessible && !isTeacherOrAdmin ? <Lock className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{String(idx + 1).padStart(2, "0")}</span>
                        <h3 className="text-sm font-medium text-foreground truncate">{content.title}</h3>
                        {isTeacherOrAdmin && isUnpublished && (
                          <Badge variant="outline" className="text-[10px] h-4 border-dashed">비공개</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {contentTypeLabel[content.content_type || "video"]}
                        </span>
                        {content.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground">{content.duration_minutes}분</span>
                        )}
                        {content.is_preview && <Badge variant="outline" className="text-[10px] h-4">미리보기</Badge>}
                      </div>
                    </div>

                    {/* Teacher actions */}
                    {isTeacherOrAdmin ? (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title={content.is_published ? "비공개로 전환" : "공개로 전환"}
                          onClick={() => togglePublishMutation.mutate({ id: content.id, published: !content.is_published })}
                        >
                          {content.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          onClick={() => openEditContent(content)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>콘텐츠 삭제</AlertDialogTitle>
                              <AlertDialogDescription>"{content.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteContentMutation.mutate(content.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      isAccessible && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content Add/Edit Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContentId ? "콘텐츠 수정" : "콘텐츠 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">제목 *</Label>
              <Input value={contentForm.title} onChange={(e) => setContentForm(f => ({ ...f, title: e.target.value }))} placeholder="콘텐츠 제목" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">유형</Label>
                <Select value={contentForm.content_type} onValueChange={(v) => setContentForm(f => ({ ...f, content_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">영상</SelectItem>
                    <SelectItem value="document">문서</SelectItem>
                    <SelectItem value="quiz">퀴즈</SelectItem>
                    <SelectItem value="assignment">과제</SelectItem>
                    <SelectItem value="live">라이브</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">재생시간 (분)</Label>
                <Input type="number" value={contentForm.duration_minutes ?? ""} onChange={(e) => setContentForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : null }))} placeholder="분" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">영상/콘텐츠 URL</Label>
              <Input value={contentForm.video_url} onChange={(e) => setContentForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">영상 제공자</Label>
              <Select value={contentForm.video_provider} onValueChange={(v) => setContentForm(f => ({ ...f, video_provider: v }))}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="custom">커스텀</SelectItem>
                  <SelectItem value="upload">업로드</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">설명</Label>
              <Textarea value={contentForm.description} onChange={(e) => setContentForm(f => ({ ...f, description: e.target.value }))} placeholder="콘텐츠 설명" rows={3} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={contentForm.is_published} onCheckedChange={(v) => setContentForm(f => ({ ...f, is_published: v }))} />
                <Label className="text-xs">공개</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={contentForm.is_preview} onCheckedChange={(v) => setContentForm(f => ({ ...f, is_preview: v }))} />
                <Label className="text-xs">미리보기 허용</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentDialogOpen(false)}>취소</Button>
            <Button onClick={() => upsertContentMutation.mutate()} disabled={!contentForm.title.trim() || upsertContentMutation.isPending}>
              {upsertContentMutation.isPending ? "저장 중..." : editingContentId ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Edit Dialog */}
      <Dialog open={courseEditOpen} onOpenChange={setCourseEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>강좌 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">강좌 제목</Label>
              <Input value={courseForm.title} onChange={(e) => setCourseForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">설명</Label>
              <Textarea value={courseForm.description} onChange={(e) => setCourseForm(f => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">상태</Label>
              <Select value={courseForm.status} onValueChange={(v) => setCourseForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">비공개</SelectItem>
                  <SelectItem value="published">공개</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseEditOpen(false)}>취소</Button>
            <Button onClick={() => updateCourseMutation.mutate(courseForm)} disabled={!courseForm.title.trim() || updateCourseMutation.isPending}>
              {updateCourseMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CourseDetail;
