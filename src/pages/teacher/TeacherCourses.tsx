import { Plus, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import CourseCard from "@/components/CourseCard";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

const TeacherCourses = () => {
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false });
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

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["teacher-enrollment-counts", courses.map((c: any) => c.id)],
    queryFn: async () => {
      const ids = courses.map((c: any) => c.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase.from("enrollments").select("course_id").in("course_id", ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e: any) => { counts[e.course_id] = (counts[e.course_id] || 0) + 1; });
      return counts;
    },
    enabled: courses.length > 0,
  });

  const { data: contentCounts = {} } = useQuery({
    queryKey: ["teacher-content-counts", courses.map((c: any) => c.id)],
    queryFn: async () => {
      const ids = courses.map((c: any) => c.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase.from("course_contents").select("course_id").in("course_id", ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e: any) => { counts[e.course_id] = (counts[e.course_id] || 0) + 1; });
      return counts;
    },
    enabled: courses.length > 0,
  });

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const filtered = courses.filter((c: any) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">강좌 관리</h1>
            <p className="text-muted-foreground mt-1">담당 강좌를 관리하세요.</p>
          </div>
          <Link to="/teacher/courses/new">
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> 새 강좌
            </Button>
          </Link>
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

        {filtered.length === 0 ? (
          <div className="stat-card text-center py-10">
            <p className="text-sm text-muted-foreground">강좌가 없습니다.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course: any) => {
              const cat = categoryMap.get(course.category_id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  categorySlug={cat?.slug}
                  categoryName={cat?.name}
                  studentCount={(enrollmentCounts as any)[course.id] || 0}
                  contentCount={(contentCounts as any)[course.id] || 0}
                  variant="teacher"
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherCourses;
