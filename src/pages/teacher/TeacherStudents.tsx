import { Users, Search, Filter, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

const TeacherStudents = () => {
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const { data: myCourses = [] } = useQuery({
    queryKey: ["teacher-course-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["teacher-enrollments", myCourses.map((c: any) => c.id)],
    queryFn: async () => {
      const ids = myCourses.map((c: any) => c.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .in("course_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: myCourses.length > 0,
  });

  const studentIds = [...new Set(enrollments.map((e: any) => e.user_id))];

  const { data: profiles = [] } = useQuery({
    queryKey: ["student-profiles", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", studentIds);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  const studentData = studentIds.map((id) => {
    const profile = profileMap.get(id);
    const studentEnrollments = enrollments.filter((e: any) => e.user_id === id);
    const avgProgress = studentEnrollments.length > 0
      ? Math.round(studentEnrollments.reduce((sum: number, e: any) => sum + (Number(e.progress) || 0), 0) / studentEnrollments.length)
      : 0;
    return {
      userId: id,
      name: profile?.full_name || "사용자",
      department: profile?.department || "-",
      courseCount: studentEnrollments.length,
      avgProgress,
    };
  });

  const filtered = studentData.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">수강생 관리</h1>
          <p className="text-muted-foreground mt-1">담당 강좌 수강생의 학습 현황을 확인하세요.</p>
        </div>

        <div className="stat-card text-center">
          <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{studentData.length}</p>
          <p className="text-xs text-muted-foreground mt-1">총 수강생</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="수강생 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="stat-card text-center py-10">
            <p className="text-sm text-muted-foreground">수강생이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((student) => (
              <div key={student.userId} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground shrink-0">
                  {student.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{student.name}</h3>
                  <p className="text-xs text-muted-foreground">{student.department} · {student.courseCount}강좌 수강</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={student.avgProgress} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground">{student.avgProgress}%</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudents;
