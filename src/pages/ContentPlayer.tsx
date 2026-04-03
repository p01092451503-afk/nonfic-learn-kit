import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Play, FileText,
  Video, BarChart3, ExternalLink, Clock, X, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

const contentTypeIcon: Record<string, React.ElementType> = {
  video: Video,
  document: FileText,
  quiz: BarChart3,
  assignment: FileText,
  live: Video,
};

const ContentPlayer = () => {
  const { courseId, contentId } = useParams<{ courseId: string; contentId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mangoPopupOpen, setMangoPopupOpen] = useState(false);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: contents = [] } = useQuery({
    queryKey: ["course-contents", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_contents")
        .select("*")
        .eq("course_id", courseId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ["content-progress", courseId, user?.id],
    queryFn: async () => {
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("content_progress")
        .select("*")
        .eq("user_id", user!.id)
        .in("content_id", contentIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && contents.length > 0,
  });

  const currentContent = contents.find((c) => c.id === contentId);
  const currentIndex = contents.findIndex((c) => c.id === contentId);
  const prevContent = currentIndex > 0 ? contents[currentIndex - 1] : null;
  const nextContent = currentIndex < contents.length - 1 ? contents[currentIndex + 1] : null;
  const progressMap = new Map(progressData.map((p) => [p.content_id, p]));
  const currentProgress = progressMap.get(contentId || "");
  const completedCount = progressData.filter((p) => p.completed).length;
  const overallProgress = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const existing = currentProgress;
      if (existing) {
        const { error } = await supabase
          .from("content_progress")
          .update({ completed: true, completed_at: new Date().toISOString(), progress_percentage: 100 })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_progress").insert({
          user_id: user!.id,
          content_id: contentId!,
          completed: true,
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-progress", courseId] });
      toast({ title: "완료", description: "학습 완료로 표시되었습니다." });
    },
  });

  const isMangoboard = (url: string | null) => {
    return url?.includes("mangoboard.net") ?? false;
  };

  const normalizeMangoboardUrl = (url: string) => {
    let normalized = url.trim();
    if (!normalized.startsWith("http")) {
      normalized = "https://" + normalized;
    }
    return normalized;
  };

  const getVideoEmbed = (url: string | null, provider: string | null) => {
    if (!url) return null;
    if (isMangoboard(url)) return normalizeMangoboardUrl(url);
    if (provider === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    if (provider === "vimeo" || url.includes("vimeo.com")) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
    return url;
  };

  if (!currentContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">콘텐츠를 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>강좌로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const embedUrl = getVideoEmbed(currentContent.video_url, currentContent.video_provider);

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
        sidebarOpen ? "w-72" : "w-0 lg:w-14 overflow-hidden"
      }`}>
        {/* 강좌로 돌아가기 - 상단 고정 */}
        {sidebarOpen && (
          <div className="p-4 pb-2 min-w-[280px] lg:min-w-0">
            <Link to={`/courses/${courseId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-4 w-4" /> 강좌로 돌아가기
            </Link>
          </div>
        )}

        {/* 과정명 + 진행률 + 토글 */}
        <div className="p-4 pt-6 border-b border-sidebar-border flex items-center justify-between min-w-[280px] lg:min-w-0">
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{course?.title}</h2>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>진행률</span>
                  <span>{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground shrink-0 ml-2"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {sidebarOpen && (
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {contents.map((c, idx) => {
              const isActive = c.id === contentId;
              const isCompleted = progressMap.get(c.id)?.completed;
              const Icon = contentTypeIcon[c.content_type || "video"] || Video;

              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/courses/${courseId}/content/${c.id}`)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    isCompleted
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : isActive
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : String(idx + 1).padStart(2, "0")}
                  </div>
                  <span className="truncate flex-1">{c.title}</span>
                  {c.duration_minutes && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{c.duration_minutes}분</span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Video / Content Area */}
        <div className="bg-foreground/5">
          {isMangoboard(currentContent.video_url) && embedUrl ? null : currentContent.content_type === "video" && embedUrl ? (
            <div className="aspect-video max-h-[70vh] w-full">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentContent.title}
              />
            </div>
          ) : currentContent.content_type === "video" && currentContent.video_url ? (
            <div className="aspect-video max-h-[70vh] w-full flex items-center justify-center">
              <a
                href={currentContent.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> 외부 플레이어에서 열기
              </a>
            </div>
          ) : (
            <div className="aspect-video max-h-[50vh] w-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-accent mx-auto flex items-center justify-center">
                  {currentContent.content_type === "document" ? (
                    <FileText className="h-7 w-7 text-accent-foreground" />
                  ) : (
                    <Play className="h-7 w-7 text-accent-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentContent.content_type === "document"
                    ? "문서 콘텐츠"
                    : currentContent.content_type === "quiz"
                    ? "퀴즈"
                    : "콘텐츠"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info & Actions */}
        <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-4xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {currentContent.content_type || "video"}
              </Badge>
              {currentContent.duration_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {currentContent.duration_minutes}분
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {contents.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{currentContent.title}</h1>
              {isMangoboard(currentContent.video_url) && embedUrl && (
                <Button onClick={() => setMangoPopupOpen(true)} size="sm" className="gap-1.5 shrink-0">
                  <Play className="h-3.5 w-3.5" /> 학습하기
                </Button>
              )}
            </div>
            {currentContent.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{currentContent.description}</p>
            )}
          </div>

          {/* Complete Button */}
          {!currentProgress?.completed && user && (
            <Button
              variant="login"
              size="xl"
              onClick={() => markCompleteMutation.mutate()}
              disabled={markCompleteMutation.isPending}
            >
              {markCompleteMutation.isPending ? "처리 중..." : "학습 완료 표시"}
            </Button>
          )}
          {currentProgress?.completed && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 className="h-4 w-4" /> 학습 완료
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {prevContent ? (
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => navigate(`/courses/${courseId}/content/${prevContent.id}`)}
              >
                <ChevronLeft className="h-4 w-4" /> 이전
              </Button>
            ) : (
              <div />
            )}
            {nextContent ? (
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => navigate(`/courses/${courseId}/content/${nextContent.id}`)}
              >
                다음 <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                강좌로 돌아가기
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Mangoboard Popup Modal */}
      {mangoPopupOpen && currentContent && isMangoboard(currentContent.video_url) && embedUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setMangoPopupOpen(false)}
            className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="h-[95vh]" style={{ aspectRatio: "9/16", maxWidth: "95vw" }}>
            <iframe
              src={embedUrl}
              className="w-full h-full border-0 rounded-lg"
              allowFullScreen
              title={currentContent.title}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPlayer;
