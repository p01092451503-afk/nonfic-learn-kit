import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Play, FileText,
  Video, BarChart3, ExternalLink, Clock, X, RotateCcw, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useVideoProgress } from "@/hooks/useVideoProgress";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

const contentTypeIcon: Record<string, React.ElementType> = {
  video: Video, document: FileText, quiz: BarChart3, assignment: FileText, live: Video,
};

const ContentPlayer = () => {
  const { courseId, contentId } = useParams<{ courseId: string; contentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mangoPopupOpen, setMangoPopupOpen] = useState(false);
  const [mangoElapsed, setMangoElapsed] = useState(0);
  const mangoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const contentTypeLabel: Record<string, string> = {
    video: t("course.video"), document: t("course.document"),
    quiz: t("course.quiz"), assignment: t("course.assignment"), live: t("course.live"),
  };

  const { data: course } = useQuery({
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

  const { data: progressData = [] } = useQuery({
    queryKey: ["content-progress", courseId, user?.id],
    queryFn: async () => {
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length === 0) return [];
      const { data, error } = await supabase.from("content_progress").select("*").eq("user_id", user!.id).in("content_id", contentIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && contents.length > 0,
  });

  const getI18n = (cId: string) => contentI18nData.find((i: any) => i.content_id === cId && i.language_code === "en");
  const getTitle = (c: any) => { if (isEn) { const en = getI18n(c.id); return en?.title || c.title; } return c.title; };
  const getDescription = (c: any) => { if (isEn) { const en = getI18n(c.id); return en?.description || c.description; } return c.description; };
  const getVideoUrl = (c: any) => { if (isEn) { const en = getI18n(c.id); return en?.video_url || c.video_url; } return c.video_url; };
  const getVideoProvider = (c: any) => { if (isEn) { const en = getI18n(c.id); return en?.video_provider || c.video_provider; } return c.video_provider; };
  const getCourseTitle = () => { if (isEn) { const en = courseI18n?.find((i: any) => i.language_code === "en"); return en?.title || course?.title || ""; } return course?.title || ""; };

  const isMangoboard = (url: string | null) => url?.includes("mangoboard.net") ?? false;

  const currentContent = contents.find((c) => c.id === contentId);
  const currentIndex = contents.findIndex((c) => c.id === contentId);
  const prevContent = currentIndex > 0 ? contents[currentIndex - 1] : null;
  const nextContent = currentIndex < contents.length - 1 ? contents[currentIndex + 1] : null;
  const progressMap = new Map(progressData.map((p) => [p.content_id, p]));
  const currentProgress = progressMap.get(contentId || "");
  const completedCount = progressData.filter((p) => p.completed).length;
  const overallProgress = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;

  const localVideoUrlForHook = currentContent ? getVideoUrl(currentContent) : null;
  const localProviderForHook = currentContent ? getVideoProvider(currentContent) : null;
  const isYouTube = (url: string | null, provider: string | null) =>
    provider === "youtube" || url?.includes("youtube.com") || url?.includes("youtu.be");
  const isVimeo = (url: string | null, provider: string | null) =>
    provider === "vimeo" || url?.includes("vimeo.com");
  const isTrackableVideo = !!(currentContent && localVideoUrlForHook && !isMangoboard(localVideoUrlForHook) &&
    (isYouTube(localVideoUrlForHook, localProviderForHook) || isVimeo(localVideoUrlForHook, localProviderForHook)));

  const videoProgress = useVideoProgress({
    userId: user?.id,
    contentId,
    courseId,
    durationMinutes: currentContent?.duration_minutes ?? undefined,
    existingProgress: currentProgress,
    enabled: isTrackableVideo,
  });

  const videoIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (videoProgress.autoCompleted) {
      toast({ title: t("contentPlayer.autoCompleted"), description: t("contentPlayer.autoCompletedDesc") });
      queryClient.invalidateQueries({ queryKey: ["content-progress", courseId] });
    }
  }, [videoProgress.autoCompleted]);

  const videoIframeCallback = useCallback(
    (el: HTMLIFrameElement | null) => {
      if (!el || !currentContent || !isTrackableVideo) return;
      videoIframeRef.current = el;
      const url = localVideoUrlForHook!;
      if (isYouTube(url, localProviderForHook)) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
        if (match) videoProgress.initYouTube(el, match[1]);
      } else if (isVimeo(url, localProviderForHook)) {
        videoProgress.initVimeo(el);
      }
    },
    [currentContent?.id, isTrackableVideo]
  );

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [contentId]);

  useEffect(() => {
    setMangoElapsed(0);
  }, [contentId]);

  // Mangoboard timer
  useEffect(() => {
    if (mangoPopupOpen && currentContent && isMangoboard(getVideoUrl(currentContent))) {
      setMangoElapsed(0);
      mangoTimerRef.current = setInterval(() => setMangoElapsed((prev) => prev + 1), 1000);
    } else {
      if (mangoTimerRef.current) { clearInterval(mangoTimerRef.current); mangoTimerRef.current = null; }
    }
    return () => { if (mangoTimerRef.current) clearInterval(mangoTimerRef.current); };
  }, [mangoPopupOpen, currentContent?.id]);

  const requiredSeconds = (currentContent?.duration_minutes || 5) * 60 * 0.8;
  const mangoAutoCompleted = mangoElapsed >= requiredSeconds;

  useEffect(() => {
    if (mangoAutoCompleted && !currentProgress?.completed && mangoPopupOpen) {
      markCompleteMutation.mutate();
    }
  }, [mangoAutoCompleted]);

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const existing = currentProgress;
      if (existing) {
        const { error } = await supabase.from("content_progress").update({ completed: true, completed_at: new Date().toISOString(), progress_percentage: 100 }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_progress").insert({ user_id: user!.id, content_id: contentId!, completed: true, completed_at: new Date().toISOString(), progress_percentage: 100 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-progress", courseId] });
      toast({ title: t("course.completed"), description: t("course.learningComplete") });
    },
  });

  const normalizeMangoboardUrl = (url: string) => {
    let normalized = url.trim();
    if (!normalized.startsWith("http")) normalized = "https://" + normalized;
    return normalized;
  };

  const getVideoEmbed = (url: string | null, provider: string | null) => {
    if (!url) return null;
    if (isMangoboard(url)) return normalizeMangoboardUrl(url);
    if (provider === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
      if (match) {
        const params = new URLSearchParams({
          enablejsapi: "1",
          origin: window.location.origin,
          ...(videoProgress.resumePosition > 0 && !currentProgress?.completed ? { start: String(videoProgress.resumePosition) } : {}),
        });
        return `https://www.youtube.com/embed/${match[1]}?${params.toString()}`;
      }
    }
    if (provider === "vimeo" || url.includes("vimeo.com")) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
    return url;
  };

  const handleClose = () => {
    navigate(`/courses/${courseId}?view=learn`);
  };

  if (!currentContent) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t("course.contentNotFound")}</p>
          <Button variant="outline" onClick={handleClose}>{t("course.backToCourse")}</Button>
        </div>
      </div>
    );
  }

  const localTitle = getTitle(currentContent);
  const localDesc = getDescription(currentContent);
  const localVideoUrl = getVideoUrl(currentContent);
  const localProvider = getVideoProvider(currentContent);
  const embedUrl = getVideoEmbed(localVideoUrl, localProvider);

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Top header */}
      <header className="flex items-center gap-4 px-4 lg:px-6 h-14 border-b border-border bg-background shrink-0">
        <button onClick={handleClose} className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title={t("common.close")}>
          <X className="h-5 w-5" />
        </button>
        <div className="h-5 w-px bg-border" />
        <h1 className="text-sm font-semibold text-foreground truncate flex-1">{getCourseTitle()}</h1>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileCurriculumOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title={t("course.learningProgress")}>
            <List className="h-5 w-5" />
          </button>
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{currentIndex + 1}</span> / {contents.length} {t("course.lesson")}
          </span>
          <Progress value={overallProgress} className="w-24 h-1.5 hidden sm:block" />
          <span className="text-xs font-medium text-muted-foreground">{overallProgress}%</span>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
            {/* Media area */}
            <div className="bg-foreground/5 rounded-2xl overflow-hidden mb-6">
              {isMangoboard(localVideoUrl) && embedUrl ? (
                <button onClick={() => setMangoPopupOpen(true)} className="relative aspect-video w-full flex items-center justify-center group cursor-pointer bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                  <div className="text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-primary/90 group-hover:bg-primary mx-auto flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
                      <Play className="h-8 w-8 text-primary-foreground ml-1" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{t("course.startLearning")}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t("course.clickToLearn")}</p>
                    </div>
                  </div>
                </button>
              ) : currentContent.content_type === "video" && embedUrl ? (
                <div className="relative">
                  <div className="aspect-video w-full">
                    <iframe
                      ref={isTrackableVideo ? videoIframeCallback : undefined}
                      id={`video-player-${contentId}`}
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={localTitle}
                    />
                  </div>
                  {isTrackableVideo && (
                    <div className="px-4 py-2.5 bg-secondary/60 flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground shrink-0">{t("contentPlayer.watchProgress")}</span>
                      <Progress value={videoProgress.duration > 0 ? (videoProgress.currentTime / videoProgress.duration) * 100 : (currentProgress?.progress_percentage || 0)} className="h-1.5 flex-1" />
                      <span className="text-muted-foreground font-medium shrink-0">
                        {videoProgress.duration > 0
                          ? `${formatTime(videoProgress.currentTime)} / ${formatTime(videoProgress.duration)}`
                          : `${Math.round(currentProgress?.progress_percentage || 0)}%`}
                      </span>
                      {videoProgress.resumePosition > 0 && !currentProgress?.completed && (
                        <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                          <RotateCcw className="h-3 w-3" />
                          {t("contentPlayer.resumeFrom", { time: formatTime(videoProgress.resumePosition) })}
                        </Badge>
                      )}
                      {!currentProgress?.completed && (
                        <span className="text-[10px] text-muted-foreground/70 shrink-0">{t("contentPlayer.autoCompleteAt80")}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : currentContent.content_type === "video" && localVideoUrl ? (
                <div className="aspect-video w-full flex items-center justify-center">
                  <a href={localVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-5 w-5" /> {t("course.openExternal")}
                  </a>
                </div>
              ) : (
                <div className="aspect-video w-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="h-16 w-16 rounded-2xl bg-accent mx-auto flex items-center justify-center">
                      {currentContent.content_type === "document" ? <FileText className="h-7 w-7 text-accent-foreground" /> : <Play className="h-7 w-7 text-accent-foreground" />}
                    </div>
                    <p className="text-base text-muted-foreground">{contentTypeLabel[currentContent.content_type || "video"]}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className="text-xs font-semibold px-3 py-1.5 bg-foreground text-background rounded-lg uppercase tracking-wider">
                  {contentTypeLabel[currentContent.content_type || "video"]}
                </Badge>
                {currentContent.duration_minutes && (
                  <div className="flex items-center gap-1.5 text-sm text-foreground bg-secondary px-3 py-1.5 rounded-lg">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{currentContent.duration_minutes}{t("common.minutes")}</span>
                  </div>
                )}
              </div>

              <h2 className="text-xl lg:text-2xl font-bold text-foreground leading-tight">{localTitle}</h2>

              {localDesc && (
                <div className="bg-secondary/40 rounded-2xl p-5">
                  <p className="text-sm text-foreground/80 leading-7 whitespace-pre-line break-keep">{localDesc}</p>
                </div>
              )}

              {currentProgress?.completed ? (
                <div className="flex items-center gap-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-6 py-5">
                  <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-green-700 dark:text-green-300">{t("course.alreadyCompleted")}</p>
                    <p className="text-sm text-green-600/70 dark:text-green-400/70">{t("course.completedSuccess")}</p>
                  </div>
                </div>
              ) : user && (
                <Button variant="login" size="xl" onClick={() => markCompleteMutation.mutate()} disabled={markCompleteMutation.isPending} className="w-full lg:w-auto text-base">
                  {markCompleteMutation.isPending ? t("common.processing") : t("course.markComplete")}
                </Button>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-5 border-t border-border">
                <div>
                  {prevContent ? (
                    <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate(`/courses/${courseId}/content/${prevContent.id}`)}>
                      <ChevronLeft className="h-4 w-4" />
                      <span className="text-sm">{t("common.previous")}</span>
                    </Button>
                  ) : <div />}
                </div>
                <div>
                  {nextContent ? (
                    <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate(`/courses/${courseId}/content/${nextContent.id}`)}>
                      <span className="text-sm">{t("common.next")}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : <div />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar - curriculum panel */}
        <aside className={`hidden lg:flex flex-col border-l border-border bg-card transition-all duration-300 ${sidebarOpen ? "w-80" : "w-0 overflow-hidden"}`}>
          {sidebarOpen && (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("course.learningProgress")}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{completedCount} / {contents.length} {t("course.completed")}</p>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{t("course.progress")}</span>
                  <span className="font-semibold text-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {contents.map((c, idx) => {
                  const isActive = c.id === contentId;
                  const isCompleted = progressMap.get(c.id)?.completed;
                  return (
                    <button
                      key={c.id}
                      ref={isActive ? activeItemRef : undefined}
                      onClick={() => navigate(`/courses/${courseId}/content/${c.id}`)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all ${isActive ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
                    >
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                        {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <span className="truncate flex-1">{getTitle(c)}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${c.video_provider === "custom" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                          {c.video_provider === "custom" ? t("course.flip") : t("course.video")}
                        </span>
                        {c.duration_minutes && <span className="text-[10px] text-muted-foreground">{c.duration_minutes}{t("common.minutes")}</span>}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </aside>

        {/* Sidebar toggle when closed */}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-card border border-border rounded-l-lg hover:bg-accent text-muted-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mangoboard Popup */}
      {mangoPopupOpen && currentContent && isMangoboard(localVideoUrl) && embedUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
          <button onClick={() => setMangoPopupOpen(false)} className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
          <div className="absolute top-4 left-4 right-16 z-[110]">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5">
              <Clock className="h-4 w-4 text-white/70 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
                  <span>{t("contentPlayer.learningTime")}</span>
                  <span>
                    {Math.floor(mangoElapsed / 60)}:{String(mangoElapsed % 60).padStart(2, "0")}
                    {" / "}
                    {Math.floor(requiredSeconds / 60)}:{String(Math.round(requiredSeconds % 60)).padStart(2, "0")}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${mangoAutoCompleted ? "bg-green-400" : "bg-white/70"}`} style={{ width: `${Math.min((mangoElapsed / requiredSeconds) * 100, 100)}%` }} />
                </div>
              </div>
              {mangoAutoCompleted && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />}
            </div>
          </div>
          <div className="h-[95vh]" style={{ aspectRatio: "9/16", maxWidth: "95vw" }}>
            <iframe src={embedUrl} className="w-full h-full border-0 rounded-lg" allowFullScreen title={localTitle} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPlayer;
