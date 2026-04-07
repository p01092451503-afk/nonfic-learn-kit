import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Building2, Plus, Upload, Download, Pencil, Trash2, Users, Search, MoreVertical } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminBranches = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branchDialog, setBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchForm, setBranchForm] = useState({ name: "", name_en: "", code: "", parent_department_id: "__none__" });
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [staffSearch, setStaffSearch] = useState("");
  const [uploadBranch, setUploadBranch] = useState<string>("__csv__");
  const [editStaffDialog, setEditStaffDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({ department_id: "__none__", position: "", role: "student" });

  // Fetch branches (departments)
  const { data: branches = [] } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch staff (profiles with department_id)
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-branch-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, department_id, position, employee_id, phone_number, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["admin-branch-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data;
    },
  });

  // Branch CRUD
  const saveBranchMutation = useMutation({
    mutationFn: async (form: typeof branchForm) => {
      const payload: any = {
        name: form.name,
        name_en: form.name_en || null,
        code: form.code || null,
        parent_department_id: form.parent_department_id === "__none__" ? null : form.parent_department_id || null,
      };
      if (editingBranch) {
        const { error } = await supabase.from("departments").update(payload).eq("id", editingBranch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: editingBranch ? t("admin.deptUpdated") : t("admin.deptCreated") });
      setBranchDialog(false);
      setEditingBranch(null);
      setBranchForm({ name: "", name_en: "", code: "", parent_department_id: "__none__" });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      toast({ title: t("admin.deptDeleted") });
    },
  });

  // CSV Upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast({ title: t("common.error"), description: "CSV 파일에 데이터가 없습니다.", variant: "destructive" });
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("이름"));
    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("이메일"));
    const posIdx = headers.findIndex(h => h.includes("position") || h.includes("직급"));
    const branchIdx = headers.findIndex(h => h.includes("branch") || h.includes("지점"));

    if (emailIdx === -1 || nameIdx === -1) {
      toast({ title: t("common.error"), description: "CSV에 이름(name)과 이메일(email) 열이 필요합니다.", variant: "destructive" });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim());
      const name = cols[nameIdx];
      const email = cols[emailIdx];
      if (!name || !email) continue;

      // Determine branch: use column value or selected upload branch
      let deptId = uploadBranch === "__csv__" ? null : uploadBranch || null;
      if (branchIdx !== -1 && cols[branchIdx]) {
        const branchName = cols[branchIdx];
        const found = branches.find((b: any) => b.name === branchName || b.name_en === branchName || b.code === branchName);
        if (found) deptId = found.id;
      }

      const tempPassword = `Nf${Math.random().toString(36).slice(2, 10)}!`;
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: {
            data: {
              name,
              department_id: deptId,
            },
          },
        });
        if (authErr) throw authErr;

        // Update position if provided
        if (posIdx !== -1 && cols[posIdx] && authData.user) {
          await supabase.from("profiles").update({ position: cols[posIdx] }).eq("user_id", authData.user.id);
        }
        successCount++;
      } catch {
        errorCount++;
      }
    }

    toast({
      title: t("branches.uploadComplete"),
      description: `${successCount}${t("branches.uploadSuccess")} / ${errorCount}${t("branches.uploadFailed")}`,
    });
    queryClient.invalidateQueries({ queryKey: ["admin-branch-profiles"] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // CSV Template download
  const downloadTemplate = () => {
    const csv = "이름,이메일,직급,지점\n홍길동,hong@example.com,사원,서울본사\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_template.csv";
    a.click();
  };

  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: "", name_en: "", code: "", parent_department_id: "" });
    setBranchDialog(true);
  };

  const openEditBranch = (b: any) => {
    setEditingBranch(b);
    setBranchForm({ name: b.name, name_en: b.name_en || "", code: b.code || "", parent_department_id: b.parent_department_id || "__none__" });
    setBranchDialog(true);
  };

  // Filter staff
  const filteredProfiles = allProfiles.filter((p: any) => {
    if (selectedBranch !== "all" && p.department_id !== selectedBranch) return false;
    if (staffSearch && !p.full_name?.toLowerCase().includes(staffSearch.toLowerCase())) return false;
    return true;
  });

  const getRoleBadge = (userId: string) => {
    const role = userRoles.find((r: any) => r.user_id === userId);
    if (!role) return null;
    const variants: Record<string, string> = { admin: "destructive", teacher: "secondary", student: "outline" };
    return <Badge variant={variants[role.role] as any || "outline"}>{t(`roles.${role.role}Label`)}</Badge>;
  };

  const getBranchName = (deptId: string | null) => {
    if (!deptId) return "-";
    const d = branches.find((b: any) => b.id === deptId);
    return d ? (i18n.language?.startsWith("en") ? d.name_en || d.name : d.name) : "-";
  };

  const branchStaffCount = (branchId: string) => allProfiles.filter((p: any) => p.department_id === branchId).length;

  const openEditStaff = (p: any) => {
    setEditingStaff(p);
    const role = userRoles.find((r: any) => r.user_id === p.user_id);
    setStaffForm({
      department_id: p.department_id || "__none__",
      position: p.position || "",
      role: role?.role || "student",
    });
    setEditStaffDialog(true);
  };

  const updateStaffMutation = useMutation({
    mutationFn: async () => {
      if (!editingStaff) return;
      const deptId = staffForm.department_id === "__none__" ? null : staffForm.department_id;
      const { error: pErr } = await supabase.from("profiles").update({ department_id: deptId, position: staffForm.position || null }).eq("user_id", editingStaff.user_id);
      if (pErr) throw pErr;
      const { error: rErr } = await supabase.from("user_roles").upsert({ user_id: editingStaff.user_id, role: staffForm.role as any });
      if (rErr) throw rErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-branch-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-branch-roles"] });
      toast({ title: t("admin.staffUpdated") });
      setEditStaffDialog(false);
      setEditingStaff(null);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
              {t("branches.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("branches.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="branches">
          <TabsList>
            <TabsTrigger value="branches">{t("branches.branchList")}</TabsTrigger>
            <TabsTrigger value="staff">{t("branches.staffManagement")}</TabsTrigger>
            <TabsTrigger value="upload">{t("branches.bulkUpload")}</TabsTrigger>
          </TabsList>

          {/* Branch List Tab */}
          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddBranch} size="sm">
                <Plus className="h-4 w-4 mr-1" /> {t("branches.addBranch")}
              </Button>
            </div>
            <div className="stat-card !p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("branches.branchName")}</TableHead>
                    <TableHead>{t("branches.branchNameEn")}</TableHead>
                    <TableHead>{t("admin.deptCode")}</TableHead>
                    <TableHead>{t("branches.parentBranch")}</TableHead>
                    <TableHead className="text-center">{t("branches.staffCount")}</TableHead>
                    <TableHead className="text-right">{t("common.manage")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.noDepartments")}</TableCell></TableRow>
                  ) : branches.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.name_en || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{b.code || "-"}</TableCell>
                      <TableCell>{getBranchName(b.parent_department_id)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{branchStaffCount(b.id)}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditBranch(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteBranchMutation.mutate(b.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder={t("branches.allBranches")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("branches.allBranches")}</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("admin.searchUser")} value={staffSearch} onChange={e => setStaffSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="stat-card !p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>{t("admin.nameColumn")}</TableHead>
                     <TableHead>{t("branches.branch")}</TableHead>
                     <TableHead>{t("admin.positionColumn")}</TableHead>
                     <TableHead>{t("admin.roleColumn")}</TableHead>
                     <TableHead className="text-right">{t("common.manage")}</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredProfiles.length === 0 ? (
                     <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("admin.noUsers")}</TableCell></TableRow>
                   ) : filteredProfiles.map((p: any) => (
                     <TableRow key={p.user_id}>
                       <TableCell className="font-medium">{p.full_name || "-"}</TableCell>
                       <TableCell>{getBranchName(p.department_id)}</TableCell>
                       <TableCell className="text-muted-foreground">{p.position || "-"}</TableCell>
                       <TableCell>{getRoleBadge(p.user_id)}</TableCell>
                       <TableCell className="text-right">
                         <Button variant="ghost" size="sm" onClick={() => openEditStaff(p)}>
                           <Pencil className="h-3.5 w-3.5" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="stat-card space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t("branches.bulkUploadTitle")}</h3>
                <p className="text-xs text-muted-foreground">{t("branches.bulkUploadDesc")}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <Select value={uploadBranch} onValueChange={setUploadBranch}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder={t("branches.selectUploadBranch")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__csv__">{t("branches.useCSVColumn")}</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> {t("branches.downloadTemplate")}
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> {t("branches.uploadCSV")}
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{t("branches.csvFormat")}</p>
                <p>이름, 이메일, 직급, 지점</p>
                <p>홍길동, hong@example.com, 사원, 서울본사</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Branch Add/Edit Dialog */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? t("branches.editBranch") : t("branches.addBranch")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.deptName")}</label>
              <Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.deptNameEn")}</label>
              <Input value={branchForm.name_en} onChange={e => setBranchForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.deptCode")}</label>
              <Input value={branchForm.code} onChange={e => setBranchForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("branches.parentBranch")}</label>
              <Select value={branchForm.parent_department_id} onValueChange={v => setBranchForm(f => ({ ...f, parent_department_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("admin.noParent")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("admin.noParent")}</SelectItem>
                  {branches.filter((b: any) => b.id !== editingBranch?.id).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => saveBranchMutation.mutate(branchForm)} disabled={!branchForm.name}>
              {editingBranch ? t("common.save") : t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminBranches;
