import { GraduationCap, Download, BarChart3, AlertTriangle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AdminLearning = () => {
  const { t, i18n } = useTranslation();
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-learning-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, status").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-learning-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("id, user_id, course_id, progress, enrolled_at, completed_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-learning-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, department");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
  const courseMap = new Map(courses.map((c: any) => [c.id, c]));

  const filtered = courseFilter === "all" ? enrollments : enrollments.filter((e: any) => e.course_id === courseFilter);
  const totalStudents = new Set(filtered.map((e: any) => e.user_id)).size;
  const completedCount = filtered.filter((e: any) => e.completed_at).length;
  const avgProgress = filtered.length > 0 ? Math.round(filtered.reduce((s: number, e: any) => s + (Number(e.progress) || 0), 0) / filtered.length) : 0;
  const atRisk = filtered.filter((e: any) => (Number(e.progress) || 0) < 20 && !e.completed_at).length;

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return i18n.language?.startsWith("en") ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : new Date(d).toLocaleDateString("ko-KR");
  };

  const getStatusBadge = (e: any) => {
    if (e.completed_at) return <Badge variant="default" className="text-[10px]">{t("common.complete")}</Badge>;
    if ((Number(e.progress) || 0) > 0) return <Badge variant="secondary" className="text-[10px]">{t("dashboard.inProgress")}</Badge>;
    return <Badge variant="outline" className="text-[10px]">{t("admin.notStarted")}</Badge>;
  };

  const exportCSV = () => {
    const header = [t("admin.nameColumn"), t("admin.courseLabel"), t("admin.progressLabel"), t("admin.statusLabel"), t("admin.startDate"), t("admin.completionDate")];
    const rows = filtered.map((e: any) => {
      const p = profileMap.get(e.user_id);
      const c = courseMap.get(e.course_id);
      const status = e.completed_at ? t("common.complete") : (Number(e.progress) || 0) > 0 ? t("dashboard.inProgress") : t("admin.notStarted");
      return [p?.full_name || "-", c?.title || "-", `${Math.round(Number(e.progress) || 0)}%`, status, formatDate(e.enrolled_at), formatDate(e.completed_at)];
    });
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "learning_report.csv"; a.click();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              {t("admin.learningManagement")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.learningManagementDesc")}</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="rounded-xl gap-2 text-sm self-start sm:self-auto">
            <Download className="h-4 w-4" aria-hidden="true" /> CSV {t("admin.download")}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: t("admin.totalEnrolled"), value: totalStudents, sub: t("admin.enrolledStudentsLabel"), icon: Users },
            { label: t("admin.completionCount"), value: completedCount, sub: `${filtered.length > 0 ? Math.round(completedCount / filtered.length * 100) : 0}% ${t("admin.completionRateLabel")}`, icon: GraduationCap },
            { label: t("admin.avgProgressLabel"), value: `${avgProgress}%`, sub: "", icon: BarChart3, showProgress: true },
            { label: t("admin.atRisk"), value: atRisk, sub: t("admin.needsAttention"), icon: AlertTriangle },
          ].map((stat) => (
            <div key={stat.label} className="stat-card !p-3 sm:!p-5" role="group" aria-label={stat.label}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</span>
              {stat.showProgress && <Progress value={avgProgress} className="mt-2 h-2" aria-label={`${t("admin.avgProgressLabel")}: ${avgProgress}%`} />}
              {stat.sub && <p className="text-[10px] sm:text-xs text-primary mt-1">{stat.sub}</p>}
            </div>
          ))}
        </div>

        <Tabs defaultValue="progress">
          <TabsList>
            <TabsTrigger value="progress">{t("admin.progressStatus")}</TabsTrigger>
            <TabsTrigger value="completers">{t("admin.completersList")}</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="mt-4 space-y-4">
            <div className="stat-card !p-3 sm:!p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">{t("admin.studentProgressStatus")}</h3>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allCourses")}</SelectItem>
                    {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto -mx-3 sm:-mx-5">
                <div className="min-w-[420px] px-3 sm:px-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.nameColumn")}</TableHead>
                        <TableHead>{t("admin.courseLabel")}</TableHead>
                        <TableHead>{t("admin.progressLabel")}</TableHead>
                        <TableHead>{t("admin.statusLabel")}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t("admin.startDate")}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t("admin.completionDate")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("admin.noLearningData")}</TableCell></TableRow>
                      ) : (
                        filtered.slice(0, 50).map((e: any) => {
                          const p = profileMap.get(e.user_id);
                          const c = courseMap.get(e.course_id);
                          return (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium text-sm">{p?.full_name || "-"}</TableCell>
                              <TableCell className="text-sm">{c?.title || "-"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={Number(e.progress) || 0} className="w-16 sm:w-20 h-1.5" />
                                  <span className="text-xs">{Math.round(Number(e.progress) || 0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(e)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{formatDate(e.enrolled_at)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{formatDate(e.completed_at)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="completers" className="mt-4">
            <div className="stat-card !p-3 sm:!p-5">
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">{t("admin.completersList")}</h3>
              <div className="overflow-x-auto -mx-3 sm:-mx-5">
                <div className="min-w-[400px] px-3 sm:px-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.nameColumn")}</TableHead>
                        <TableHead>{t("admin.courseLabel")}</TableHead>
                        <TableHead>{t("admin.completionDate")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.filter((e: any) => e.completed_at).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t("admin.noCompleters")}</TableCell></TableRow>
                      ) : (
                        filtered.filter((e: any) => e.completed_at).map((e: any) => {
                          const p = profileMap.get(e.user_id);
                          const c = courseMap.get(e.course_id);
                          return (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium text-sm">{p?.full_name || "-"}</TableCell>
                              <TableCell className="text-sm">{c?.title || "-"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDate(e.completed_at)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminLearning;
