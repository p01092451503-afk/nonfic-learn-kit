import { Users, Search, Filter, UserPlus, MoreVertical, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);
  const [positionEdit, setPositionEdit] = useState<{ userId: string; name: string; position: string } | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "student", departmentId: "" });
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isEn = i18n.language?.startsWith("en");

  const roleLabel: Record<string, { text: string; className: string }> = {
    admin: { text: t("roles.adminLabel"), className: "text-destructive bg-destructive/10" },
    teacher: { text: t("roles.teacherLabel"), className: "text-primary bg-primary/10" },
    student: { text: t("roles.studentLabel"), className: "text-foreground bg-secondary" },
  };

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("is_active", true).order("display_order");
      return data || [];
    },
  });

  const roleMap = new Map<string, string>();
  roles.forEach((r: any) => roleMap.set(r.user_id, r.role));

  const filtered = profiles.filter((u: any) => {
    const q = search.toLowerCase();
    const matchesSearch = (u.full_name || "").toLowerCase().includes(q) || (u.department || "").toLowerCase().includes(q);
    const matchesDept = deptFilter === "all" || u.department_id === deptFilter;
    return matchesSearch && matchesDept;
  });

  const teacherCount = roles.filter((r: any) => r.role === "teacher").length;

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { full_name: newUser.name } },
      });
      if (error) throw error;

      if (data.user) {
        // Update profile with department
        if (newUser.departmentId) {
          await supabase.from("profiles").update({ department_id: newUser.departmentId }).eq("user_id", data.user.id);
        }
        // Set role
        await supabase.from("user_roles").upsert({ user_id: data.user.id, role: newUser.role as any });
      }
      return data;
    },
    onSuccess: () => {
      toast.success(t("admin.userCreated"), { description: t("admin.userCreatedDesc", { name: newUser.name }) });
      setAddOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "student", departmentId: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.roleChanged"));
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
  });

  // Change department mutation
  const changeDeptMutation = useMutation({
    mutationFn: async ({ userId, deptId }: { userId: string; deptId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ department_id: deptId }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.deptChanged"));
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });

  // Change position mutation
  const changePositionMutation = useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: string }) => {
      const { error } = await supabase.from("profiles").update({ position: position || null }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.positionChanged"));
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setPositionEdit(null);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success(t("admin.userDeleted"));
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return "-";
    const dept = departments.find((d: any) => d.id === deptId);
    if (!dept) return "-";
    return isEn ? (dept as any).name_en || (dept as any).name : (dept as any).name;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2"><Users className="h-6 w-6" aria-hidden="true" />{t("admin.userManagement")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("admin.userManagementDesc")}</p>
          </div>
          <Button className="rounded-xl gap-2 w-full sm:w-auto" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> {t("admin.addUser")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center !p-3 sm:!p-6">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t("admin.totalUsersCount")}</p>
          </div>
          <div className="stat-card text-center !p-3 sm:!p-6">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t("admin.activeUsers")}</p>
          </div>
          <div className="stat-card text-center !p-3 sm:!p-6">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{teacherCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t("admin.teacherCount")}</p>
          </div>
        </div>

        {/* Search + Dept Filter */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("admin.searchUser")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-28 sm:w-40 rounded-xl">
              <SelectValue placeholder={t("admin.allDepts")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allDepts")}</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{isEn ? d.name_en || d.name : d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User Table */}
        <div className="stat-card !p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("admin.nameColumn")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">{t("admin.departmentColumn")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("admin.roleColumn")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">{t("admin.positionColumn")}</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((profile: any) => {
                const role = roleLabel[roleMap.get(profile.user_id) || "student"] || roleLabel.student;
                const currentRole = roleMap.get(profile.user_id) || "student";
                return (
                  <tr key={profile.user_id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                          {(profile.full_name || "?").slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile.full_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{profile.employee_id || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{getDeptName(profile.department_id)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${role.className}`}>{role.text}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{profile.position || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {["admin", "teacher", "student"].map(r => (
                            <DropdownMenuItem key={r} disabled={r === currentRole} onClick={() => r !== currentRole && changeRoleMutation.mutate({ userId: profile.user_id, role: r })}>
                              {t("admin.roleColumn")}: {roleLabel[r].text} {r === currentRole ? "✓" : ""}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem className="text-xs text-muted-foreground" disabled>—</DropdownMenuItem>
                          {departments.map((d: any) => (
                            <DropdownMenuItem key={d.id} onClick={() => changeDeptMutation.mutate({ userId: profile.user_id, deptId: d.id })}>
                              {t("admin.departmentColumn")}: {isEn ? d.name_en || d.name : d.name}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setPositionEdit({ userId: profile.user_id, name: profile.full_name || "-", position: profile.position || "" })}>
                            {t("admin.editPosition")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {t("admin.deleteUser")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{t("admin.noUsers")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.addUser")}</DialogTitle>
            <DialogDescription>{t("admin.userManagementDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("auth.name")}</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder={t("auth.namePlaceholder")} className="mt-1" />
            </div>
            <div>
              <Label>{t("auth.email")}</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@nonfiction.co.kr" className="mt-1" />
            </div>
            <div>
              <Label>{t("admin.tempPassword")}</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" className="mt-1" />
            </div>
            <div>
              <Label>{t("admin.selectDept")}</Label>
              <Select value={newUser.departmentId} onValueChange={(v) => setNewUser({ ...newUser, departmentId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t("admin.selectDept")} /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{isEn ? d.name_en || d.name : d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.selectRole")}</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t("roles.studentLabel")}</SelectItem>
                  <SelectItem value="teacher">{t("roles.teacherLabel")}</SelectItem>
                  <SelectItem value="admin">{t("roles.adminLabel")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full rounded-xl" onClick={() => createUserMutation.mutate()} disabled={!newUser.name || !newUser.email || !newUser.password || createUserMutation.isPending}>
              {createUserMutation.isPending ? t("common.processing") : t("admin.addUser")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteUser")}: {deleteTarget?.name}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.deleteUserConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.userId)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? t("common.processing") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminUsers;
