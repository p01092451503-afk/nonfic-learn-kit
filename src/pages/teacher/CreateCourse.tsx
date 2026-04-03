import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Video, FileText, BarChart3,
  MonitorPlay, BookOpen, ExternalLink, Link2, Eye, ImagePlus, X, CalendarIcon,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { Database } from "@/integrations/supabase/types";

type ContentType = Database["public"]["Enums"]["content_type"];
type VideoProvider = Database["public"]["Enums"]["video_provider"];

// 강좌 유형: 동영상 강의 vs 플립러닝(망고보드)
type CourseKind = "video" | "flip";

interface ContentItem {
  tempId: string;
  title: string;
  description: string;
  content_type: ContentType;
  video_url: string;
  video_provider: VideoProvider | "";
  duration_minutes: number | null;
  is_preview: boolean;
  is_published: boolean;
}

const contentTypeOptions: { value: ContentType; label: string; icon: React.ElementType }[] = [
  { value: "video", label: "영상", icon: Video },
  { value: "document", label: "문서", icon: FileText },
  { value: "quiz", label: "퀴즈", icon: BarChart3 },
  { value: "assignment", label: "과제", icon: FileText },
  { value: "live", label: "라이브", icon: Video },
];

const videoProviderOptions: { value: VideoProvider; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "upload", label: "업로드 (CDN)" },
  { value: "custom", label: "직접 입력" },
];

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const layoutRole = isAdmin ? "admin" : "teacher";

  // Course kind
  const [courseKind, setCourseKind] = useState<CourseKind>("video");

  // Course fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("beginner");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("draft");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content items
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const buildDraftData = useCallback(() => ({
    courseKind, title, description, categoryId, difficultyLevel,
    estimatedHours, maxStudents, isMandatory, deadline, status, contents,
  }), [courseKind, title, description, categoryId, difficultyLevel, estimatedHours, maxStudents, isMandatory, deadline, status, contents]);

  const saveDraft = useCallback(async () => {
    if (!user) return;
    setSavingDraft(true);
    try {
      await (supabase.from("course_drafts" as any) as any).upsert({
        user_id: user.id,
        draft_data: buildDraftData(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      setLastSaved(new Date());
      toast({ title: "임시 저장 완료", description: "작업이 저장되었습니다." });
    } catch {
      toast({ title: "저장 실패", description: "임시 저장에 실패했습니다.", variant: "destructive" });
    } finally {
      setSavingDraft(false);
    }
  }, [user, buildDraftData, toast]);

  useEffect(() => {
    if (!user || draftLoaded) return;
    (async () => {
      const { data } = await (supabase.from("course_drafts" as any) as any).select("draft_data").eq("user_id", user.id).maybeSingle();
      if (data?.draft_data) {
        const d = data.draft_data as any;
        if (d.courseKind) setCourseKind(d.courseKind);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.categoryId) setCategoryId(d.categoryId);
        if (d.difficultyLevel) setDifficultyLevel(d.difficultyLevel);
        if (d.estimatedHours) setEstimatedHours(d.estimatedHours);
        if (d.maxStudents) setMaxStudents(d.maxStudents);
        if (d.isMandatory != null) setIsMandatory(d.isMandatory);
        if (d.deadline) setDeadline(d.deadline);
        if (d.status) setStatus(d.status);
        if (d.contents?.length) setContents(d.contents);
        toast({ title: "임시 저장 복원", description: "이전에 저장한 작업을 불러왔습니다." });
      }
      setDraftLoaded(true);
    })();
  }, [user, draftLoaded]);

  const deleteDraft = useCallback(async () => {
    if (!user) return;
    await (supabase.from("course_drafts" as any) as any).delete().eq("user_id", user.id);
  }, [user]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const addContent = () => {
    setContents((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        title: "",
        description: "",
        content_type: courseKind === "flip" ? "document" : "video",
        video_url: "",
        video_provider: courseKind === "flip" ? "custom" : "",
        duration_minutes: null,
        is_preview: false,
        is_published: true,
      },
    ]);
  };

  const updateContent = (tempId: string, field: keyof ContentItem, value: any) => {
    setContents((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value } : c))
    );
  };

  const removeContent = (tempId: string) => {
    setContents((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const uploadThumbnail = async (courseId: string): Promise<string | null> => {
    if (!thumbnailFile) return null;
    const ext = thumbnailFile.name.split(".").pop();
    const path = `${user!.id}/${courseId}.${ext}`;
    const { error } = await supabase.storage
      .from("course-thumbnails")
      .upload(path, thumbnailFile, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
    return data.publicUrl;
  };

  const applyImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "오류", description: "이미지 크기는 5MB 이하여야 합니다.", variant: "destructive" });
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyImageFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { applyImageFile(file); break; }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) applyImageFile(file);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // First create the course without thumbnail
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          title,
          description: description || null,
          category_id: categoryId || null,
          instructor_id: user!.id,
          difficulty_level: difficultyLevel,
          estimated_duration_hours: estimatedHours ? parseInt(estimatedHours) : null,
          max_students: maxStudents ? parseInt(maxStudents) : null,
          is_mandatory: isMandatory,
          deadline: deadline || null,
          status,
        })
        .select()
        .single();
      if (courseError) throw courseError;

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbnailUrl = await uploadThumbnail(course.id);
        if (thumbnailUrl) {
          await supabase.from("courses").update({ thumbnail_url: thumbnailUrl }).eq("id", course.id);
          course.thumbnail_url = thumbnailUrl;
        }
      }

      if (contents.length > 0) {
        const contentRows = contents.map((c, idx) => ({
          course_id: course.id,
          title: c.title,
          description: c.description || null,
          content_type: c.content_type,
          video_url: c.video_url || null,
          video_provider: c.video_provider || null,
          duration_minutes: c.duration_minutes,
          order_index: idx,
          is_preview: c.is_preview,
          is_published: c.is_published,
        }));
        const { error: contentError } = await supabase
          .from("course_contents")
          .insert(contentRows);
        if (contentError) throw contentError;
      }

      return course;
    },
    onSuccess: async (course) => {
      await deleteDraft();
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast({ title: "강좌 생성 완료", description: `"${course.title}" 강좌가 생성되었습니다.` });
      navigate(`/courses/${course.id}`);
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "오류", description: "강좌 제목을 입력해주세요.", variant: "destructive" });
      return;
    }
    const invalidContent = contents.find((c) => !c.title.trim());
    if (invalidContent) {
      toast({ title: "오류", description: "모든 콘텐츠의 제목을 입력해주세요.", variant: "destructive" });
      return;
    }
    // Validate mangoboard URLs for flip learning
    if (courseKind === "flip") {
      const noUrl = contents.find((c) => !c.video_url.trim());
      if (noUrl) {
        toast({ title: "오류", description: "모든 플립러닝 콘텐츠에 망고보드 링크를 입력해주세요.", variant: "destructive" });
        return;
      }
    }
    createMutation.mutate();
  };

  return (
    <DashboardLayout role={layoutRole}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> 돌아가기
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">새 강좌 만들기</h1>
          <p className="text-muted-foreground mt-1">강좌 유형을 선택하고 정보를 입력하세요.</p>
        </div>

        {/* Course Kind Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setCourseKind("flip")}
            className={`stat-card !p-5 !shadow-none hover:!shadow-none hover:!translate-y-0 text-left transition-all ${
              courseKind === "flip"
                ? "bg-[hsl(var(--flip-bg)/0.08)]"
                : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                courseKind === "flip" ? "bg-[hsl(var(--flip-bg))] text-[hsl(var(--flip-foreground))]" : "bg-[hsl(var(--flip-bg)/0.15)] text-[hsl(var(--flip-bg))]"
              }`}>
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">플립러닝</p>
                <p className="text-[10px] text-muted-foreground">망고보드 콘텐츠로 학습</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              망고보드에서 제작한 이미지·동영상 콘텐츠 링크를 활용하는 강좌입니다.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setCourseKind("video")}
            className={`stat-card !p-5 !shadow-none hover:!shadow-none hover:!translate-y-0 text-left transition-all ${
              courseKind === "video"
                ? "bg-[hsl(var(--video-bg)/0.08)]"
                : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                courseKind === "video" ? "bg-[hsl(var(--video-bg))] text-[hsl(var(--video-foreground))]" : "bg-[hsl(var(--video-bg)/0.15)] text-[hsl(var(--video-bg))]"
              }`}>
                <MonitorPlay className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">동영상 강의</p>
                <p className="text-[10px] text-muted-foreground">CDN 업로드 영상으로 수강</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              YouTube, Vimeo 또는 직접 업로드한 동영상을 통해 학습하는 강좌입니다.
            </p>
          </button>
        </div>

        {/* Course Info */}
        <div className="stat-card space-y-5">
          <h2 className="text-base font-semibold text-foreground border-b border-border pb-3">강좌 정보</h2>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">썸네일 이미지</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="hidden"
            />
            {thumbnailPreview ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-border">
                <img src={thumbnailPreview} alt="썸네일 미리보기" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 focus:border-primary/50 focus:outline-none flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={0}
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">클릭, 드래그 또는 Ctrl+V로 이미지 붙여넣기 (최대 5MB)</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">강좌 제목 *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 브랜드 마케팅 기초"
              className="h-11 rounded-xl border-border"
            
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">설명</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="강좌에 대한 설명을 입력하세요"
              className="min-h-[100px] rounded-xl border-border resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">카테고리</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-xl border-border">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999] max-h-60 overflow-y-auto">
                  {categories.length === 0 ? (
                    <SelectItem value="__empty" disabled>카테고리 없음</SelectItem>
                  ) : (
                    categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">난이도</label>
              <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                <SelectTrigger className="h-11 rounded-xl border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급</SelectItem>
                  <SelectItem value="intermediate">중급</SelectItem>
                  <SelectItem value="advanced">고급</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">예상 학습 시간 (시간)</label>
              <Input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="예: 10"
                className="h-11 rounded-xl border-border"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">최대 수강 인원</label>
              <Input
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                placeholder="제한 없음"
                className="h-11 rounded-xl border-border"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">마감일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-11 w-full rounded-xl border-border justify-start text-left font-normal ${!deadline ? "text-muted-foreground" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(parse(deadline, "yyyy-MM-dd", new Date()), "yyyy년 M월 d일") : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-lg border-border" align="start">
                  <Calendar
                    mode="single"
                    locale={ko}
                    selected={deadline ? parse(deadline, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => setDeadline(date ? format(date, "yyyy-MM-dd") : "")}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">공개 상태</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 rounded-xl border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">초안 (비공개)</SelectItem>
                  <SelectItem value="published">공개</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">필수 강좌</p>
              <p className="text-xs text-muted-foreground">필수 이수 강좌로 지정합니다</p>
            </div>
            <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
          </div>
        </div>

        {/* Contents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {courseKind === "flip" ? "플립러닝 콘텐츠" : "강의 콘텐츠"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {courseKind === "flip"
                  ? "망고보드 링크를 입력하여 콘텐츠를 추가하세요"
                  : "강좌에 포함될 콘텐츠를 추가하세요 (나중에 추가할 수도 있습니다)"}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addContent}>
              <Plus className="h-3.5 w-3.5" /> 콘텐츠 추가
            </Button>
          </div>

          {contents.length === 0 ? (
            <div className="stat-card text-center py-10 border-dashed">
              <div className="h-12 w-12 rounded-xl bg-accent mx-auto flex items-center justify-center mb-3">
                {courseKind === "flip" ? <BookOpen className="h-5 w-5 text-accent-foreground" /> : <MonitorPlay className="h-5 w-5 text-accent-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {courseKind === "flip" ? "망고보드 콘텐츠를 추가해주세요" : "아직 추가된 콘텐츠가 없습니다"}
              </p>
              <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addContent}>
                <Plus className="h-3.5 w-3.5" /> 첫 번째 콘텐츠 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contents.map((content, idx) => (
                courseKind === "flip" ? (
                  <FlipContentEditor
                    key={content.tempId}
                    content={content}
                    index={idx}
                    onChange={(field, value) => updateContent(content.tempId, field, value)}
                    onRemove={() => removeContent(content.tempId)}
                  />
                ) : (
                  <VideoContentEditor
                    key={content.tempId}
                    content={content}
                    index={idx}
                    onChange={(field, value) => updateContent(content.tempId, field, value)}
                    onRemove={() => removeContent(content.tempId)}
                  />
                )
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            취소
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl gap-2"
            onClick={saveDraft}
            disabled={savingDraft}
          >
            <Save className="h-4 w-4" />
            {savingDraft ? "저장 중..." : "임시 저장"}
          </Button>
          <Button
            type="submit"
            variant="login"
            size="xl"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "생성 중..." : "강좌 생성하기"}
          </Button>
          {lastSaved && (
            <span className="text-xs text-muted-foreground ml-auto">
              마지막 저장: {format(lastSaved, "HH:mm:ss")}
            </span>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
};

/* ───── Flip Learning (Mangoboard) Content Editor ───── */

const FlipContentEditor = ({
  content, index, onChange, onRemove,
}: {
  content: ContentItem;
  index: number;
  onChange: (field: keyof ContentItem, value: any) => void;
  onRemove: () => void;
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const isValidMangoboard = content.video_url.includes("mangoboard.net");

  const handlePreview = () => {
    if (!isValidMangoboard) return;
    setPreviewError(false);
    setPreviewLoading(true);
    setShowPreview(true);
  };

  return (
    <div className="stat-card !p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span className="text-xs font-medium">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <Input
          value={content.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="콘텐츠 제목 (예: 1강 - 마케팅 기초)"
          className="flex-1 h-9 rounded-lg border-border text-sm"
        />
        <Badge variant="secondary" className="text-[10px] shrink-0">플립러닝</Badge>
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="pl-14 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
            <Link2 className="h-3 w-3" /> 망고보드 링크 *
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={content.video_url}
                onChange={(e) => {
                  onChange("video_url", e.target.value);
                  onChange("video_provider", "custom");
                  setShowPreview(false);
                  setPreviewError(false);
                }}
                placeholder="https://www.mangoboard.net/publish/52632315"
                className="h-9 rounded-lg border-border text-xs pr-8"
              />
              {isValidMangoboard && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg gap-1.5 text-xs shrink-0 h-9"
              disabled={!isValidMangoboard}
              onClick={handlePreview}
            >
              <Eye className="h-3.5 w-3.5" />
              미리보기
            </Button>
            {isValidMangoboard && (
              <a
                href={normalizeMangoboardUrl(content.video_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                title="새 탭에서 열기"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            망고보드 공유 링크를 입력 후 미리보기 버튼을 눌러 확인하세요
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">콘텐츠 유형</label>
            <Select
              value={content.content_type}
              onValueChange={(v) => onChange("content_type", v as ContentType)}
            >
              <SelectTrigger className="h-9 rounded-lg border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">이미지/문서</SelectItem>
                <SelectItem value="video">동영상</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">소요 시간 (분)</label>
            <Input
              type="number"
              value={content.duration_minutes ?? ""}
              onChange={(e) => onChange("duration_minutes", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="분"
              className="h-9 rounded-lg border-border text-xs"
              min="0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">설명</label>
          <Textarea
            value={content.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="콘텐츠에 대한 설명 (선택사항)"
            className="min-h-[60px] rounded-lg border-border text-xs resize-none"
          />
        </div>

        {showPreview && isValidMangoboard && (
          <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate">{content.video_url}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
              >
                닫기
              </button>
            </div>
            <div className="relative aspect-video">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">로딩 중...</span>
                  </div>
                </div>
              )}
              {previewError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <ExternalLink className="h-5 w-5 text-destructive" />
                    </div>
                    <p className="text-xs text-muted-foreground">미리보기를 불러올 수 없습니다</p>
                    <a
                      href={normalizeMangoboardUrl(content.video_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      새 탭에서 직접 열기
                    </a>
                  </div>
                </div>
              )}
              <iframe
                src={normalizeMangoboardUrl(content.video_url)}
                className="w-full h-full"
                title="망고보드 미리보기"
                allowFullScreen
                onLoad={() => setPreviewLoading(false)}
                onError={() => { setPreviewLoading(false); setPreviewError(true); }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={content.is_preview} onCheckedChange={(v) => onChange("is_preview", v)} className="scale-75" />
            미리보기 허용
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={content.is_published} onCheckedChange={(v) => onChange("is_published", v)} className="scale-75" />
            공개
          </label>
        </div>
      </div>
    </div>
  );
};

/* ───── Video Content Editor (existing, refactored) ───── */

const VideoContentEditor = ({
  content, index, onChange, onRemove,
}: {
  content: ContentItem;
  index: number;
  onChange: (field: keyof ContentItem, value: any) => void;
  onRemove: () => void;
}) => {
  const Icon = contentTypeOptions.find((o) => o.value === content.content_type)?.icon || Video;

  return (
    <div className="stat-card !p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span className="text-xs font-medium">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
        <Input
          value={content.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="콘텐츠 제목"
          className="flex-1 h-9 rounded-lg border-border text-sm"
          required
        />
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 pl-14">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">유형</label>
          <Select value={content.content_type} onValueChange={(v) => onChange("content_type", v as ContentType)}>
            <SelectTrigger className="h-9 rounded-lg border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contentTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">소요 시간 (분)</label>
          <Input
            type="number"
            value={content.duration_minutes ?? ""}
            onChange={(e) => onChange("duration_minutes", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="분"
            className="h-9 rounded-lg border-border text-xs"
            min="0"
          />
        </div>
      </div>

      {(content.content_type === "video" || content.content_type === "live") && (
        <div className="grid grid-cols-3 gap-3 pl-14">
          <div className="col-span-2 space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">영상 URL</label>
            <Input
              value={content.video_url}
              onChange={(e) => onChange("video_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="h-9 rounded-lg border-border text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">제공처</label>
            <Select value={content.video_provider || ""} onValueChange={(v) => onChange("video_provider", v)}>
              <SelectTrigger className="h-9 rounded-lg border-border text-xs">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {videoProviderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="pl-14 space-y-1.5">
        <label className="text-[10px] font-medium text-muted-foreground uppercase">설명</label>
        <Textarea
          value={content.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="콘텐츠에 대한 설명 (선택사항)"
          className="min-h-[60px] rounded-lg border-border text-xs resize-none"
        />
      </div>

      <div className="flex items-center gap-6 pl-14">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch checked={content.is_preview} onCheckedChange={(v) => onChange("is_preview", v)} className="scale-75" />
          미리보기 허용
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch checked={content.is_published} onCheckedChange={(v) => onChange("is_published", v)} className="scale-75" />
          공개
        </label>
      </div>
    </div>
  );
};

/* ───── Helpers ───── */

function normalizeMangoboardUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith("http")) {
    normalized = "https://" + normalized;
  }
  return normalized;
}

export default CreateCourse;
