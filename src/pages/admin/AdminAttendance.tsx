import { CalendarCheck, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const statusColor: Record<string, string> = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  excused: "outline",
};

const AdminAttendance = () => {
  const { t, i18n } = useTranslation();
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-att-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["admin-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").order("attendance_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-att-profiles"],
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

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return i18n.language?.startsWith("en") ? new Date(d).toLocaleDateString("en-US") : new Date(d).toLocaleDateString("ko-KR");
  };

  const formatTime = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleTimeString(i18n.language?.startsWith("en") ? "en-US" : "ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  const exportExcel = () => {
    const header = [t("admin.dateColumn"), t("admin.nameColumn"), t("admin.courseLabel"), t("admin.statusLabel"), t("admin.checkInTime"), t("admin.notes")];
    const rows = filtered.map((a: any) => [
      formatDate(a.attendance_date), profileMap.get(a.user_id) || "-", courseMap.get(a.course_id) || "-",
      a.status || "-", formatTime(a.check_in_time), a.notes || "",
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "attendance_report.csv"; a.click();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              {t("admin.attendanceManagement")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.attendanceManagementDesc")}</p>
          </div>
          <Button onClick={exportExcel} variant="outline" className="rounded-xl gap-2 text-sm self-start sm:self-auto">
            <Download className="h-4 w-4" aria-hidden="true" /> {t("admin.excelDownload")}
          </Button>
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

          <div className="overflow-x-auto -mx-3 sm:-mx-5">
            <div className="min-w-[420px] px-3 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.dateColumn")}</TableHead>
                    <TableHead>{t("admin.nameColumn")}</TableHead>
                    <TableHead>{t("admin.courseLabel")}</TableHead>
                    <TableHead>{t("admin.statusLabel")}</TableHead>
                    <TableHead>{t("admin.checkInTime")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("admin.noAttendanceData")}</TableCell></TableRow>
                  ) : (
                    filtered.slice(0, 50).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{formatDate(a.attendance_date)}</TableCell>
                        <TableCell className="font-medium text-sm">{profileMap.get(a.user_id) || "-"}</TableCell>
                        <TableCell className="text-sm">{courseMap.get(a.course_id) || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor[a.status] as any || "outline"} className="text-[10px]">
                            {t(`admin.${a.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(a.check_in_time)}</TableCell>
                      </TableRow>
                    ))
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

export default AdminAttendance;
