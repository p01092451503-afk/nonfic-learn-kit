import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Play, FileText,
  Video, BarChart3, ExternalLink, Clock, X, Menu,
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

const contentTypeLabel: Record<string, string> = {
  video: "영상",
  document: "문서",
  quiz: "퀴즈",
  assignment: "과제",
  live: "라이브",
};

const ContentPlayer = () => {
  const { courseId, contentId } = useParams<{ courseId: string; contentId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mangoPopupOpen, setMangoPopupOpen] = useState(false);
  const [mangoElapsed, setMangoElapsed] = useState(0);
  const mangoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

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

  // 개선5: 활성 차시로 자동 스크롤
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [contentId]);

  // 모바일에서 콘텐츠 변경 시 사이드바 닫기
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [contentId]);

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

  const isMangoboard = (url: string | null) => url?.includes("mangoboard.net") ?? false;

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

  const SidebarContent = () => (
    <>
      {/* 강좌로 돌아가기 */}
      <div className="p-4 pb-2">
        <Link to={`/courses/${courseId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="h-4 w-4" /> 강좌로 돌아가기
        </Link>
      </div>

      {/* 과정명 + 진행률 */}
      <div className="p-4 pt-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
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
          {/* 데스크톱에서만 토글 버튼 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-accent text-muted-foreground shrink-0 ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {/* 모바일에서 닫기 */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 차시 목록 */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {contents.map((c, idx) => {
          const isActive = c.id === contentId;
          const isCompleted = progressMap.get(c.id)?.completed;
          const Icon = contentTypeIcon[c.content_type || "video"] || Video;

          return (
            <button
              key={c.id}
              ref={isActive ? activeItemRef : undefined}
              onClick={() => {
                navigate(`/courses/${courseId}/content/${c.id}`);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-medium ${
                isCompleted
                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  : isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : String(idx + 1).padStart(2, "0")}
              </div>
              <span className="truncate flex-1">{c.title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                  c.video_provider === "custom"
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                }`}>
                  {c.video_provider === "custom" ? "플립" : "영상"}
                </span>
                {c.duration_minutes && (
                  <span className="text-[10px] text-muted-foreground">{c.duration_minutes}분</span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {/* 개선6: 모바일 오버레이 사이드바 */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* 데스크톱 사이드바 */}
      <aside className={`hidden lg:flex sticky top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 ${
        sidebarOpen ? "w-72" : "w-0 overflow-hidden"
      }`}>
        {sidebarOpen && <SidebarContent />}
      </aside>

      {/* 사이드바 닫혔을 때 열기 버튼 (데스크톱) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-sidebar border border-sidebar-border rounded-r-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* 개선6: 모바일 헤더 */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{course?.title}</p>
            <p className="text-[10px] text-muted-foreground">{currentIndex + 1} / {contents.length} 차시</p>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-2xl space-y-8">
            {/* Video embed for non-mangoboard */}
            {!(isMangoboard(currentContent.video_url) && embedUrl) && (
              <div className="bg-foreground/5 rounded-2xl overflow-hidden">
                {currentContent.content_type === "video" && embedUrl ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={currentContent.title}
                    />
                  </div>
                ) : currentContent.content_type === "video" && currentContent.video_url ? (
                  <div className="aspect-video w-full flex items-center justify-center">
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
                  <div className="py-12 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-accent mx-auto flex items-center justify-center">
                        {currentContent.content_type === "document" ? (
                          <FileText className="h-6 w-6 text-accent-foreground" />
                        ) : (
                          <Play className="h-6 w-6 text-accent-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {contentTypeLabel[currentContent.content_type || "video"] || "콘텐츠"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 개선3: 메타 정보 뱃지 강화 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="text-xs font-semibold px-3 py-1 bg-foreground text-background rounded-lg uppercase tracking-wider">
                  {contentTypeLabel[currentContent.content_type || "video"] || currentContent.content_type || "video"}
                </Badge>
                {currentContent.duration_minutes && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{currentContent.duration_minutes}분</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-lg font-medium">
                  {currentIndex + 1} / {contents.length}
                </div>
              </div>

              {/* 제목 + 학습하기 버튼 */}
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">{currentContent.title}</h1>
                {isMangoboard(currentContent.video_url) && embedUrl && (
                  <Button onClick={() => setMangoPopupOpen(true)} size="sm" className="gap-1.5 shrink-0">
                    <Play className="h-3.5 w-3.5" /> 학습하기
                  </Button>
                )}
              </div>

              {/* 개선1: 설명 텍스트 가독성 향상 */}
              {currentContent.description && (
                <div className="bg-secondary/40 rounded-2xl p-5 lg:p-6">
                  <p className="text-sm text-muted-foreground leading-7 whitespace-pre-line break-keep">
                    {currentContent.description}
                  </p>
                </div>
              )}
            </div>

            {/* 개선4: 학습 완료 표시 강조 */}
            {currentProgress?.completed ? (
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-4">
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">학습 완료</p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">이 차시를 성공적으로 완료했습니다.</p>
                </div>
              </div>
            ) : user && (
              <Button
                variant="login"
                size="xl"
                onClick={() => markCompleteMutation.mutate()}
                disabled={markCompleteMutation.isPending}
                className="w-full sm:w-auto"
              >
                {markCompleteMutation.isPending ? "처리 중..." : "학습 완료 표시"}
              </Button>
            )}

            {/* 개선2: 하단 네비게이션 균형 배치 */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <div className="flex-1">
                {prevContent ? (
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={() => navigate(`/courses/${courseId}/content/${prevContent.id}`)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <div className="text-left hidden sm:block">
                      <span className="text-[10px] text-muted-foreground block">이전 차시</span>
                      <span className="text-xs truncate max-w-[120px] block">{prevContent.title}</span>
                    </div>
                    <span className="sm:hidden text-sm">이전</span>
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              <Button
                variant="ghost"
                className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                <ArrowLeft className="h-4 w-4" /> 강좌 목록
              </Button>

              <div className="flex-1 flex justify-end">
                {nextContent ? (
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={() => navigate(`/courses/${courseId}/content/${nextContent.id}`)}
                  >
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-muted-foreground block">다음 차시</span>
                      <span className="text-xs truncate max-w-[120px] block">{nextContent.title}</span>
                    </div>
                    <span className="sm:hidden text-sm">다음</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            </div>
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
