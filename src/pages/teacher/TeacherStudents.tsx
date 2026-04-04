import { Users, Search, TrendingUp, BookOpen, Award, MoreVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const TeacherStudents = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");

  // Fetch teacher's courses
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

  const courseIds = myCourses.map((c: any) => c.id);

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ["teacher-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .in("course_id", courseIds);
      if (error) throw error;
      return data;
    },
    enabled: courseIds.length > 0,
  });

  const studentIds = [...new Set(enrollments.map((e: any) => e.user_id))];

  // Fetch profiles
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

  // Fetch content progress for all students
  const { data: allProgress = [] } = useQuery({
    queryKey: ["teacher-student-progress", courseIds, studentIds],
    queryFn: async () => {
      if (courseIds.length === 0 || studentIds.length === 0) return [];
      const { data: contents } = await supabase
        .from("course_contents")
        .select("id, course_id")
        .in("course_id", courseIds)
        .eq("is_published", true);
      if (!contents || contents.length === 0) return [];
      const { data, error } = await supabase
        .from("content_progress")
        .select("*")
        .in("user_id", studentIds)
        .in("content_id", contents.map(c => c.id));
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0 && studentIds.length > 0,
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
  const courseMap = new Map(myCourses.map((c: any) => [c.id, c.title]));

  // Filter enrollments by selected course
  const filteredEnrollments = selectedCourseId === "all"
    ? enrollments
    : enrollments.filter((e: any) => e.course_id === selectedCourseId);

  const filteredStudentIds = [...new Set(filteredEnrollments.map((e: any) => e.user_id))];

  // Build student data
  const studentData = filteredStudentIds.map((id) => {
    const profile = profileMap.get(id);
    const studentEnrollments = filteredEnrollments.filter((e: any) => e.user_id === id);
    const avgProgress = studentEnrollments.length > 0
      ? Math.round(studentEnrollments.reduce((sum: number, e: any) => sum + (Number(e.progress) || 0), 0) / studentEnrollments.length)
      : 0;
    const completedCourses = studentEnrollments.filter((e: any) => !!e.completed_at).length;
    const completionRate = studentEnrollments.length > 0
      ? Math.round((completedCourses / studentEnrollments.length) * 100)
      : 0;

    // Course names for this student
    const courseNames = studentEnrollments.map((e: any) => courseMap.get(e.course_id) || "").filter(Boolean);

    // Last activity from content_progress
    const studentProgress = allProgress.filter((p: any) => p.user_id === id);
    const lastActivity = studentProgress.length > 0
      ? studentProgress.reduce((latest: string, p: any) => {
          const d = p.last_accessed_at || p.completed_at;
          return d && d > latest ? d : latest;
        }, "")
      : null;

    const isActive = lastActivity
      ? (Date.now() - new Date(lastActivity).getTime()) < 7 * 24 * 60 * 60 * 1000
      : false;

    return {
      userId: id,
      name: profile?.full_name || "사용자",
      department: profile?.department || "-",
      position: profile?.position || "",
      courseCount: studentEnrollments.length,
      courseNames,
      avgProgress,
      completionRate,
      lastActivity,
      isActive,
    };
  });

  // Stats
  const totalStudents = studentData.length;
  const activeStudents = studentData.filter(s => s.isActive).length;
  const avgProgressAll = totalStudents > 0
    ? Math.round(studentData.reduce((sum, s) => sum + s.avgProgress, 0) / totalStudents)
    : 0;
  const excellentStudents = studentData.filter(s => s.completionRate >= 90).length;

  const filtered = studentData.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCourseName = selectedCourseId === "all" ? "전체 강좌" : (courseMap.get(selectedCourseId) || "");

  const stats = [
    { label: "전체 학생", value: totalStudents, sub: selectedCourseId === "all" ? `${myCourses.length}개 강좌` : selectedCourseName, icon: Users },
    { label: "활성 학생", value: activeStudents, sub: totalStudents > 0 ? `${Math.round((activeStudents / totalStudents) * 100)}% 활동률` : "0%", icon: TrendingUp },
    { label: "평균 진행률", value: `${avgProgressAll}%`, sub: selectedCourseId === "all" ? "전체 강의 기준" : "선택 강좌 기준", icon: BookOpen },
    { label: "우수 학생", value: excellentStudents, sub: "90% 이상 완료", icon: Award },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> 학생 관리
            </h1>
            <p className="text-sm text-muted-foreground mt-1">학생들의 학습 진행 상황과 활동을 모니터링하세요</p>
          </div>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-52 h-9 text-xs">
              <SelectValue placeholder="강좌 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 강좌</SelectItem>
              {myCourses.map((c: any) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Student list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-base font-semibold text-foreground">학생 목록</h2>
                <p className="text-xs text-muted-foreground">학생들의 상세 학습 현황을 확인하세요</p>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="학생 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? "검색 결과가 없습니다." : "수강생이 없습니다."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">학생</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground px-3 py-2.5">수강 강의</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground px-3 py-2.5 hidden sm:table-cell">평균 진행률</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground px-3 py-2.5">완료율</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground px-3 py-2.5 hidden md:table-cell">최근 활동</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground px-3 py-2.5">상태</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground px-3 py-2.5 w-10">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((student) => (
                    <tr key={student.userId} className="hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => navigate(`/teacher/students/${student.userId}`)}>
                      {/* Student info */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {student.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{student.department}{student.position ? ` · ${student.position}` : ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Course count */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm text-foreground">{student.courseCount}개</span>
                      </td>

                      {/* Avg progress */}
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={student.avgProgress} className="w-16 h-1.5" />
                          <span className="text-xs text-muted-foreground w-8">{student.avgProgress}%</span>
                        </div>
                      </td>

                      {/* Completion rate */}
                      <td className="px-3 py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${
                            student.completionRate >= 90
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : student.completionRate >= 50
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {student.completionRate}%
                        </Badge>
                      </td>

                      {/* Last activity */}
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {student.lastActivity
                            ? formatDistanceToNow(new Date(student.lastActivity), { addSuffix: true, locale: ko })
                            : "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${
                            student.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {student.isActive ? "활성" : "비활성"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem className="text-xs">학습 현황 보기</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs">메시지 보내기</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudents;
