import { Search, BookOpen, Info, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import CourseCard from "@/components/CourseCard";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const StudentCourses = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*, courses(*)").eq("user_id", user!.id).order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug");
      if (error) throw error;
      return data;
    },
  });

  const syncProgressMutation = useMutation({
    mutationFn: async () => {
      for (const enrollment of enrollments) {
        const courseId = (enrollment as any).course_id;
        const { data: contents } = await supabase.from("course_contents").select("id").eq("course_id", courseId).eq("is_published", true);
        if (!contents || contents.length === 0) continue;
        const { data: progress } = await supabase.from("content_progress").select("content_id, completed").eq("user_id", user!.id).in("content_id", contents.map(c => c.id));
        const completedCount = (progress || []).filter(p => p.completed).length;
        const percentage = Math.round((completedCount / contents.length) * 100);
        await supabase.from("enrollments").update({ progress: percentage, completed_at: percentage >= 100 ? new Date().toISOString() : null }).eq("id", enrollment.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      toast({ title: t("course.syncComplete"), description: t("course.syncCompleteDesc") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const filtered = enrollments.filter((e: any) => e.courses?.title?.toLowerCase().includes(search.toLowerCase()));
  const inProgress = filtered.filter((e: any) => !e.completed_at);
  const completed = filtered.filter((e: any) => !!e.completed_at);

  const renderCourseGrid = (items: any[], isCompleted = false) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isCompleted ? t("course.noCompletedCourses") : t("course.noInProgressCourses")}
          </p>
        </div>
      );
    }
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((enrollment: any) => {
          const cat = categoryMap.get(enrollment.courses?.category_id);
          return (
            <CourseCard key={enrollment.id} course={enrollment.courses} categorySlug={cat?.slug} categoryName={cat?.name} progress={isCompleted ? 100 : Number(enrollment.progress) || 0} isCompleted={isCompleted} variant="student" href={`/courses/${enrollment.courses?.id}?view=learn`} />
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("course.myCourseRoom")}</h1>
        </div>

        <Tabs defaultValue="in-progress" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-xl bg-secondary/50">
            <TabsTrigger value="in-progress" className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t("course.inProgressCourses")} ({inProgress.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t("course.completedCourses")} ({completed.length})
            </TabsTrigger>
          </TabsList>

          <div className="bg-secondary/30 rounded-xl p-4 space-y-1.5">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{t("course.courseInfoGuide")}</p>
                <p>{t("course.courseInfoGuide2")}</p>
                <p>{t("course.courseInfoGuide3")}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs" onClick={() => syncProgressMutation.mutate()} disabled={syncProgressMutation.isPending}>
                <RefreshCw className={`h-3.5 w-3.5 ${syncProgressMutation.isPending ? "animate-spin" : ""}`} />
                {syncProgressMutation.isPending ? t("course.syncing") : t("course.syncProgress")}
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("course.searchCourse")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" />
          </div>

          <TabsContent value="in-progress" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><span className="h-6 w-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /></div>
            ) : renderCourseGrid(inProgress)}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><span className="h-6 w-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /></div>
            ) : renderCourseGrid(completed, true)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentCourses;