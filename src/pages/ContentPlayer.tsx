import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Play, FileText,
  Video, BarChart3, ExternalLink, Clock, X, RotateCcw, List,
  ThumbsUp, Share2, MoreHorizontal,
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

const ContentPlayer = () => {
  const { courseId, contentId } = useParams<{ courseId: string; contentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [mangoPopupOpen, setMangoPopupOpen] = useState(false);
  const [mangoElapsed, setMangoElapsed] = useState(0);
  const mangoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  useEffect(() => { setMangoElapsed(0); }, [contentId]);

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

  const renderVideoArea = () => {
    if (isMangoboard(localVideoUrl) && embedUrl) {
      return (
        <button onClick={() => setMangoPopupOpen(true)} className="relative aspect-video w-full flex items-center justify-center group cursor-pointer bg-black">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-primary/90 group-hover:bg-primary mx-auto flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl">
              <Play className="h-7 w-7 text-primary-foreground ml-0.5" />
            </div>
            <p className="text-sm text-white/80">{t("course.clickToLearn")}</p>
          </div>
        </button>
      );
    }
    if (currentContent.content_type === "video" && embedUrl) {
      return (
        <div className="aspect-video w-full bg-black">
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
      );
    }
    if (currentContent.content_type === "video" && localVideoUrl) {
      return (
        <div className="aspect-video w-full bg-black flex items-center justify-center">
          <a href={localVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ExternalLink className="h-5 w-5" /> {t("course.openExternal")}
          </a>
        </div>
      );
    }
    return (
      <div className="aspect-video w-full bg-black flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-full bg-white/10 mx-auto flex items-center justify-center">
            {currentContent.content_type === "document" ? <FileText className="h-6 w-6 text-white/60" /> : <Play className="h-6 w-6 text-white/60" />}
          </div>
          <p className="text-sm text-white/50">{contentTypeLabel[currentContent.content_type || "video"]}</p>
        </div>
      </div>
    );
  };

  const renderPlaylistItem = (c: any, idx: number, opts?: { onNavigate?: () => void }) => {
    const isActive = c.id === contentId;
    const isCompleted = progressMap.get(c.id)?.completed;
    const cTitle = getTitle(c);
    const isFlip = c.video_provider === "custom";

    return (
      <button
        key={c.id}
        ref={isActive ? activeItemRef : undefined}
        onClick={() => { opts?.onNavigate?.(); navigate(`/courses/${courseId}/content/${c.id}`); }}
        className={`w-full flex gap-3 p-2 rounded-lg transition-colors group ${isActive ? "bg-accent" : "hover:bg-accent/50"}`}
      >
        {/* Thumbnail placeholder */}
        <div className={`relative w-[168px] h-[94px] shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${isActive ? "ring-2 ring-primary" : ""}`}
          style={{ background: isFlip ? "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)))" : "hsl(var(--muted))" }}>
          <div className="flex flex-col items-center gap-1">
            {isFlip
              ? <FileText className="h-5 w-5 text-primary" />
              : <Video className="h-5 w-5 text-muted-foreground" />}
          </div>
          {c.duration_minutes && (
            <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/80 text-white px-1.5 py-0.5 rounded">
              {c.duration_minutes}:{String(0).padStart(2, "0")}
            </span>
          )}
          {isCompleted && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left py-0.5">
          <p className={`text-[13px] leading-snug line-clamp-2 ${isActive ? "font-semibold text-foreground" : "text-foreground/80 group-hover:text-foreground"}`}>
            {cTitle}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {getCourseTitle()}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isFlip ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-500"}`}>
              {isFlip ? t("course.flip") : t("course.video")}
            </span>
            {isCompleted && (
              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">{t("course.alreadyCompleted")}</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* ── Main layout: left content + right playlist ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ══ Left: Video + Info ══ */}
        <div className="flex-1 overflow-y-auto">
          {/* Video player - edge to edge */}
          <div className="w-full bg-black">
            {renderVideoArea()}

            {/* Video progress bar (YouTube-style thin bar under video) */}
            {isTrackableVideo && (
              <div className="relative h-1 bg-white/20">
                <div
                  className="absolute left-0 top-0 h-full bg-red-500 transition-all duration-300"
                  style={{
                    width: `${videoProgress.duration > 0
                      ? (videoProgress.currentTime / videoProgress.duration) * 100
                      : (currentProgress?.progress_percentage || 0)}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* Video info section */}
          <div className="px-4 lg:px-6 py-4 space-y-4 max-w-[960px]">
            {/* Title */}
            <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">
              {localTitle}
            </h1>

            {/* Meta row: course info, progress, actions */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">{getCourseTitle()}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {contents.length} {t("course.lesson")}
              </span>
              {currentContent.duration_minutes && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {currentContent.duration_minutes}{t("common.minutes")}
                  </span>
                </>
              )}
              {isTrackableVideo && videoProgress.duration > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(videoProgress.currentTime)} / {formatTime(videoProgress.duration)}
                  </span>
                </>
              )}
            </div>

            {/* Action buttons row - YouTube style pill buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentProgress?.completed ? (
                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("course.alreadyCompleted")}
                </div>
              ) : user ? (
                <Button
                  onClick={() => markCompleteMutation.mutate()}
                  disabled={markCompleteMutation.isPending}
                  className="rounded-full gap-2 h-9 px-5 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {markCompleteMutation.isPending ? t("common.processing") : t("course.markComplete")}
                </Button>
              ) : null}

              {/* Overall progress pill */}
              <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full text-sm">
                <span className="text-muted-foreground">{t("course.progress")}</span>
                <span className="font-bold text-foreground">{overallProgress}%</span>
              </div>

              {isTrackableVideo && videoProgress.resumePosition > 0 && !currentProgress?.completed && (
                <div className="flex items-center gap-1.5 bg-secondary px-3 py-2 rounded-full text-xs text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("contentPlayer.resumeFrom", { time: formatTime(videoProgress.resumePosition) })}
                </div>
              )}

              {/* Close / Back button */}
              <Button variant="outline" onClick={handleClose} className="rounded-full gap-2 h-9 px-4 text-sm ml-auto">
                <X className="h-4 w-4" />
                {t("course.backToCourse")}
              </Button>

              {/* Mobile curriculum toggle */}
              <Button
                variant="outline"
                onClick={() => setMobileCurriculumOpen(true)}
                className="lg:hidden rounded-full gap-2 h-9 px-4 text-sm"
              >
                <List className="h-4 w-4" />
                {t("course.learningProgress")}
              </Button>
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Description (expandable area like YouTube) */}
            {localDesc && (
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{localDesc}</p>
              </div>
            )}

            {/* Navigation prev/next */}
            <div className="flex items-center justify-between py-2">
              {prevContent ? (
                <Button variant="ghost" className="rounded-full gap-2 text-sm" onClick={() => navigate(`/courses/${courseId}/content/${prevContent.id}`)}>
                  <ChevronLeft className="h-4 w-4" />
                  {t("common.previous")}
                </Button>
              ) : <div />}
              {nextContent ? (
                <Button variant="ghost" className="rounded-full gap-2 text-sm" onClick={() => navigate(`/courses/${courseId}/content/${nextContent.id}`)}>
                  {t("common.next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : <div />}
            </div>
          </div>
        </div>

        {/* ══ Right sidebar: Playlist (desktop) ══ */}
        <aside className="hidden lg:flex flex-col w-[402px] shrink-0 border-l border-border bg-background">
          {/* Playlist header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">{getCourseTitle()}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedCount}/{contents.length} · {overallProgress}%
                </p>
              </div>
            </div>
            <Progress value={overallProgress} className="h-1 mt-2.5" />
          </div>

          {/* Playlist items */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {contents.map((c, idx) => renderPlaylistItem(c, idx))}
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* ── Mangoboard Popup ── */}
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
                  <div className={`h-full rounded-full transition-all duration-1000 ${mangoAutoCompleted ? "bg-green-400" : "bg-red-500"}`} style={{ width: `${Math.min((mangoElapsed / requiredSeconds) * 100, 100)}%` }} />
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

      {/* ── Mobile curriculum drawer ── */}
      <Drawer open={mobileCurriculumOpen} onOpenChange={setMobileCurriculumOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">{getCourseTitle()}</DrawerTitle>
            <p className="text-xs text-muted-foreground">{completedCount}/{contents.length} · {overallProgress}%</p>
            <Progress value={overallProgress} className="h-1 mt-2" />
          </DrawerHeader>
          <ScrollArea className="flex-1 px-2 pb-4 max-h-[55vh]">
            <div className="space-y-1">
              {contents.map((c, idx) => renderPlaylistItem(c, idx, { onNavigate: () => setMobileCurriculumOpen(false) }))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ContentPlayer;
