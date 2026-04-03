import { Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import CourseCard from "@/components/CourseCard";
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

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug");
      if (error) throw error;
      return data;
    },
  });

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

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
            <Input placeholder="강좌 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" />
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgress.map((enrollment: any) => {
                const cat = categoryMap.get(enrollment.courses?.category_id);
                return (
                  <CourseCard
                    key={enrollment.id}
                    course={enrollment.courses}
                    categorySlug={cat?.slug}
                    categoryName={cat?.name}
                    progress={Number(enrollment.progress) || 0}
                    variant="student"
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">완료 ({completed.length})</h2>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">완료한 강좌가 없습니다.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completed.map((enrollment: any) => {
                const cat = categoryMap.get(enrollment.courses?.category_id);
                return (
                  <CourseCard
                    key={enrollment.id}
                    course={enrollment.courses}
                    categorySlug={cat?.slug}
                    categoryName={cat?.name}
                    isCompleted
                    progress={100}
                    variant="student"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentCourses;
