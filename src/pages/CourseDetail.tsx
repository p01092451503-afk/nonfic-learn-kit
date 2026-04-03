import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Play, Clock, Users, ArrowLeft, CheckCircle2, Lock,
  FileText, Video, ChevronRight, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
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

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { primaryRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: course, isLoading: courseLoading } = useQuery({
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

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user?.id,
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

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({
        user_id: user!.id,
        course_id: courseId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId] });
      toast({ title: "수강 등록 완료", description: "강좌에 등록되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const progressMap = new Map(progressData.map((p) => [p.content_id, p]));
  const completedCount = progressData.filter((p) => p.completed).length;
  const overallProgress = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;

  const role = primaryRole === "admin" ? "admin" : primaryRole === "teacher" ? "teacher" : "student";

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
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> 목록으로
        </button>

        {/* Header */}
        <div className="stat-card space-y-5">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shrink-0">
              <BookOpen className="h-7 w-7 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {course.difficulty_level || "기초"}
                </Badge>
                {course.is_mandatory && (
                  <Badge variant="destructive" className="text-[10px]">필수</Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {course.status === "published" ? "공개" : "비공개"}
                </Badge>
              </div>
              <h1 className="text-xl font-semibold text-foreground">{course.title}</h1>
              {course.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" /> {contents.length}개 콘텐츠
            </span>
            {course.estimated_duration_hours && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> 약 {course.estimated_duration_hours}시간
              </span>
            )}
            {course.max_students && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> 최대 {course.max_students}명
              </span>
            )}
          </div>

          {/* Enrollment / Progress */}
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
                <Button
                  variant="login"
                  size="xl"
                  className="w-full sm:w-auto"
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? "등록 중..." : "수강 등록하기"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">강의 콘텐츠</h2>
          {contents.length === 0 ? (
            <div className="stat-card text-center py-10">
              <p className="text-sm text-muted-foreground">등록된 콘텐츠가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contents.map((content, idx) => {
                const progress = progressMap.get(content.id);
                const isCompleted = progress?.completed;
                const isAccessible = enrollment || role !== "student" || content.is_preview;
                const Icon = contentTypeIcon[content.content_type || "video"] || Video;

                return (
                  <div
                    key={content.id}
                    className={`stat-card flex items-center gap-4 cursor-pointer group transition-all ${
                      !isAccessible ? "opacity-60" : "hover:shadow-md"
                    }`}
                    onClick={() => {
                      if (isAccessible) {
                        navigate(`/courses/${courseId}/content/${content.id}`);
                      }
                    }}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-accent text-accent-foreground"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : !isAccessible ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{String(idx + 1).padStart(2, "0")}</span>
                        <h3 className="text-sm font-medium text-foreground truncate">{content.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {contentTypeLabel[content.content_type || "video"]}
                        </span>
                        {content.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground">{content.duration_minutes}분</span>
                        )}
                        {content.is_preview && !enrollment && role === "student" && (
                          <Badge variant="outline" className="text-[10px] h-4">미리보기</Badge>
                        )}
                      </div>
                    </div>

                    {isAccessible && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetail;
