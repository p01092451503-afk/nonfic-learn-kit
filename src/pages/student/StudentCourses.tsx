import { BookOpen, Play, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useState } from "react";

const StudentCourses = () => {
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filtered = enrollments.filter((e: any) =>
    e.courses?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const inProgress = filtered.filter((e: any) => !e.completed_at);
  const completed = filtered.filter((e: any) => !!e.completed_at);

  return (
    <DashboardLayout role="student">
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">내 강좌</h1>
          <p className="text-muted-foreground mt-1">수강 중인 강좌와 완료한 강좌를 확인하세요.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="강좌 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-border"
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">수강 중 ({inProgress.length})</h2>
          {inProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">수강 중인 강좌가 없습니다.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {inProgress.map((enrollment: any) => (
                <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`}>
                  <div className="stat-card cursor-pointer group hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <Play className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{enrollment.courses?.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {enrollment.courses?.difficulty_level || "기초"}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Progress value={Number(enrollment.progress) || 0} className="flex-1 h-1.5" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {Math.round(Number(enrollment.progress) || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">완료 ({completed.length})</h2>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">완료한 강좌가 없습니다.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {completed.map((enrollment: any) => (
                <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`}>
                  <div className="stat-card opacity-80">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{enrollment.courses?.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {enrollment.courses?.difficulty_level || "기초"}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">수료 완료</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentCourses;
