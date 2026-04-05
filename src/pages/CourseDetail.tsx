import { useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Clock, Users, ArrowLeft, CheckCircle2, Lock,
  FileText, Video, ChevronRight, BarChart3, Plus, Pencil,
  Trash2, Eye, EyeOff, Settings, ChevronUp, ChevronDown,
  GripVertical, ExternalLink, Copy, MoreHorizontal,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const contentTypeIcon: Record<string, React.ElementType> = {
  video: Video, document: FileText, quiz: BarChart3, assignment: FileText, live: Video,
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

type ContentI18nData = {
  title: string;
  description: string;
  video_url: string;
  video_provider: string;
  duration_minutes: number | null;
};

const emptyContent: ContentFormData = {
  title: "", content_type: "video", video_url: "", video_provider: "",
  duration_minutes: null, description: "", is_preview: false, is_published: true,
};

const emptyI18n: ContentI18nData = {
  title: "", description: "", video_url: "", video_provider: "", duration_minutes: null,
};

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { primaryRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState<ContentFormData>(emptyContent);
  const [contentEnForm, setContentEnForm] = useState<ContentI18nData>(emptyI18n);
  const [courseEditOpen, setCourseEditOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", status: "draft", is_mandatory: false, deadline: "" });
  const [courseEnForm, setCourseEnForm] = useState({ title: "", description: "" });

  // Determine view context
  const isAdminRoute = location.pathname.startsWith("/admin/courses/");
  const isTeacherRoute = location.pathname.startsWith("/teacher/courses/");
  const forceLearnView = searchParams.get("view") === "learn";
  const role: "admin" | "teacher" | "student" = isAdminRoute
    ? "admin"
    : isTeacherRoute
    ? "teacher"
    : "student";
  const isTeacherOrAdmin = role === "admin" || role === "teacher";
  const routePrefix = isAdminRoute ? "/admin" : isTeacherRoute ? "/teacher" : "/student";
  const viewParam = role === "student" ? "?view=learn" : "";

  // --- Queries ---
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: courseI18n } = useQuery({
    queryKey: ["course-i18n", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("course_i18n").select("*").eq("course_id", courseId!);
      return data || [];
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

  const { data: contentI18nData = [] } = useQuery({
    queryKey: ["content-i18n", courseId],
    queryFn: async () => {
      const contentIds = contents.map(c => c.id);
      if (contentIds.length === 0) return [];
      const { data } = await supabase.from("course_content_i18n").select("*").in("content_id", contentIds);
      return data || [];
    },
    enabled: contents.length > 0,
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

  // i18n helpers
  const getContentI18n = (contentId: string, lang: string) =>
    contentI18nData.find((i: any) => i.content_id === contentId && i.language_code === lang);

  const stripLessonPrefix = (title: string) =>
    title.replace(/^\d+차시\.\s*/, "");

  const getLocalizedContentTitle = (content: any) => {
    if (isEn) {
      const en = getContentI18n(content.id, "en");
      return stripLessonPrefix(en?.title || content.title);
    }
    return stripLessonPrefix(content.title);
  };

  const getCourseTitle = () => {
    if (isEn) {
      const en = courseI18n?.find((i: any) => i.language_code === "en");
      return en?.title || course?.title || "";
    }
    return course?.title || "";
  };

  const getCourseDesc = () => {
    if (isEn) {
      const en = courseI18n?.find((i: any) => i.language_code === "en");
      return en?.description || course?.description || "";
    }
    return course?.description || "";
  };

  // --- Mutations ---
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    queryClient.invalidateQueries({ queryKey: ["course-contents", courseId] });
    queryClient.invalidateQueries({ queryKey: ["content-i18n", courseId] });
    queryClient.invalidateQueries({ queryKey: ["course-i18n", courseId] });
  };

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({ user_id: user!.id, course_id: courseId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId] });
      toast({ title: t("course.enrollmentComplete") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (vals: { title: string; description: string; status: string; is_mandatory: boolean; deadline: string }) => {
      const { error } = await supabase.from("courses").update({
        title: vals.title,
        description: vals.description,
        status: vals.status,
        is_mandatory: vals.is_mandatory,
        deadline: vals.deadline || null,
      }).eq("id", courseId!);
      if (error) throw error;
      // Upsert English i18n
      if (courseEnForm.title.trim()) {
        await supabase.from("course_i18n").upsert({
          course_id: courseId!,
          language_code: "en",
          title: courseEnForm.title,
          description: courseEnForm.description || null,
        }, { onConflict: "course_id,language_code" });
      }
    },
    onSuccess: () => { invalidateAll(); setCourseEditOpen(false); toast({ title: t("course.courseModified") }); },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
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

      let savedContentId = editingContentId;

      if (editingContentId) {
        const { error } = await supabase.from("course_contents").update(payload).eq("id", editingContentId);
        if (error) throw error;
      } else {
        const maxOrder = contents.length > 0 ? Math.max(...contents.map(c => c.order_index ?? 0)) + 1 : 0;
        const { data, error } = await supabase.from("course_contents").insert({ ...payload, order_index: maxOrder }).select("id").single();
        if (error) throw error;
        savedContentId = data.id;
      }

      // Upsert English i18n if provided
      if (savedContentId && contentEnForm.title.trim()) {
        await supabase.from("course_content_i18n").upsert({
          content_id: savedContentId,
          language_code: "en",
          title: contentEnForm.title,
          description: contentEnForm.description || null,
          video_url: contentEnForm.video_url || null,
          video_provider: contentEnForm.video_provider || null,
          duration_minutes: contentEnForm.duration_minutes,
        }, { onConflict: "content_id,language_code" });
      }
    },
    onSuccess: () => {
      invalidateAll();
      setContentDialogOpen(false);
      setEditingContentId(null);
      setContentForm(emptyContent);
      setContentEnForm(emptyI18n);
      toast({ title: editingContentId ? t("course.contentModified") : t("course.contentAdded") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: t("course.contentDeleted") }); },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
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
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("course_contents").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  // --- Helpers ---
  const openAddContent = () => {
    setEditingContentId(null);
    setContentForm(emptyContent);
    setContentEnForm(emptyI18n);
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
    // Load English i18n
    const enI18n = getContentI18n(c.id, "en");
    setContentEnForm(enI18n ? {
      title: enI18n.title || "", description: enI18n.description || "",
      video_url: enI18n.video_url || "", video_provider: enI18n.video_provider || "",
      duration_minutes: enI18n.duration_minutes,
    } : emptyI18n);
    setContentDialogOpen(true);
  };
  const openCourseEdit = () => {
    if (!course) return;
    setCourseForm({
      title: course.title,
      description: course.description || "",
      status: course.status || "draft",
      is_mandatory: course.is_mandatory || false,
      deadline: course.deadline || "",
    });
    const enCourse = courseI18n?.find((i: any) => i.language_code === "en");
    setCourseEnForm({ title: enCourse?.title || "", description: enCourse?.description || "" });
    setCourseEditOpen(true);
  };

  const progressMap = new Map(progressData.map((p) => [p.content_id, p]));
  const completedCount = progressData.filter((p) => p.completed).length;
  const overallProgress = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;
  const publishedCount = contents.filter(c => c.is_published).length;
  const totalDuration = contents.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

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
          <p className="text-muted-foreground">{t("course.courseNotFound")}</p>
          <Button variant="outline" onClick={() => navigate(`${routePrefix}/courses`)}>{t("common.back")}</Button>
        </div>
      </DashboardLayout>
    );
  }

  // ===== TEACHER / ADMIN VIEW =====
  if (isTeacherOrAdmin) {
    return (
      <DashboardLayout role={role}>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(role === "admin" ? "/admin/courses" : "/teacher/courses")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("course.backToCourseList")}
            </button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={openCourseEdit}>
                <Settings className="h-3 w-3" /> {t("course.courseSettings")}
              </Button>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openAddContent}>
                <Plus className="h-3 w-3" /> {t("course.addContent")}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-4">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" className="h-20 w-32 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-20 w-32 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={course.status === "published" ? "default" : "secondary"} className="text-[10px] h-5">
                    {course.status === "published" ? t("course.publishedStatus") : t("course.draftStatus")}
                  </Badge>
                  {course.is_mandatory && <Badge variant="destructive" className="text-[10px] h-5">{t("course.mandatory")}</Badge>}
                </div>
                <h1 className="text-base font-semibold text-foreground leading-snug">{getCourseTitle()}</h1>
                {getCourseDesc() && <p className="text-xs text-muted-foreground line-clamp-2">{getCourseDesc()}</p>}
              </div>
            </div>
            <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> {t("course.content")} <span className="font-semibold text-foreground">{contents.length}</span> | {t("course.publishedStatus")} <span className="font-semibold text-foreground">{publishedCount}</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {totalDuration}{t("common.minutes")}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {enrollmentCount}
              </span>
            </div>
          </div>

          {/* Content list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-secondary/30 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">{t("course.contentList")} ({contents.length})</h2>
            </div>
            {contents.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center mx-auto">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{t("course.noContents")}</p>
                <Button variant="outline" size="sm" onClick={openAddContent} className="gap-1.5 text-xs">
                  <Plus className="h-3 w-3" /> {t("course.addFirstContent")}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {contents.map((content, idx) => {
                  const Icon = contentTypeIcon[content.content_type || "video"] || Video;
                  const isUnpublished = !content.is_published;
                  return (
                    <div key={content.id} className={`flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors group ${isUnpublished ? "opacity-50" : ""}`}>
                      <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:pointer-events-none" disabled={idx === 0} onClick={() => reorderMutation.mutate({ id: content.id, newIndex: idx - 1 })}>
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:pointer-events-none" disabled={idx === contents.length - 1} onClick={() => reorderMutation.mutate({ id: content.id, newIndex: idx + 1 })}>
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-center shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                      <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{getLocalizedContentTitle(content)}</span>
                          {isUnpublished && <Badge variant="outline" className="text-[9px] h-4 border-dashed shrink-0">{t("course.draftStatus")}</Badge>}
                          {content.is_preview && <Badge variant="secondary" className="text-[9px] h-4 shrink-0">{t("course.allowPreview")}</Badge>}
                        </div>
                      </div>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ${content.video_provider === "custom" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                        {content.video_provider === "custom" ? t("course.flip") : t("course.video")}
                      </span>
                      <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">
                        {content.duration_minutes ? `${content.duration_minutes}${t("common.minutes")}` : "-"}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent" onClick={() => togglePublishMutation.mutate({ id: content.id, published: !content.is_published })}>
                          {content.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent" onClick={() => navigate(`${routePrefix}/courses/${courseId}/content/${content.id}${viewParam}`)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent" onClick={() => openEditContent(content)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("course.deleteContent")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("course.deleteContentConfirm", { title: content.title })}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteContentMutation.mutate(content.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Content Add/Edit Dialog with i18n tabs */}
        <ContentDialog
          open={contentDialogOpen}
          onOpenChange={setContentDialogOpen}
          form={contentForm}
          setForm={setContentForm}
          enForm={contentEnForm}
          setEnForm={setContentEnForm}
          editingId={editingContentId}
          onSubmit={() => upsertContentMutation.mutate()}
          isPending={upsertContentMutation.isPending}
          t={t}
        />

        {/* Course Edit Dialog with i18n tabs */}
        <CourseEditDialog
          open={courseEditOpen}
          onOpenChange={setCourseEditOpen}
          form={courseForm}
          setForm={setCourseForm}
          enForm={courseEnForm}
          setEnForm={setCourseEnForm}
          onSubmit={() => updateCourseMutation.mutate(courseForm)}
          isPending={updateCourseMutation.isPending}
          t={t}
        />
      </DashboardLayout>
    );
  }

  // ===== STUDENT VIEW =====
  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <button onClick={() => navigate("/dashboard/courses")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("course.myCourseRoom")}
        </button>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-4">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <BookOpen className="h-7 w-7 text-accent-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {course.is_mandatory && <Badge variant="destructive" className="text-[10px]">{t("course.mandatory")}</Badge>}
              </div>
              <h1 className="text-lg font-semibold text-foreground">{getCourseTitle()}</h1>
              {getCourseDesc() && <p className="text-xs text-muted-foreground">{getCourseDesc()}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {t("course.courseContentCount", { count: contents.length })}</span>
            {course.estimated_duration_hours && (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t("course.approxDuration", { hours: course.estimated_duration_hours })}</span>
            )}
          </div>

          {enrollment ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("course.enrollProgress")}</span>
                <span className="font-medium text-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">{completedCount}/{contents.length} {t("course.completed")}</p>
            </div>
          ) : (
            <Button className="w-full sm:w-auto" onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? t("common.registering") : t("course.enrollCourse")}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("course.courseContents")}</h2>
          <div className="space-y-1.5">
            {contents.filter(c => c.is_published).map((content, idx) => {
              const progress = progressMap.get(content.id);
              const isCompleted = progress?.completed;
              const isAccessible = !!enrollment || content.is_preview;
              const Icon = contentTypeIcon[content.content_type || "video"] || Video;
              return (
                <div key={content.id} className={`rounded-xl border border-border bg-card flex items-center gap-3 px-3 py-2.5 transition-all ${!isAccessible ? "opacity-50" : "hover:bg-accent/30 cursor-pointer"}`} onClick={() => isAccessible && navigate(`${routePrefix}/courses/${courseId}/content/${content.id}${viewParam}`)}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isCompleted ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-accent text-accent-foreground"}`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : !isAccessible ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-medium text-foreground truncate flex-1">{getLocalizedContentTitle(content)}</span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${content.video_provider === "custom" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                    {content.video_provider === "custom" ? t("course.flip") : t("course.video")}
                  </span>
                  {content.duration_minutes && <span className="text-[10px] text-muted-foreground shrink-0">{content.duration_minutes}{t("common.minutes")}</span>}
                  {isAccessible && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// --- Content Dialog with i18n tabs ---
const ContentDialog = ({
  open, onOpenChange, form, setForm, enForm, setEnForm, editingId, onSubmit, isPending, t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: ContentFormData;
  setForm: React.Dispatch<React.SetStateAction<ContentFormData>>;
  enForm: ContentI18nData;
  setEnForm: React.Dispatch<React.SetStateAction<ContentI18nData>>;
  editingId: string | null;
  onSubmit: () => void;
  isPending: boolean;
  t: any;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base">{editingId ? t("course.editContent") : t("course.addContent")}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="ko" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="ko" className="flex-1">{t("course.koTab")}</TabsTrigger>
          <TabsTrigger value="en" className="flex-1">{t("course.enTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ko" className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("course.contentTitle")} *</Label>
            <Input className="h-9 text-sm" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("course.contentPlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("course.contentType")}</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm(f => ({ ...f, content_type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">{t("course.video")}</SelectItem>
                  <SelectItem value="document">{t("course.document")}</SelectItem>
                  <SelectItem value="quiz">{t("course.quiz")}</SelectItem>
                  <SelectItem value="assignment">{t("course.assignment")}</SelectItem>
                  <SelectItem value="live">{t("course.live")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("course.playbackTime")}</Label>
              <Input className="h-9 text-sm" type="number" value={form.duration_minutes ?? ""} onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : null }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.contentUrl")}</Label>
            <Input className="h-9 text-sm" value={form.video_url} onChange={(e) => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.provider")}</Label>
            <Select value={form.video_provider} onValueChange={(v) => setForm(f => ({ ...f, video_provider: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t("course.select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">{t("course.youtube")}</SelectItem>
                <SelectItem value="vimeo">{t("course.vimeo")}</SelectItem>
                <SelectItem value="custom">{t("course.flipLearningMango")}</SelectItem>
                <SelectItem value="upload">{t("course.cdnUpload")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.description")}</Label>
            <Textarea className="text-sm" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} />
              <Label className="text-xs">{t("course.isPublished")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_preview} onCheckedChange={(v) => setForm(f => ({ ...f, is_preview: v }))} />
              <Label className="text-xs">{t("course.allowPreview")}</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="en" className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">{t("course.enOptional")}</p>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.enTitle")}</Label>
            <Input className="h-9 text-sm" value={enForm.title} onChange={(e) => setEnForm(f => ({ ...f, title: e.target.value }))} placeholder="English title" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.enVideoUrl")}</Label>
            <Input className="h-9 text-sm" value={enForm.video_url} onChange={(e) => setEnForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("course.provider")}</Label>
              <Select value={enForm.video_provider || "same"} onValueChange={(v) => setEnForm(f => ({ ...f, video_provider: v === "same" ? "" : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">{t("course.koTab")} (same)</SelectItem>
                  <SelectItem value="youtube">{t("course.youtube")}</SelectItem>
                  <SelectItem value="vimeo">{t("course.vimeo")}</SelectItem>
                  <SelectItem value="custom">{t("course.flipLearningMango")}</SelectItem>
                  <SelectItem value="upload">{t("course.cdnUpload")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("course.playbackTime")}</Label>
              <Input className="h-9 text-sm" type="number" value={enForm.duration_minutes ?? ""} onChange={(e) => setEnForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : null }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.enDescription")}</Label>
            <Textarea className="text-sm" value={enForm.description} onChange={(e) => setEnForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="English description" />
          </div>
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button size="sm" onClick={onSubmit} disabled={!form.title.trim() || isPending}>
          {isPending ? t("common.saving") : editingId ? t("common.edit") : t("common.add")}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// --- Course Edit Dialog with i18n tabs ---
const CourseEditDialog = ({
  open, onOpenChange, form, setForm, enForm, setEnForm, onSubmit, isPending, t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: { title: string; description: string; status: string; is_mandatory: boolean; deadline: string };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; status: string; is_mandatory: boolean; deadline: string }>>;
  enForm: { title: string; description: string };
  setEnForm: React.Dispatch<React.SetStateAction<{ title: string; description: string }>>;
  onSubmit: () => void;
  isPending: boolean;
  t: any;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-base">{t("course.courseEditTitle")}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="ko" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="ko" className="flex-1">{t("course.koTab")}</TabsTrigger>
          <TabsTrigger value="en" className="flex-1">{t("course.enTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ko" className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("course.courseTitle")}</Label>
            <Input className="h-9 text-sm" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.description")}</Label>
            <Textarea className="text-sm" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.courseStatus")}</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("course.draftStatus")}</SelectItem>
                <SelectItem value="published">{t("course.publishedStatus")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 필수교육 설정 */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">{t("course.mandatoryToggle")}</Label>
                <p className="text-[11px] text-muted-foreground">{t("course.mandatoryToggleDesc")}</p>
              </div>
              <Switch
                checked={form.is_mandatory}
                onCheckedChange={(v) => setForm(f => ({ ...f, is_mandatory: v }))}
              />
            </div>
            {form.is_mandatory && (
              <div className="space-y-1">
                <Label className="text-xs">{t("course.deadlineLabel")}</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.deadline}
                  onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">{t("course.deadlineHelp")}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="en" className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">{t("course.enOptional")}</p>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.enTitle")}</Label>
            <Input className="h-9 text-sm" value={enForm.title} onChange={(e) => setEnForm(f => ({ ...f, title: e.target.value }))} placeholder="English title" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("course.enDescription")}</Label>
            <Textarea className="text-sm" value={enForm.description} onChange={(e) => setEnForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="English description" />
          </div>
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button size="sm" onClick={onSubmit} disabled={!form.title.trim() || isPending}>
          {isPending ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CourseDetail;
