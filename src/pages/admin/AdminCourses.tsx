import { BookOpen, Plus, Users, Search, Filter, ArrowRight, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

const statusLabel: Record<string, { text: string; className: string }> = {
  published: { text: "공개", className: "text-success bg-success/10" },
  draft: { text: "초안", className: "text-muted-foreground bg-secondary" },
};

const AdminCourses = () => {
  const [search, setSearch] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-all-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, progress");
      if (error) throw error;
      return data;
    },
  });

  const { data: instructorProfiles = [] } = useQuery({
    queryKey: ["instructor-profiles", courses.map((c: any) => c.instructor_id).filter(Boolean)],
    queryFn: async () => {
      const ids = [...new Set(courses.map((c: any) => c.instructor_id).filter(Boolean))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: courses.length > 0,
  });

  const instructorMap = new Map(instructorProfiles.map((p: any) => [p.user_id, p.full_name]));
  const enrollmentMap = new Map<string, { count: number; avgProgress: number }>();
  const grouped: Record<string, { total: number; progress: number }> = {};
  enrollments.forEach((e: any) => {
    if (!grouped[e.course_id]) grouped[e.course_id] = { total: 0, progress: 0 };
    grouped[e.course_id].total++;
    grouped[e.course_id].progress += Number(e.progress) || 0;
  });
  Object.entries(grouped).forEach(([id, v]) => {
    enrollmentMap.set(id, { count: v.total, avgProgress: Math.round(v.progress / v.total) });
  });

  const filtered = courses.filter((c: any) => c.title.toLowerCase().includes(search.toLowerCase()));
  const publishedCount = courses.filter((c: any) => c.status === "published").length;
  const totalStudents = Object.values(grouped).reduce((s, v) => s + v.total, 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">강좌 관리</h1>
            <p className="text-muted-foreground mt-1">전체 강좌를 관리하고 모니터링하세요.</p>
          </div>
          <Button className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> 새 강좌
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{courses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">전체 강좌</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">공개 강좌</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">총 수강생</p>
          </div>
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
          <div className="space-y-3">
            {filtered.map((course: any) => {
              const status = statusLabel[course.status] || statusLabel.draft;
              const enrollment = enrollmentMap.get(course.id);
              return (
                <Link key={course.id} to={`/courses/${course.id}`}>
                  <div className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                    <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <BarChart3 className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.text}
                        </span>
                        {course.difficulty_level && (
                          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{course.difficulty_level}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-foreground truncate">{course.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          강사: {instructorMap.get(course.instructor_id) || "-"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {enrollment?.count || 0}명
                        </span>
                      </div>
                      {enrollment && enrollment.count > 0 && (
                        <div className="flex items-center gap-3 mt-2">
                          <Progress value={enrollment.avgProgress} className="flex-1 h-1.5" />
                          <span className="text-xs text-muted-foreground">{enrollment.avgProgress}%</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCourses;
