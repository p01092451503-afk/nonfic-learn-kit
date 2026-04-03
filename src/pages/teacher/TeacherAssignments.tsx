import { Clock, CheckCircle2, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

const TeacherAssignments = () => {
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const { data: submissions = [] } = useQuery({
    queryKey: ["teacher-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*, assignments(title, courses(title, instructor_id))")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((s: any) => s.assignments?.courses?.instructor_id === user!.id);
    },
    enabled: !!user?.id,
  });

  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["submission-profiles", submissions.map((s: any) => s.student_id)],
    queryFn: async () => {
      const ids = [...new Set(submissions.map((s: any) => s.student_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: submissions.length > 0,
  });

  const profileMap = new Map(studentProfiles.map((p: any) => [p.user_id, p.full_name]));

  const filtered = submissions.filter((s: any) => {
    const name = profileMap.get(s.student_id) || "";
    const title = s.assignments?.title || "";
    return name.toLowerCase().includes(search.toLowerCase()) || title.toLowerCase().includes(search.toLowerCase());
  });

  const pending = filtered.filter((s: any) => s.status === "submitted");
  const graded = filtered.filter((s: any) => s.status === "graded" || s.status === "returned");

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">과제 관리</h1>
          <p className="text-muted-foreground mt-1">제출된 과제를 확인하고 채점하세요.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-1">채점 대기</p>
          </div>
          <div className="stat-card text-center">
            <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{graded.length}</p>
            <p className="text-xs text-muted-foreground mt-1">채점 완료</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="학생 또는 과제 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        {pending.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">채점 대기</h2>
            <div className="space-y-3">
              {pending.map((sub: any) => (
                <div key={sub.id} className="stat-card flex items-center gap-4 cursor-pointer group !p-4">
                  <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{profileMap.get(sub.student_id) || "학생"}</h3>
                    <p className="text-xs text-muted-foreground truncate">{sub.assignments?.title}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {sub.assignments?.courses?.title} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("ko-KR") : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0">채점하기</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {graded.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">채점 완료</h2>
            <div className="space-y-3">
              {graded.map((sub: any) => (
                <div key={sub.id} className="stat-card flex items-center gap-4 !p-4 opacity-80">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{profileMap.get(sub.student_id) || "학생"}</h3>
                    <p className="text-xs text-muted-foreground truncate">{sub.assignments?.title}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub.assignments?.courses?.title}</p>
                  </div>
                  <span className="text-sm font-semibold text-success">{sub.score != null ? `${sub.score}점` : "-"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="stat-card text-center py-10">
            <p className="text-sm text-muted-foreground">제출된 과제가 없습니다.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssignments;
