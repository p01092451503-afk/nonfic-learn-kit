import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Video, FileText, BarChart3,
  MonitorPlay, BookOpen, ExternalLink, Link2, Eye, ImagePlus, X, CalendarIcon,
  Save, Languages, Loader2,
} from "lucide-react";
import { translateKoToEn } from "@/lib/translate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import CategorySelect from "@/components/CategorySelect";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type ContentType = Database["public"]["Enums"]["content_type"];
type VideoProvider = Database["public"]["Enums"]["video_provider"];

type ContentSource = "video" | "mangoboard";

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
  source: ContentSource;
  enTitle: string;
  enDescription: string;
}

const CreateCourse = () => {
  const navigate = useNavigate();
  const { courseId: editCourseId } = useParams<{ courseId?: string }>();
  const isEditMode = !!editCourseId;
  const { user } = useUser();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const layoutRole = isAdmin ? "admin" : "teacher";

  const contentTypeOptions: { value: ContentType; label: string; icon: React.ElementType }[] = [
    { value: "video", label: t("createCourse.videoLabel"), icon: Video },
    { value: "document", label: t("createCourse.documentLabel"), icon: FileText },
    { value: "quiz", label: t("createCourse.quizLabel"), icon: BarChart3 },
    { value: "assignment", label: t("createCourse.assignmentLabel"), icon: FileText },
    { value: "live", label: t("createCourse.liveLabel"), icon: Video },
  ];

  const videoProviderOptions: { value: VideoProvider; label: string }[] = [
    { value: "youtube", label: "YouTube" },
    { value: "vimeo", label: "Vimeo" },
    { value: "upload", label: t("createCourse.uploadCdn") },
    { value: "custom", label: t("createCourse.customInput") },
  ];

  // Course fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [enTitle, setEnTitle] = useState("");
  const [enDescription, setEnDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("beginner");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [translatingCourse, setTranslatingCourse] = useState(false);
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
  const [editDataLoaded, setEditDataLoaded] = useState(false);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);

  // Load existing course data for edit mode
  useEffect(() => {
    if (!isEditMode || !editCourseId || editDataLoaded) return;
    (async () => {
      const { data: course, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", editCourseId)
        .single();
      if (error || !course) {
        toast({ title: t("common.error"), description: "강좌를 찾을 수 없습니다.", variant: "destructive" });
        navigate(-1);
        return;
      }
      setTitle(course.title || "");
      setDescription(course.description || "");
      setCategoryId(course.category_id || "");
      setDifficultyLevel(course.difficulty_level || "beginner");
      setEstimatedHours(course.estimated_duration_hours ? String(course.estimated_duration_hours) : "");
      setMaxStudents(course.max_students ? String(course.max_students) : "");
      setIsMandatory(course.is_mandatory || false);
      setDeadline(course.deadline || "");
      setStatus(course.status || "draft");
      if (course.thumbnail_url) {
        setThumbnailPreview(course.thumbnail_url);
        setExistingThumbnailUrl(course.thumbnail_url);
      }

      // Load course i18n
      const { data: courseI18n } = await supabase
        .from("course_i18n")
        .select("*")
        .eq("course_id", editCourseId)
        .eq("language_code", "en")
        .maybeSingle();
      if (courseI18n) {
        setEnTitle(courseI18n.title || "");
        setEnDescription(courseI18n.description || "");
      }

      // Load contents
      const { data: courseContents } = await supabase
        .from("course_contents")
        .select("*")
        .eq("course_id", editCourseId)
        .order("order_index", { ascending: true });

      // Load content i18n
      const { data: contentI18ns } = await supabase
        .from("course_content_i18n")
        .select("*")
        .eq("language_code", "en");

      const i18nMap = new Map((contentI18ns || []).map((i: any) => [i.content_id, i]));

      if (courseContents?.length) {
        setContents(courseContents.map((c: any) => {
          const en = i18nMap.get(c.id);
          return {
            tempId: c.id,
            title: c.title || "",
            description: c.description || "",
            content_type: c.content_type || "video",
            video_url: c.video_url || "",
            video_provider: c.video_provider || "",
            duration_minutes: c.duration_minutes,
            is_preview: c.is_preview || false,
            is_published: c.is_published || false,
            source: c.video_url?.includes("mangoboard") ? "mangoboard" as ContentSource : "video" as ContentSource,
            enTitle: en?.title || "",
            enDescription: en?.description || "",
          };
        }));
      }
      setEditDataLoaded(true);
      setDraftLoaded(true);
    })();
  }, [isEditMode, editCourseId, editDataLoaded]);

  // Real-time sync KO → EN for course (copy raw text so EN is never empty)
  useEffect(() => {
    if (!enTitle && title) setEnTitle(title);
    if (!enDescription && description) setEnDescription(description);
  }, [title, description]);

  // Auto-translate course info
  const handleTranslateCourse = async () => {
    const texts = [title, description].filter(Boolean);
    if (!texts.length) return;
    setTranslatingCourse(true);
    try {
      const results = await translateKoToEn(texts);
      let idx = 0;
      if (title) setEnTitle(results[idx++] || "");
      if (description) setEnDescription(results[idx++] || "");
    } catch { /* silent */ }
    finally { setTranslatingCourse(false); }
  };

  const buildDraftData = useCallback(() => ({
    title, description, categoryId, difficultyLevel,
    estimatedHours, maxStudents, isMandatory, deadline, status, contents,
  }), [title, description, categoryId, difficultyLevel, estimatedHours, maxStudents, isMandatory, deadline, status, contents]);

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
      toast({ title: t("createCourse.draftSaved"), description: t("createCourse.draftSavedDesc") });
    } catch {
      toast({ title: t("createCourse.draftFailed"), description: t("createCourse.draftFailedDesc"), variant: "destructive" });
    } finally {
      setSavingDraft(false);
    }
  }, [user, buildDraftData, toast, t]);

  useEffect(() => {
    if (!user || draftLoaded || isEditMode) return;
    (async () => {
      const { data } = await (supabase.from("course_drafts" as any) as any).select("draft_data").eq("user_id", user.id).maybeSingle();
      if (data?.draft_data) {
        const d = data.draft_data as any;
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.categoryId) setCategoryId(d.categoryId);
        if (d.difficultyLevel) setDifficultyLevel(d.difficultyLevel);
        if (d.estimatedHours) setEstimatedHours(d.estimatedHours);
        if (d.maxStudents) setMaxStudents(d.maxStudents);
        if (d.isMandatory != null) setIsMandatory(d.isMandatory);
        if (d.deadline) setDeadline(d.deadline);
        if (d.status) setStatus(d.status);
        if (d.contents?.length) setContents(d.contents.map((c: any) => ({ ...c, source: c.source || (c.video_url?.includes("mangoboard") ? "mangoboard" : "video") })));
        toast({ title: t("createCourse.draftRestored"), description: t("createCourse.draftRestoredDesc") });
      }
      setDraftLoaded(true);
    })();
  }, [user, draftLoaded, isEditMode]);

  const deleteDraft = useCallback(async () => {
    if (!user) return;
    await (supabase.from("course_drafts" as any) as any).delete().eq("user_id", user.id);
  }, [user]);

  const addContent = () => {
    setContents((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        title: "",
        description: "",
        content_type: "video",
        video_url: "",
        video_provider: "",
        duration_minutes: null,
        is_preview: false,
        is_published: true,
        source: "video",
        enTitle: "",
        enDescription: "",
      },
    ]);
  };

  const updateContent = (tempId: string, field: keyof ContentItem, value: any) => {
    setContents((prev) =>
      prev.map((c) => {
        if (c.tempId !== tempId) return c;
        const updated = { ...c, [field]: value };
        // When switching source, reset relevant fields
        if (field === "source") {
          if (value === "mangoboard") {
            updated.content_type = "document";
            updated.video_provider = "custom";
            updated.video_url = "";
          } else {
            updated.content_type = "video";
            updated.video_provider = "";
            updated.video_url = "";
          }
        }
        return updated;
      })
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
      toast({ title: t("common.error"), description: t("createCourse.imageSizeError"), variant: "destructive" });
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      let thumbnailUrl = existingThumbnailUrl;
      if (thumbnailFile) {
        thumbnailUrl = await uploadThumbnail(editCourseId!);
      }

      const { error: courseError } = await supabase
        .from("courses")
        .update({
          title,
          description: description || null,
          category_id: categoryId || null,
          difficulty_level: difficultyLevel,
          estimated_duration_hours: estimatedHours ? parseInt(estimatedHours) : null,
          max_students: maxStudents ? parseInt(maxStudents) : null,
          is_mandatory: isMandatory,
          deadline: deadline || null,
          status,
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editCourseId!);
      if (courseError) throw courseError;

      // Delete existing contents and re-insert
      await supabase.from("course_content_i18n").delete().eq("language_code", "en").in("content_id",
        (await supabase.from("course_contents").select("id").eq("course_id", editCourseId!)).data?.map((c: any) => c.id) || []
      );
      await supabase.from("course_contents").delete().eq("course_id", editCourseId!);

      // Save course i18n
      if (enTitle || enDescription) {
        await supabase.from("course_i18n").upsert({
          course_id: editCourseId!,
          language_code: "en",
          title: enTitle || title,
          description: enDescription || description || null,
        }, { onConflict: "course_id,language_code" });
      }

      if (contents.length > 0) {
        const contentRows = contents.map((c, idx) => ({
          course_id: editCourseId!,
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
        const { data: insertedContents, error: contentError } = await supabase
          .from("course_contents")
          .insert(contentRows)
          .select("id");
        if (contentError) throw contentError;

        // Save content i18n
        if (insertedContents?.length) {
          const i18nRows = insertedContents.map((ic: any, idx: number) => ({
            content_id: ic.id,
            language_code: "en",
            title: contents[idx].enTitle || contents[idx].title,
            description: contents[idx].enDescription || contents[idx].description || null,
          })).filter((r: any) => r.title);
          if (i18nRows.length) {
            await supabase.from("course_content_i18n").insert(i18nRows);
          }
        }
      }

      return { id: editCourseId!, title };
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", editCourseId] });
      toast({ title: t("createCourse.courseUpdated", "강좌가 수정되었습니다"), description: title });
      navigate(-1);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
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

      if (thumbnailFile) {
        const thumbnailUrl = await uploadThumbnail(course.id);
        if (thumbnailUrl) {
          await supabase.from("courses").update({ thumbnail_url: thumbnailUrl }).eq("id", course.id);
          course.thumbnail_url = thumbnailUrl;
        }
      }

      // Save course i18n
      if (enTitle || enDescription) {
        await supabase.from("course_i18n").insert({
          course_id: course.id,
          language_code: "en",
          title: enTitle || title,
          description: enDescription || description || null,
        });
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
        const { data: insertedContents, error: contentError } = await supabase
          .from("course_contents")
          .insert(contentRows)
          .select("id");
        if (contentError) throw contentError;

        // Save content i18n
        if (insertedContents?.length) {
          const i18nRows = insertedContents.map((ic: any, idx: number) => ({
            content_id: ic.id,
            language_code: "en",
            title: contents[idx].enTitle || contents[idx].title,
            description: contents[idx].enDescription || contents[idx].description || null,
          })).filter((r: any) => r.title);
          if (i18nRows.length) {
            await supabase.from("course_content_i18n").insert(i18nRows);
          }
        }
      }

      return course;
    },
    onSuccess: async (course) => {
      await deleteDraft();
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast({ title: t("createCourse.courseCreated"), description: t("createCourse.courseCreatedDesc", { title: course.title }) });
      navigate(`/courses/${course.id}`);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: t("common.error"), description: t("createCourse.titleRequired2"), variant: "destructive" });
      return;
    }
    const invalidContent = contents.find((c) => !c.title.trim());
    if (invalidContent) {
      toast({ title: t("common.error"), description: t("createCourse.contentTitleRequired"), variant: "destructive" });
      return;
    }
    const noUrlMango = contents.find((c) => c.source === "mangoboard" && !c.video_url.trim());
    if (noUrlMango) {
      toast({ title: t("common.error"), description: t("createCourse.flipUrlRequired"), variant: "destructive" });
      return;
    }
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const dateLocale = isEn ? enUS : ko;
  const formatDeadline = (d: string) => {
    const parsed = parse(d, "yyyy-MM-dd", new Date());
    return isEn ? format(parsed, "MMM d, yyyy") : format(parsed, "yyyy년 M월 d일");
  };

  return (
    <DashboardLayout role={layoutRole}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t("createCourse.backButton")}
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isEditMode ? t("createCourse.editTitle", "강좌 수정") : t("createCourse.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? t("createCourse.editSubtitle", "강좌 정보와 콘텐츠를 수정할 수 있습니다.") : t("createCourse.subtitle")}
          </p>
        </div>

        {/* Course Info */}
        <div className="stat-card space-y-5">
          <h2 className="text-base font-semibold text-foreground border-b border-border pb-3">{t("createCourse.courseInfo")}</h2>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.thumbnailLabel")}</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
            {thumbnailPreview ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-border">
                <img src={thumbnailPreview} alt={t("createCourse.thumbnailAlt")} className="w-full h-full object-cover" />
                <button type="button" onClick={removeThumbnail} className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} onPaste={handlePaste} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 focus:border-primary/50 focus:outline-none flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={0}>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">{t("createCourse.thumbnailDropHint")}</span>
              </button>
            )}
          </div>

          <Tabs defaultValue="ko" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="ko" className="flex-1">{t("course.koTab", "한국어")}</TabsTrigger>
              <TabsTrigger value="en" className="flex-1">{t("course.enTab", "English")}</TabsTrigger>
            </TabsList>

            <TabsContent value="ko" className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.courseTitleRequired")}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("createCourse.courseTitleExample")} className="h-11 rounded-xl border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.descriptionLabel")}</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("createCourse.descriptionPlaceholder2")} className="min-h-[100px] rounded-xl border-border resize-none" />
              </div>
            </TabsContent>

            <TabsContent value="en" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("course.enOptional", "영어 버전 (선택)")}</p>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleTranslateCourse} disabled={translatingCourse || (!title && !description)}>
                  {translatingCourse ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                  {t("course.autoTranslate", "자동 번역")}
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("course.enTitle", "영어 제목")}</label>
                <Input value={enTitle} onChange={(e) => setEnTitle(e.target.value)} placeholder="English title" className="h-11 rounded-xl border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("course.enDescription", "영어 설명")}</label>
                <Textarea value={enDescription} onChange={(e) => setEnDescription(e.target.value)} placeholder="English description" className="min-h-[100px] rounded-xl border-border resize-none" />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.categoryLabel2")}</label>
              <CategorySelect value={categoryId} onValueChange={setCategoryId} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.difficultyLabel2")}</label>
              <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                <SelectTrigger className="h-11 rounded-xl border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">{t("createCourse.beginnerLevel")}</SelectItem>
                  <SelectItem value="intermediate">{t("createCourse.intermediateLevel")}</SelectItem>
                  <SelectItem value="advanced">{t("createCourse.advancedLevel")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.estimatedDurationLabel")}</label>
              <Input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder={t("createCourse.estimatedDurationExample")} className="h-11 rounded-xl border-border" min="0" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.maxStudentsLabel")}</label>
              <Input type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} placeholder={t("createCourse.maxStudentsPlaceholder")} className="h-11 rounded-xl border-border" min="1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.deadlineLabelCreate")}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`h-11 w-full rounded-xl border-border justify-start text-left font-normal ${!deadline ? "text-muted-foreground" : ""}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? formatDeadline(deadline) : t("createCourse.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-lg border-border" align="start">
                  <Calendar mode="single" locale={dateLocale} selected={deadline ? parse(deadline, "yyyy-MM-dd", new Date()) : undefined} onSelect={(date) => setDeadline(date ? format(date, "yyyy-MM-dd") : "")} initialFocus className="rounded-2xl" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("createCourse.publishStatusLabel")}</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 rounded-xl border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("createCourse.draftPrivate")}</SelectItem>
                  <SelectItem value="published">{t("createCourse.publishedOpen")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{t("createCourse.mandatoryLabel")}</p>
              <p className="text-xs text-muted-foreground">{t("createCourse.mandatoryDesc2")}</p>
            </div>
            <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
          </div>
        </div>

        {/* Contents */}
        <div className="bg-accent/50 border border-accent rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("createCourse.contentSectionTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("createCourse.contentSectionHint")}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addContent}>
              <Plus className="h-3.5 w-3.5" /> {t("createCourse.addContentBtn")}
            </Button>
          </div>

          {contents.length === 0 ? (
            <div className="stat-card text-center py-10 border-dashed">
              <div className="h-12 w-12 rounded-xl bg-accent mx-auto flex items-center justify-center mb-3">
                <MonitorPlay className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{t("createCourse.emptyContentHint")}</p>
              <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addContent}>
                <Plus className="h-3.5 w-3.5" /> {t("createCourse.addFirstContent")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contents.map((content, idx) => (
                <UnifiedContentEditor
                  key={content.tempId}
                  content={content}
                  index={idx}
                  onChange={(field, value) => updateContent(content.tempId, field, value)}
                  onRemove={() => removeContent(content.tempId)}
                  contentTypeOptions={contentTypeOptions}
                  videoProviderOptions={videoProviderOptions}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            {t("createCourse.cancel")}
          </Button>
          {!isEditMode && (
            <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={saveDraft} disabled={savingDraft}>
              <Save className="h-4 w-4" />
              {savingDraft ? t("createCourse.savingBtn") : t("createCourse.saveDraftBtn")}
            </Button>
          )}
          <Button type="submit" variant="login" size="xl" disabled={isEditMode ? updateMutation.isPending : createMutation.isPending}>
            {isEditMode
              ? (updateMutation.isPending ? t("createCourse.updatingBtn", "수정 중...") : t("createCourse.updateBtn", "수정하기"))
              : (createMutation.isPending ? t("createCourse.creatingBtn") : t("createCourse.createBtn"))
            }
          </Button>
          {!isEditMode && lastSaved && (
            <span className="text-xs text-muted-foreground ml-auto">
              {t("createCourse.lastSaved", { time: format(lastSaved, "HH:mm:ss") })}
            </span>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
};

/* ───── Unified Content Editor ───── */

const UnifiedContentEditor = ({
  content, index, onChange, onRemove, contentTypeOptions, videoProviderOptions, t,
}: {
  content: ContentItem;
  index: number;
  onChange: (field: keyof ContentItem, value: any) => void;
  onRemove: () => void;
  contentTypeOptions: { value: ContentType; label: string; icon: React.ElementType }[];
  videoProviderOptions: { value: VideoProvider; label: string }[];
  t: (key: string) => string;
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const isMango = content.source === "mangoboard";
  const isValidMangoboard = isMango && content.video_url.includes("mangoboard.net");
  const Icon = isMango ? BookOpen : (contentTypeOptions.find((o) => o.value === content.content_type)?.icon || Video);

  // Real-time sync KO → EN
  useEffect(() => {
    if (!content.enTitle && content.title) onChange("enTitle", content.title);
    if (!content.enDescription && content.description) onChange("enDescription", content.description);
  }, [content.title, content.description]);

  const handleTranslateContent = async () => {
    const texts = [content.title, content.description].filter(Boolean);
    if (!texts.length) return;
    setTranslating(true);
    try {
      const results = await translateKoToEn(texts);
      let idx = 0;
      if (content.title) onChange("enTitle", results[idx++] || "");
      if (content.description) onChange("enDescription", results[idx++] || "");
    } catch { /* silent */ }
    finally { setTranslating(false); }
  };

  const handlePreview = () => {
    if (!isValidMangoboard) return;
    setPreviewError(false);
    setPreviewLoading(true);
    setShowPreview(true);
  };

  return (
    <div className="stat-card !p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span className="text-xs font-medium">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isMango ? "bg-primary/10" : "bg-accent"}`}>
          <Icon className={`h-4 w-4 ${isMango ? "text-primary" : "text-accent-foreground"}`} />
        </div>
        <Input value={content.title} onChange={(e) => onChange("title", e.target.value)} placeholder={t("createCourse.contentTitlePlaceholder")} className="flex-1 h-9 rounded-lg border-border text-sm" required />
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="pl-14 space-y-3">
        {/* Source selector: 동영상 vs 망고보드 */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.contentSourceLabel")}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange("source", "video")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                !isMango
                  ? "bg-accent text-foreground border-border"
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-accent/50"
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              {t("createCourse.sourceVideo")}
            </button>
            <button
              type="button"
              onClick={() => onChange("source", "mangoboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                isMango
                  ? "bg-accent text-foreground border-border"
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-accent/50"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t("createCourse.sourceMangoboard")}
            </button>
          </div>
        </div>

        {isMango ? (
          /* ── Mangoboard fields ── */
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                <Link2 className="h-3 w-3" /> {t("createCourse.mangoLinkLabel")}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input value={content.video_url} onChange={(e) => { onChange("video_url", e.target.value); setShowPreview(false); setPreviewError(false); }} placeholder="https://www.mangoboard.net/publish/52632315" className="h-9 rounded-lg border-border text-xs pr-8" />
                  {isValidMangoboard && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                    </div>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs shrink-0 h-9" disabled={!isValidMangoboard} onClick={handlePreview}>
                  <Eye className="h-3.5 w-3.5" /> {t("createCourse.preview")}
                </Button>
                {isValidMangoboard && (
                  <a href={normalizeMangoboardUrl(content.video_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0" title={t("createCourse.openNewTab")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{t("createCourse.mangoHint")}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.durationLabel")}</label>
              <Input type="number" value={content.duration_minutes ?? ""} onChange={(e) => onChange("duration_minutes", e.target.value ? parseInt(e.target.value) : null)} placeholder={t("createCourse.durationPlaceholder")} className="h-9 rounded-lg border-border text-xs" min="0" />
            </div>

            {showPreview && isValidMangoboard && (
              <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground truncate">{content.video_url}</span>
                  </div>
                  <button type="button" onClick={() => setShowPreview(false)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
                    {t("createCourse.closePreview")}
                  </button>
                </div>
                <div className="relative aspect-video">
                  {previewLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-muted-foreground">{t("createCourse.loadingText")}</span>
                      </div>
                    </div>
                  )}
                  {previewError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-destructive" />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("createCourse.previewFailed")}</p>
                        <a href={normalizeMangoboardUrl(content.video_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {t("createCourse.openDirectly")}
                        </a>
                      </div>
                    </div>
                  )}
                  <iframe src={normalizeMangoboardUrl(content.video_url)} className="w-full h-full" title={t("createCourse.mangoPreviewTitle")} allowFullScreen onLoad={() => setPreviewLoading(false)} onError={() => { setPreviewLoading(false); setPreviewError(true); }} />
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Video fields ── */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.typeLabel")}</label>
                <Select value={content.content_type} onValueChange={(v) => onChange("content_type", v as ContentType)}>
                  <SelectTrigger className="h-9 rounded-lg border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contentTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.durationLabel")}</label>
                <Input type="number" value={content.duration_minutes ?? ""} onChange={(e) => onChange("duration_minutes", e.target.value ? parseInt(e.target.value) : null)} placeholder={t("createCourse.durationPlaceholder")} className="h-9 rounded-lg border-border text-xs" min="0" />
              </div>
            </div>

            {(content.content_type === "video" || content.content_type === "live") && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.videoUrlLabel")}</label>
                  <Input value={content.video_url} onChange={(e) => onChange("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="h-9 rounded-lg border-border text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.providerLabel")}</label>
                  <Select value={content.video_provider || ""} onValueChange={(v) => onChange("video_provider", v)}>
                    <SelectTrigger className="h-9 rounded-lg border-border text-xs">
                      <SelectValue placeholder={t("createCourse.providerPlaceholder")} />
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
          </>
        )}

        {/* Common fields */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t("createCourse.descLabel")}</label>
          <Textarea value={content.description} onChange={(e) => onChange("description", e.target.value)} placeholder={t("createCourse.contentDescPlaceholder")} className="min-h-[60px] rounded-lg border-border text-xs resize-none" />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={content.is_preview} onCheckedChange={(v) => onChange("is_preview", v)} className="scale-75" />
            {t("createCourse.allowPreview")}
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={content.is_published} onCheckedChange={(v) => onChange("is_published", v)} className="scale-75" />
            {t("createCourse.publishToggle")}
          </label>
        </div>
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
