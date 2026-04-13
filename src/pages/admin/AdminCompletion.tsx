import { Trophy, Download, Settings, FileImage, Award } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CompletionCriteriaDialog from "@/components/admin/CompletionCriteriaDialog";
import CertificateTemplateDialog from "@/components/admin/CertificateTemplateDialog";
import { generateCertificateImage, downloadBlob } from "@/lib/certificateGenerator";

const AdminCompletion = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [courseFilter, setCourseFilter] = useState("all");
  const [criteriaDialog, setCriteriaDialog] = useState<{ open: boolean; courseId: string; courseName: string }>({ open: false, courseId: "", courseName: "" });
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; courseId: string; courseName: string }>({ open: false, courseId: "", courseName: "" });
  const [issuingCert, setIssuingCert] = useState<string | null>(null);

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

  const { data: criteriaList = [] } = useQuery({
    queryKey: ["admin-comp-criteria"],
    queryFn: async () => {
      const { data, error } = await supabase.from("completion_criteria").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["admin-comp-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["admin-comp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificate_templates").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: assessmentAttempts = [] } = useQuery({
    queryKey: ["admin-comp-assessment-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_attempts").select("user_id, assessment_id, score, passed, completed_at");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));
  const courseMap = new Map(courses.map((c: any) => [c.id, c]));
  const criteriaMap = new Map(criteriaList.map((c: any) => [c.course_id, c]));
  const templateMap = new Map(templates.map((t: any) => [t.course_id, t]));
  const certSet = new Set(certificates.map((c: any) => `${c.user_id}_${c.course_id}`));

  // Best assessment score per user (across all assessments)
  const bestScoreByUser = new Map<string, number>();
  assessmentAttempts.forEach((a: any) => {
    if (a.score != null && a.completed_at) {
      const cur = bestScoreByUser.get(a.user_id) || 0;
      if (Number(a.score) > cur) bestScoreByUser.set(a.user_id, Number(a.score));
    }
  });

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
    const criteria = criteriaMap.get(e.course_id);
    const progress = Number(e.progress) || 0;
    const minProgress = criteria ? Number(criteria.min_progress_pct) : 80;
    const minScore = criteria?.min_assessment_score != null ? Number(criteria.min_assessment_score) : null;

    if (progress < minProgress) return false;
    if (minScore != null) {
      const userScore = bestScoreByUser.get(e.user_id);
      if (userScore == null || userScore < minScore) return false;
    }
    if (e.completed_at) return true;
    return progress >= minProgress;
  };

  const getReqText = (courseId: string) => {
    const criteria = criteriaMap.get(courseId);
    if (!criteria) return t("admin.progress80");
    const parts = [`진도 ${criteria.min_progress_pct}%`];
    if (criteria.min_assessment_score != null) parts.push(`평가 ${criteria.min_assessment_score}점`);
    return parts.join(" + ");
  };

  const hasCert = (userId: string, courseId: string) => certSet.has(`${userId}_${courseId}`);

  const handleIssueCert = async (enrollment: any) => {
    const key = `${enrollment.user_id}_${enrollment.course_id}`;
    setIssuingCert(key);
    try {
      const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const template = templateMap.get(enrollment.course_id);
      const blob = await generateCertificateImage({
        studentName: profileMap.get(enrollment.user_id) || "-",
        courseName: courseMap.get(enrollment.course_id)?.title || "-",
        issuedDate: new Date().toLocaleDateString("ko-KR"),
        certificateNumber: certNumber,
        titleText: template?.title_text || "수료증",
        descText: template?.description_text || "위 사람은 본 교육과정을 성실히 이수하였기에 이 증서를 수여합니다.",
        issuerName: template?.issuer_name || "",
        backgroundImageUrl: template?.background_image_url || null,
      });

      // Save record
      const { error } = await supabase.from("certificates").insert({
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        certificate_number: certNumber,
      });
      if (error) throw error;

      downloadBlob(blob, `certificate_${certNumber}.png`);
      queryClient.invalidateQueries({ queryKey: ["admin-comp-certificates"] });
      toast.success(t("admin.certIssued", "이수증이 발급되었습니다"));
    } catch (err) {
      console.error(err);
      toast.error(t("common.error"));
    }
    setIssuingCert(null);
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
      return [profileMap.get(e.user_id) || "-", courseMap.get(e.course_id)?.title || "-", `${attRate}%`, `${avgScore}`, getReqText(e.course_id), isComplete ? t("admin.completedLabel") : t("admin.incompletedLabel")];
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

        {/* Course criteria quick settings */}
        <div className="stat-card !p-3 sm:!p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue placeholder={t("admin.allCourses")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allCourses")}</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {courseFilter !== "all" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setCriteriaDialog({ open: true, courseId: courseFilter, courseName: courseMap.get(courseFilter)?.title || "" })}
                >
                  <Settings className="h-3.5 w-3.5" />
                  {t("admin.completionReq")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setTemplateDialog({ open: true, courseId: courseFilter, courseName: courseMap.get(courseFilter)?.title || "" })}
                >
                  <FileImage className="h-3.5 w-3.5" />
                  {t("admin.certTemplateTitle", "이수증 템플릿")}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile cards */}
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
                const certKey = `${e.user_id}_${e.course_id}`;
                const issued = hasCert(e.user_id, e.course_id);
                const criteria = criteriaMap.get(e.course_id);
                const certEnabled = criteria?.certificate_enabled;

                return (
                  <article key={e.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground break-words">{profileMap.get(e.user_id) || "-"}</h3>
                        <p className="text-xs text-muted-foreground mt-1 break-words">{courseMap.get(e.course_id)?.title || "-"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={isComplete ? "default" : "destructive"} className="text-[10px]">
                          {isComplete ? t("admin.completedLabel") : t("admin.incompletedLabel")}
                        </Badge>
                        {isComplete && certEnabled && !issued && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1" onClick={() => handleIssueCert(e)} disabled={issuingCert === certKey}>
                            <Award className="h-3 w-3" /> 발급
                          </Button>
                        )}
                        {issued && <Badge variant="secondary" className="text-[10px]">발급완료</Badge>}
                      </div>
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
                        <dd className="mt-1 text-foreground">{getReqText(e.course_id)}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto -mx-3 sm:-mx-5">
            <div className="min-w-[860px] px-3 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.nameColumn")}</TableHead>
                    <TableHead>{t("admin.courseLabel")}</TableHead>
                    <TableHead>{t("admin.attendanceRate")}</TableHead>
                    <TableHead>{t("admin.avgScore")}</TableHead>
                    <TableHead>{t("admin.completionReq")}</TableHead>
                    <TableHead>{t("admin.completionStatus")}</TableHead>
                    <TableHead>{t("admin.certColumn", "이수증")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t("admin.noStudentData")}</TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((e: any) => {
                      const attKey = `${e.user_id}_${e.course_id}`;
                      const att = attendanceByUserCourse.get(attKey);
                      const attRate = att ? Math.round((att.present / att.total) * 100) : 0;
                      const sc = scoreByStudent.get(e.user_id);
                      const avgScore = sc ? Math.round(sc.total / sc.count) : 0;
                      const isComplete = getCompletionStatus(e);
                      const certKey = `${e.user_id}_${e.course_id}`;
                      const issued = hasCert(e.user_id, e.course_id);
                      const criteria = criteriaMap.get(e.course_id);
                      const certEnabled = criteria?.certificate_enabled;

                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium text-sm">{profileMap.get(e.user_id) || "-"}</TableCell>
                          <TableCell className="max-w-[240px] text-sm whitespace-normal break-words">{courseMap.get(e.course_id)?.title || "-"}</TableCell>
                          <TableCell className="text-sm">{attRate}%</TableCell>
                          <TableCell className="text-sm">{avgScore}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{getReqText(e.course_id)}</TableCell>
                          <TableCell>
                            <Badge variant={isComplete ? "default" : "destructive"} className="text-[10px]">
                              {isComplete ? t("admin.completedLabel") : t("admin.incompletedLabel")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {issued ? (
                              <Badge variant="secondary" className="text-[10px]">발급완료</Badge>
                            ) : isComplete && certEnabled ? (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => handleIssueCert(e)} disabled={issuingCert === certKey}>
                                <Award className="h-3.5 w-3.5" /> 발급
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
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

      <CompletionCriteriaDialog
        courseId={criteriaDialog.courseId}
        courseName={criteriaDialog.courseName}
        open={criteriaDialog.open}
        onOpenChange={(open) => setCriteriaDialog((prev) => ({ ...prev, open }))}
      />
      <CertificateTemplateDialog
        courseId={templateDialog.courseId}
        courseName={templateDialog.courseName}
        open={templateDialog.open}
        onOpenChange={(open) => setTemplateDialog((prev) => ({ ...prev, open }))}
      />
    </DashboardLayout>
  );
};

export default AdminCompletion;
