import { Trophy, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const AdminCompletion = () => {
  const { t } = useTranslation();
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-comp-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, status, is_mandatory").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-comp-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("id, user_id, course_id, progress, completed_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-comp-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["admin-comp-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("user_id, course_id, status");
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["admin-comp-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignment_submissions").select("student_id, score, status, assignment_id");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));
  const courseMap = new Map(courses.map((c: any) => [c.id, c]));

  const filtered = courseFilter === "all" ? enrollments : enrollments.filter((e: any) => e.course_id === courseFilter);
  const visibleRows = filtered.slice(0, 50);

  const attendanceByUserCourse = new Map<string, { total: number; present: number }>();
  attendance.forEach((a: any) => {
    const key = `${a.user_id}_${a.course_id}`;
    if (!attendanceByUserCourse.has(key)) attendanceByUserCourse.set(key, { total: 0, present: 0 });
    const value = attendanceByUserCourse.get(key)!;
    value.total++;
    if (a.status === "present" || a.status === "late") value.present++;
  });

  const scoreByStudent = new Map<string, { total: number; count: number }>();
  submissions.forEach((s: any) => {
    if (s.score == null) return;
    if (!scoreByStudent.has(s.student_id)) scoreByStudent.set(s.student_id, { total: 0, count: 0 });
    const value = scoreByStudent.get(s.student_id)!;
    value.total += s.score;
    value.count++;
  });

  const getCompletionStatus = (e: any) => {
    const progress = Number(e.progress) || 0;
    if (e.completed_at) return true;
    if (progress >= 80) return true;
    return false;
  };

  const exportCSV = () => {
    const header = [t("admin.nameColumn"), t("admin.courseLabel"), t("admin.attendanceRate"), t("admin.avgScore"), t("admin.completionReq"), t("admin.completionStatus")];
    const rows = filtered.map((e: any) => {
      const attKey = `${e.user_id}_${e.course_id}`;
      const att = attendanceByUserCourse.get(attKey);
      const attRate = att ? Math.round((att.present / att.total) * 100) : 0;
      const sc = scoreByStudent.get(e.user_id);
      const avgScore = sc ? Math.round(sc.total / sc.count) : 0;
      const isComplete = getCompletionStatus(e);
      return [profileMap.get(e.user_id) || "-", courseMap.get(e.course_id)?.title || "-", `${attRate}%`, `${avgScore}`, `${t("admin.progress80")}`, isComplete ? t("admin.completedLabel") : t("admin.incompletedLabel")];
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "completion_report.csv";
    a.click();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              {t("admin.completionManagement")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.completionManagementDesc")}</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="rounded-xl gap-2 text-sm w-full sm:w-auto justify-center sm:justify-start">
            <Download className="h-4 w-4" aria-hidden="true" /> {t("admin.completionDownload")}
          </Button>
        </div>

        <div className="stat-card !p-3 sm:!p-5 space-y-4">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue placeholder={t("admin.allCourses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allCourses")}</SelectItem>
              {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="sm:hidden space-y-3" aria-label={t("admin.completionManagement")}>
            {visibleRows.length === 0 ? (
              <div className="rounded-xl border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                {t("admin.noStudentData")}
              </div>
            ) : (
              visibleRows.map((e: any) => {
                const attKey = `${e.user_id}_${e.course_id}`;
                const att = attendanceByUserCourse.get(attKey);
                const attRate = att ? Math.round((att.present / att.total) * 100) : 0;
                const sc = scoreByStudent.get(e.user_id);
                const avgScore = sc ? Math.round(sc.total / sc.count) : 0;
                const isComplete = getCompletionStatus(e);

                return (
                  <article key={e.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground break-words">{profileMap.get(e.user_id) || "-"}</h3>
                        <p className="text-xs text-muted-foreground mt-1 break-words">{courseMap.get(e.course_id)?.title || "-"}</p>
                      </div>
                      <Badge variant={isComplete ? "default" : "destructive"} className="text-[10px] shrink-0">
                        {isComplete ? t("admin.completedLabel") : t("admin.incompletedLabel")}
                      </Badge>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{t("admin.attendanceRate")}</dt>
                        <dd className="mt-1 text-foreground">{attRate}%</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("admin.avgScore")}</dt>
                        <dd className="mt-1 text-foreground">{avgScore}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">{t("admin.completionReq")}</dt>
                        <dd className="mt-1 text-foreground">{t("admin.progress80")}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto -mx-3 sm:-mx-5">
            <div className="min-w-[760px] px-3 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.nameColumn")}</TableHead>
                    <TableHead>{t("admin.courseLabel")}</TableHead>
                    <TableHead>{t("admin.attendanceRate")}</TableHead>
                    <TableHead>{t("admin.avgScore")}</TableHead>
                    <TableHead>{t("admin.completionReq")}</TableHead>
                    <TableHead>{t("admin.completionStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("admin.noStudentData")}</TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((e: any) => {
                      const attKey = `${e.user_id}_${e.course_id}`;
                      const att = attendanceByUserCourse.get(attKey);
                      const attRate = att ? Math.round((att.present / att.total) * 100) : 0;
                      const sc = scoreByStudent.get(e.user_id);
                      const avgScore = sc ? Math.round(sc.total / sc.count) : 0;
                      const isComplete = getCompletionStatus(e);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium text-sm">{profileMap.get(e.user_id) || "-"}</TableCell>
                          <TableCell className="max-w-[240px] text-sm whitespace-normal break-words">{courseMap.get(e.course_id)?.title || "-"}</TableCell>
                          <TableCell className="text-sm">{attRate}%</TableCell>
                          <TableCell className="text-sm">{avgScore}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t("admin.progress80")}</TableCell>
                          <TableCell>
                            <Badge variant={isComplete ? "default" : "destructive"} className="text-[10px]">
                              {isComplete ? t("admin.completedLabel") : t("admin.incompletedLabel")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCompletion;
