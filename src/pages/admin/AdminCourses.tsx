import { Plus, Users, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import CourseCard from "@/components/CourseCard";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AdminCourses = () => {
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const { data: courses = [] } = useQuery({ queryKey: ["admin-courses"], queryFn: async () => { const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => { const { data, error } = await supabase.from("categories").select("id, name, slug"); if (error) throw error; return data; } });
  const { data: enrollments = [] } = useQuery({ queryKey: ["admin-all-enrollments"], queryFn: async () => { const { data, error } = await supabase.from("enrollments").select("course_id, progress"); if (error) throw error; return data; } });
  const { data: instructorProfiles = [] } = useQuery({ queryKey: ["instructor-profiles", courses.map((c: any) => c.instructor_id).filter(Boolean)], queryFn: async () => { const ids = [...new Set(courses.map((c: any) => c.instructor_id).filter(Boolean))]; if (ids.length === 0) return []; const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids); if (error) throw error; return data; }, enabled: courses.length > 0 });

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const instructorMap = new Map(instructorProfiles.map((p: any) => [p.user_id, p.full_name]));
  const enrollmentMap = new Map<string, { count: number; avgProgress: number }>();
  const grouped: Record<string, { total: number; progress: number }> = {};
  enrollments.forEach((e: any) => { if (!grouped[e.course_id]) grouped[e.course_id] = { total: 0, progress: 0 }; grouped[e.course_id].total++; grouped[e.course_id].progress += Number(e.progress) || 0; });
  Object.entries(grouped).forEach(([id, v]) => { enrollmentMap.set(id, { count: v.total, avgProgress: Math.round(v.progress / v.total) }); });

  const filtered = courses.filter((c: any) => c.title.toLowerCase().includes(search.toLowerCase()));
  const publishedCount = courses.filter((c: any) => c.status === "published").length;
  const totalStudents = Object.values(grouped).reduce((s, v) => s + v.total, 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("admin.courseManagement")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.courseManagementDesc")}</p>
          </div>
          <Link to="/admin/courses/new"><Button className="rounded-xl gap-2"><Plus className="h-4 w-4" /> {t("admin.newCourse")}</Button></Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center"><p className="text-2xl font-bold text-foreground">{courses.length}</p><p className="text-xs text-muted-foreground mt-1">{t("admin.totalCoursesLabel")}</p></div>
          <div className="stat-card text-center"><p className="text-2xl font-bold text-foreground">{publishedCount}</p><p className="text-xs text-muted-foreground mt-1">{t("admin.publishedCourses")}</p></div>
          <div className="stat-card text-center"><p className="text-2xl font-bold text-foreground">{totalStudents}</p><p className="text-xs text-muted-foreground mt-1">{t("admin.totalStudents")}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("course.searchCourse")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" /></div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2"><Filter className="h-3.5 w-3.5" /> {t("common.filter")}</Button>
        </div>
        {filtered.length === 0 ? (
          <div className="stat-card text-center py-10"><p className="text-sm text-muted-foreground">{t("admin.noCoursesFound")}</p></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course: any) => { const cat = categoryMap.get(course.category_id); const enrollment = enrollmentMap.get(course.id); return (<CourseCard key={course.id} course={course} categorySlug={cat?.slug} categoryName={cat?.name} studentCount={enrollment?.count || 0} instructorName={instructorMap.get(course.instructor_id)} variant="admin" />); })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCourses;