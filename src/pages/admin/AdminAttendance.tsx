import { CalendarCheck, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  excused: "outline",
};

interface AdminAttendanceProps {
  role?: "admin" | "teacher";
}

const AdminAttendance = ({ role = "admin" }: AdminAttendanceProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Form state
  const [formCourseId, setFormCourseId] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState<string>("present");
  const [formNotes, setFormNotes] = useState("");

  const isTeacher = role === "teacher";

  // Courses: teacher sees only their own courses
  const { data: courses = [] } = useQuery({
    queryKey: ["att-courses", role, user?.id],
    queryFn: async () => {
      let q = supabase.from("courses").select("id, title").order("title");
      if (isTeacher && user?.id) q = q.eq("instructor_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const courseIds = courses.map((c: any) => c.id);

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance-list", role, courseIds],
    queryFn: async () => {
      if (isTeacher && courseIds.length === 0) return [];
      let q = supabase.from("attendance").select("*").order("attendance_date", { ascending: false });
      if (isTeacher) q = q.in("course_id", courseIds);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: isTeacher ? courseIds.length > 0 : true,
  });

  // Get enrolled students for the selected course
  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ["att-enrolled", formCourseId],
    queryFn: async () => {
      if (!formCourseId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", formCourseId)
        .eq("status", "approved");
      if (error) throw error;
      return data;
    },
    enabled: !!formCourseId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["att-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));
  const courseMap = new Map(courses.map((c: any) => [c.id, c.title]));

  const filtered = attendance.filter((a: any) => {
    if (courseFilter !== "all" && a.course_id !== courseFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });
  const visibleRows = filtered.slice(0, 50);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return i18n.language?.startsWith("en") ? new Date(d).toLocaleDateString("en-US") : new Date(d).toLocaleDateString("ko-KR");
  };

  const formatTime = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleTimeString(i18n.language?.startsWith("en") ? "en-US" : "ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formCourseId || !formUserId || !formStatus) throw new Error("Required fields missing");
      const payload = {
        course_id: formCourseId,
        user_id: formUserId,
        attendance_date: formDate,
        status: formStatus as any,
        check_in_time: formStatus === "present" || formStatus === "late" ? new Date().toISOString() : null,
        notes: formNotes || null,
      };
      if (editTarget) {
        const { error } = await supabase.from("attendance").update(payload).eq("id", editTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editTarget ? t("common.saved", "저장되었습니다") : t("common.created", "생성되었습니다"));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
      setDeleteTarget(null);
      toast.success(t("common.deleted", "삭제되었습니다"));
    },
  });

  const resetForm = () => {
    setEditTarget(null);
    setFormCourseId("");
    setFormUserId("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStatus("present");
    setFormNotes("");
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditTarget(a);
    setFormCourseId(a.course_id);
    setFormUserId(a.user_id);
    setFormDate(a.attendance_date || new Date().toISOString().slice(0, 10));
    setFormStatus(a.status || "present");
    setFormNotes(a.notes || "");
    setDialogOpen(true);
  };

  const exportExcel = () => {
    const header = [t("admin.dateColumn"), t("admin.nameColumn"), t("admin.courseLabel"), t("admin.statusLabel"), t("admin.checkInTime"), t("admin.notes")];
    const rows = filtered.map((a: any) => [
      formatDate(a.attendance_date),
      profileMap.get(a.user_id) || "-",
      courseMap.get(a.course_id) || "-",
      a.status || "-",
      formatTime(a.check_in_time),
      a.notes || "",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
    a.click();
  };

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              {t("admin.attendanceManagement")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.attendanceManagementDesc")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAdd} className="rounded-xl gap-2 text-sm">
              <Plus className="h-4 w-4" /> {t("admin.markAttendance", "출석 기록")}
            </Button>
            <Button onClick={exportExcel} variant="outline" className="rounded-xl gap-2 text-sm">
              <Download className="h-4 w-4" /> {t("admin.excelDownload")}
            </Button>
          </div>
        </div>

        <div className="stat-card !p-3 sm:!p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue placeholder={t("admin.allCourses")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allCourses")}</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue placeholder={t("admin.allStatuses")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                <SelectItem value="present">{t("admin.present")}</SelectItem>
                <SelectItem value="absent">{t("admin.absent")}</SelectItem>
                <SelectItem value="late">{t("admin.late")}</SelectItem>
                <SelectItem value="excused">{t("admin.excused")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3" aria-label={t("admin.attendanceManagement")}>
            {visibleRows.length === 0 ? (
              <div className="rounded-xl border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                {t("admin.noAttendanceData")}
              </div>
            ) : (
              visibleRows.map((a: any) => (
                <article key={a.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{formatDate(a.attendance_date)}</p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground break-words">{profileMap.get(a.user_id) || "-"}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={(statusColor[a.status] as any) || "outline"} className="text-[10px]">
                        {t(`admin.${a.status}`)}
                      </Badge>
                      <button onClick={() => openEdit(a)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(a)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">{t("admin.courseLabel")}</dt>
                      <dd className="mt-1 text-foreground break-words">{courseMap.get(a.course_id) || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("admin.checkInTime")}</dt>
                      <dd className="mt-1 text-foreground">{formatTime(a.check_in_time)}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto -mx-3 sm:-mx-5">
            <div className="min-w-[720px] px-3 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.dateColumn")}</TableHead>
                    <TableHead>{t("admin.nameColumn")}</TableHead>
                    <TableHead>{t("admin.courseLabel")}</TableHead>
                    <TableHead>{t("admin.statusLabel")}</TableHead>
                    <TableHead>{t("admin.checkInTime")}</TableHead>
                    <TableHead className="w-20">{t("common.actions", "관리")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("admin.noAttendanceData")}</TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{formatDate(a.attendance_date)}</TableCell>
                        <TableCell className="font-medium text-sm">{profileMap.get(a.user_id) || "-"}</TableCell>
                        <TableCell className="max-w-[260px] text-sm whitespace-normal break-words">{courseMap.get(a.course_id) || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={(statusColor[a.status] as any) || "outline"} className="text-[10px]">
                            {t(`admin.${a.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(a.check_in_time)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(a)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setDeleteTarget(a)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("admin.editAttendance", "출석 수정") : t("admin.markAttendance", "출석 기록")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("admin.courseLabel")} *</Label>
              <Select value={formCourseId} onValueChange={setFormCourseId}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t("admin.selectCourse", "강좌 선택")} /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.nameColumn")} *</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t("admin.selectStudent", "학생 선택")} /></SelectTrigger>
                <SelectContent>
                  {formCourseId ? (
                    enrolledStudents.length > 0 ? (
                      enrolledStudents.map((e: any) => (
                        <SelectItem key={e.user_id} value={e.user_id}>
                          {profileMap.get(e.user_id) || e.user_id}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">{t("admin.noStudentData", "학생 데이터가 없습니다")}</div>
                    )
                  ) : (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">{t("admin.selectCourseFirst", "강좌를 먼저 선택하세요")}</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.dateColumn")}</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-10" />
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.statusLabel")} *</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t("admin.present")}</SelectItem>
                  <SelectItem value="absent">{t("admin.absent")}</SelectItem>
                  <SelectItem value="late">{t("admin.late")}</SelectItem>
                  <SelectItem value="excused">{t("admin.excused")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.notes")}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t("admin.notesPlaceholder", "비고 입력")} className="resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>{t("common.cancel")}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !formCourseId || !formUserId}>
                {saveMutation.isPending ? "..." : t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete", "삭제 확인")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("admin.deleteAttendanceConfirm", "이 출석 기록을 삭제하시겠습니까?")}</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminAttendance;
