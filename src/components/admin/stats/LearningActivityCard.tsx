import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileCheck, ClipboardCheck, MessageSquare } from "lucide-react";

const LearningActivityCard = () => {
  const { data: contentCompletions = 0 } = useQuery({
    queryKey: ["stat-content-completions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("content_progress")
        .select("*", { count: "exact", head: true })
        .eq("completed", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: assessmentAttempts = 0 } = useQuery({
    queryKey: ["stat-assessment-attempts"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assessment_attempts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: assessmentPassed = 0 } = useQuery({
    queryKey: ["stat-assessment-passed"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assessment_attempts")
        .select("*", { count: "exact", head: true })
        .eq("passed", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: submissionCount = 0 } = useQuery({
    queryKey: ["stat-submission-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: gradedCount = 0 } = useQuery({
    queryKey: ["stat-graded-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "graded");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: boardPostCount = 0 } = useQuery({
    queryKey: ["stat-board-posts"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("board_posts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: surveyResponseCount = 0 } = useQuery({
    queryKey: ["stat-survey-responses"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("survey_responses")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const items = [
    { label: "콘텐츠 이수", value: contentCompletions, icon: BookOpen, color: "text-primary bg-primary/10" },
    { label: "평가 응시", value: assessmentAttempts, sub: `합격 ${assessmentPassed}건`, icon: ClipboardCheck, color: "text-chart-2 bg-chart-2/10" },
    { label: "과제 제출", value: submissionCount, sub: `채점 ${gradedCount}건`, icon: FileCheck, color: "text-chart-3 bg-chart-3/10" },
    { label: "게시판 글", value: boardPostCount, icon: MessageSquare, color: "text-chart-4 bg-chart-4/10" },
    { label: "설문 응답", value: surveyResponseCount, icon: ClipboardCheck, color: "text-chart-5 bg-chart-5/10" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm font-medium">학습 활동 통계</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {items.map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
              <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color.split(" ")[0]}`} />
              <p className="text-lg font-bold text-foreground">{item.value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              {item.sub && <p className="text-[10px] text-primary mt-0.5">{item.sub}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningActivityCard;
