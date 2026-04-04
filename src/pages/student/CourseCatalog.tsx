import { useState, useRef } from "react";
import { Search, BookOpen, Users, Clock, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import loginBg from "@/assets/login-bg.jpg";

const categoryGradients: Record<string, string> = {
  marketing: "from-orange-500 to-pink-500", sales: "from-blue-500 to-cyan-500",
  "product-development": "from-purple-500 to-indigo-500", "skin-science": "from-rose-400 to-pink-600",
  "beauty-trends": "from-fuchsia-500 to-violet-500", "design-creative": "from-amber-400 to-orange-500",
  "quality-regulation": "from-emerald-500 to-teal-500", "scm-logistics": "from-sky-500 to-blue-600",
  "management-leadership": "from-slate-500 to-zinc-600", "finance-accounting": "from-green-500 to-emerald-600",
  "hr-culture": "from-pink-400 to-rose-500", "it-digital": "from-violet-500 to-purple-600",
  "customer-service": "from-cyan-400 to-blue-500", "legal-compliance": "from-gray-500 to-slate-600",
  "self-development": "from-yellow-400 to-amber-500", "safety-environment": "from-lime-500 to-green-600",
};

/* ── Carousel Arrow ── */
const ScrollArrow = ({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="absolute top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card/90 border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all"
    style={{ [direction]: -12 }}
  >
    {direction === "left" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
  </button>
);

/* ── Course Card (shared between grid & carousel) ── */
const CatalogCourseCard = ({
  course, cat, gradient, isEnrolled, studentCount, lessons, onEnroll, isPending, t,
}: any) => (
  <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 shrink-0 w-[280px] sm:w-auto">
    <Link to={`/courses/${course.id}`} className="block">
      <div className={`relative h-40 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />}
        {!course.thumbnail_url && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 h-24 w-24 rounded-full bg-white/30 blur-xl" />
            <div className="absolute bottom-2 left-6 h-16 w-16 rounded-full bg-white/20 blur-lg" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          {course.is_mandatory && (
            <span className="text-[10px] font-semibold bg-destructive text-destructive-foreground px-2.5 py-1 rounded-lg">{t("common.required")}</span>
          )}
        </div>
        {course.difficulty_level && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold bg-white/90 text-foreground px-2 py-1 rounded-lg backdrop-blur-sm">{t(`teacher.${course.difficulty_level}`)}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          {cat && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm mb-1.5">
              <Sparkles className="h-2.5 w-2.5" /> {cat.name}
            </span>
          )}
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{course.title}</h3>
        </div>
      </div>
    </Link>
    <div className="p-4 space-y-3">
      {course.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        {course.estimated_duration_hours != null && course.estimated_duration_hours > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {t("course.duration", { hours: course.estimated_duration_hours })}</span>
        )}
        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {studentCount}{t("common.people")}</span>
        {lessons > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" /> {t("course.lessonsCount", { count: lessons })}</span>}
      </div>
      {isEnrolled ? (
        <Link to={`/courses/${course.id}?view=learn`}>
          <Button variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1.5">{t("catalog.continueLearning")}<ChevronRight className="h-3.5 w-3.5" /></Button>
        </Link>
      ) : (
        <Button size="sm" className="w-full rounded-xl text-xs" onClick={(e) => { e.preventDefault(); onEnroll(course.id); }} disabled={isPending}>{t("catalog.enroll")}</Button>
      )}
    </div>
  </div>
);

/* ── Category Carousel Section ── */
const CategoryCarousel = ({ category, courses, helpers }: { category: any; courses: any[]; helpers: any }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (courses.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
        <button
          onClick={() => helpers.setActiveCategory(category.id)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
        >
          + {helpers.t("common.viewAll")}
        </button>
      </div>
      <div className="relative">
        {courses.length > 3 && <ScrollArrow direction="left" onClick={() => scroll("left")} />}
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
          {courses.map((course: any) => {
            const cat = helpers.categoryMap.get(course.category_id);
            const gradient = categoryGradients[cat?.slug || ""] || "from-primary to-primary/80";
            return (
              <div key={course.id} className="snap-start">
                <CatalogCourseCard
                  course={course}
                  cat={cat}
                  gradient={gradient}
                  isEnrolled={helpers.enrolledSet.has(course.id)}
                  studentCount={helpers.countMap.get(course.id) || 0}
                  lessons={helpers.contentCountMap.get(course.id) || 0}
                  onEnroll={helpers.onEnroll}
                  isPending={helpers.isPending}
                  t={helpers.t}
                />
              </div>
            );
          })}
        </div>
        {courses.length > 3 && <ScrollArrow direction="right" onClick={() => scroll("right")} />}
      </div>
    </section>
  );
};

/* ── Main Page ── */
const CourseCatalog = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["catalog-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("status", "published").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollment-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      if (error) throw error;
      return data.map((e) => e.course_id);
    },
    enabled: !!user?.id,
  });

  const { data: enrollmentCounts = [] } = useQuery({
    queryKey: ["catalog-enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("course_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: contentCounts = [] } = useQuery({
    queryKey: ["catalog-content-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_contents").select("course_id").eq("is_published", true);
      if (error) throw error;
      return data;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("enrollments").insert({ course_id: courseId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollment-ids"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-enrollment-counts"] });
      toast({ title: t("catalog.enrollSuccess") });
    },
    onError: (e: any) => {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    },
  });

  const enrolledSet = new Set(enrollments);
  const countMap = new Map<string, number>();
  enrollmentCounts.forEach((e: any) => countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1));
  const contentCountMap = new Map<string, number>();
  contentCounts.forEach((c: any) => contentCountMap.set(c.course_id, (contentCountMap.get(c.course_id) || 0) + 1));
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

  const filtered = courses.filter((c: any) => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "all" || c.category_id === activeCategory;
    return matchSearch && matchCategory;
  });

  // Group courses by category for carousel view
  const coursesByCategory = new Map<string, any[]>();
  courses.forEach((c: any) => {
    if (!c.category_id) return;
    const arr = coursesByCategory.get(c.category_id) || [];
    arr.push(c);
    coursesByCategory.set(c.category_id, arr);
  });

  const isCarouselView = activeCategory === "all" && !search;

  const carouselHelpers = {
    categoryMap, enrolledSet, countMap, contentCountMap, t,
    onEnroll: (id: string) => enrollMutation.mutate(id),
    isPending: enrollMutation.isPending,
    setActiveCategory,
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-0 -m-6 lg:-m-8">
        {/* Hero banner */}
        <div className="relative h-48 lg:h-56 overflow-hidden">
          <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/10 to-transparent" />
          <div className="relative z-10 flex flex-col justify-center h-full px-6 lg:px-10">
            <p className="text-xs tracking-[0.2em] text-foreground/60 uppercase mb-2">NONFICTION Education</p>
            <h1 className="font-display text-3xl lg:text-4xl tracking-wide text-foreground">{t("catalog.title")}</h1>
            <p className="mt-2 text-sm text-foreground/60 max-w-lg">{t("catalog.subtitle")}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-10 py-8 space-y-6">
          {/* Category tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide border-b border-border">
            <button
              onClick={() => { setActiveCategory("all"); setSearch(""); }}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-[2px] ${activeCategory === "all" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t("catalog.allCourses")}
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-[2px] ${activeCategory === cat.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("catalog.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-12 rounded-xl border-border bg-card text-sm" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><span className="h-6 w-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /></div>
          ) : isCarouselView ? (
            /* ── Carousel view: grouped by category ── */
            <div className="space-y-10">
              {categories.map((cat: any) => {
                const catCourses = coursesByCategory.get(cat.id) || [];
                return (
                  <CategoryCarousel
                    key={cat.id}
                    category={cat}
                    courses={catCourses}
                    helpers={carouselHelpers}
                  />
                );
              })}
              {/* Uncategorized courses */}
              {courses.filter((c: any) => !c.category_id).length > 0 && (
                <CategoryCarousel
                  category={{ id: "uncategorized", name: t("common.all") }}
                  courses={courses.filter((c: any) => !c.category_id)}
                  helpers={carouselHelpers}
                />
              )}
            </div>
          ) : (
            /* ── Grid view: filtered by category or search ── */
            <>
              <p className="text-sm text-muted-foreground">{t("catalog.resultCount", { count: filtered.length })}</p>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center"><BookOpen className="h-7 w-7 text-muted-foreground" /></div>
                  <p className="text-sm text-muted-foreground">{t("catalog.noCourses")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map((course: any) => {
                    const cat = categoryMap.get(course.category_id);
                    const gradient = categoryGradients[cat?.slug || ""] || "from-primary to-primary/80";
                    return (
                      <CatalogCourseCard
                        key={course.id}
                        course={course}
                        cat={cat}
                        gradient={gradient}
                        isEnrolled={enrolledSet.has(course.id)}
                        studentCount={countMap.get(course.id) || 0}
                        lessons={contentCountMap.get(course.id) || 0}
                        onEnroll={(id: string) => enrollMutation.mutate(id)}
                        isPending={enrollMutation.isPending}
                        t={t}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseCatalog;
