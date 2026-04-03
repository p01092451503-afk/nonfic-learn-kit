import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Users, BookOpen, Clock, ChevronDown, LayoutGrid, List } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

const statusLabel: Record<string, string> = {
  draft: "초안",
  published: "공개",
  archived: "보관",
};

const statusColor: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-secondary text-muted-foreground",
};

const difficultyLabel: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

const TeacherCourses = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

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

  const filtered = courses.filter((c: any) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: courses.length,
    published: courses.filter((c: any) => c.status === "published").length,
    draft: courses.filter((c: any) => c.status === "draft").length,
    totalStudents: Object.values(enrollmentCounts as Record<string, number>).reduce((a, b) => a + b, 0),
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">강좌 관리</h1>
            <p className="text-sm text-muted-foreground mt-1">담당 강좌를 등록하고 관리하세요.</p>
          </div>
          <Link to="/teacher/courses/new">
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> 새 강좌
            </Button>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="stat-card p-4">
            <p className="text-xs text-muted-foreground">전체 강좌</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          </div>
          <div className="stat-card p-4">
            <p className="text-xs text-muted-foreground">공개 중</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.published}</p>
          </div>
          <div className="stat-card p-4">
            <p className="text-xs text-muted-foreground">초안</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.draft}</p>
          </div>
          <div className="stat-card p-4">
            <p className="text-xs text-muted-foreground">총 수강생</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalStudents}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="강좌명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 rounded-xl h-10">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="published">공개</SelectItem>
              <SelectItem value="draft">초안</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="stat-card text-center py-16">
            <div className="space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">등록된 강좌가 없습니다.</p>
              <Link to="/teacher/courses/new">
                <Button size="sm" className="rounded-xl gap-2 mt-2">
                  <Plus className="h-3.5 w-3.5" /> 첫 강좌 만들기
                </Button>
              </Link>
            </div>
          </div>
        ) : viewMode === "list" ? (
          /* ───── List View ───── */
          <div className="stat-card !p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">강좌</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">카테고리</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">상태</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">난이도</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">수강생</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">콘텐츠</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((course: any) => {
                  const cat = categoryMap.get(course.category_id);
                  const students = (enrollmentCounts as any)[course.id] || 0;
                  const contents = (contentCounts as any)[course.id] || 0;

                  return (
                    <tr
                      key={course.id}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="h-12 w-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
                            {course.thumbnail_url ? (
                              <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[200px] lg:max-w-[300px]">
                              {course.title}
                            </p>
                            {course.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[200px] lg:max-w-[300px] mt-0.5">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {cat?.name && (
                          <span className="text-xs text-muted-foreground">{cat.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-center">
                        <span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-lg ${statusColor[course.status || "draft"]}`}>
                          {statusLabel[course.status || "draft"] || course.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-center">
                        <span className="text-xs text-muted-foreground">
                          {difficultyLabel[course.difficulty_level || ""] || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {students}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" /> {contents}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> 미리보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> 수정
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ───── Grid View ───── */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course: any) => {
              const cat = categoryMap.get(course.category_id);
              const students = (enrollmentCounts as any)[course.id] || 0;
              const contents = (contentCounts as any)[course.id] || 0;

              return (
                <div
                  key={course.id}
                  className="stat-card !p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-36 bg-secondary overflow-hidden">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${statusColor[course.status || "draft"]}`}>
                        {statusLabel[course.status || "draft"]}
                      </span>
                    </div>
                    {course.is_mandatory && (
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-destructive text-destructive-foreground px-2 py-1 rounded-lg">
                        필수
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{course.title}</h3>
                        {cat?.name && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cat.name}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg shrink-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> 미리보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> 수정
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {course.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                    )}

                    <div className="flex items-center gap-3 pt-1 border-t border-border">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {students}명
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {contents}강
                      </span>
                      {course.difficulty_level && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {difficultyLabel[course.difficulty_level]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherCourses;
