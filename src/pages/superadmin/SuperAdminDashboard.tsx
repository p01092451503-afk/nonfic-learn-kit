import { useState } from "react";
import {
  LayoutDashboard, Building2, Activity, Plus, MoreHorizontal, TrendingUp,
  HardDrive, Globe, Users, ArrowRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";

const SuperAdminDashboard = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language?.startsWith("en") ? enUS : ko;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formPlan, setFormPlan] = useState("basic");
  const [formTrafficLimit, setFormTrafficLimit] = useState("100");
  const [formStorageLimit, setFormStorageLimit] = useState("50");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: tenants = [] } = useQuery({
    queryKey: ["superadmin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get traffic stats per tenant for current month
  const { data: trafficStats = [] } = useQuery({
    queryKey: ["superadmin-traffic-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("traffic_logs")
        .select("tenant_id, estimated_bytes, event_type")
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Aggregate traffic per tenant
  const tenantTrafficMap = new Map<string, { bytes: number; pageViews: number; contentAccess: number }>();
  trafficStats.forEach((log: any) => {
    const tid = log.tenant_id || "unassigned";
    const existing = tenantTrafficMap.get(tid) || { bytes: 0, pageViews: 0, contentAccess: 0 };
    existing.bytes += Number(log.estimated_bytes) || 0;
    if (log.event_type === "page_view") existing.pageViews++;
    if (log.event_type === "content_access") existing.contentAccess++;
    tenantTrafficMap.set(tid, existing);
  });

  const totalTrafficGB = Array.from(tenantTrafficMap.values()).reduce((s, v) => s + v.bytes, 0) / (1024 ** 3);
  const totalPageViews = Array.from(tenantTrafficMap.values()).reduce((s, v) => s + v.pageViews, 0);
  const activeTenants = tenants.filter((t: any) => t.is_active).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        domain: formDomain || null,
        plan: formPlan,
        monthly_traffic_limit_gb: parseFloat(formTrafficLimit) || 100,
        monthly_storage_limit_gb: parseFloat(formStorageLimit) || 50,
        contact_email: formContactEmail || null,
        contact_name: formContactName || null,
        notes: formNotes || null,
      };
      if (editingTenant) {
        const { error } = await supabase.from("tenants").update(payload).eq("id", editingTenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      toast({ title: editingTenant ? t("superadmin.tenantUpdated", "고객사 정보가 수정되었습니다") : t("superadmin.tenantCreated", "고객사가 등록되었습니다") });
      resetForm();
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setFormName(""); setFormDomain(""); setFormPlan("basic");
    setFormTrafficLimit("100"); setFormStorageLimit("50");
    setFormContactEmail(""); setFormContactName(""); setFormNotes("");
    setEditingTenant(null);
  };

  const openEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setFormName(tenant.name);
    setFormDomain(tenant.domain || "");
    setFormPlan(tenant.plan || "basic");
    setFormTrafficLimit(String(tenant.monthly_traffic_limit_gb || 100));
    setFormStorageLimit(String(tenant.monthly_storage_limit_gb || 50));
    setFormContactEmail(tenant.contact_email || "");
    setFormContactName(tenant.contact_name || "");
    setFormNotes(tenant.notes || "");
    setDialogOpen(true);
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const stats = [
    { label: t("superadmin.totalTenants", "전체 고객사"), value: tenants.length, sub: t("superadmin.registeredTenants", "등록된 고객사"), icon: Building2 },
    { label: t("superadmin.activeTenants", "활성 고객사"), value: activeTenants, sub: t("superadmin.currentlyActive", "현재 운영 중"), icon: Globe },
    { label: t("superadmin.monthlyTraffic", "이번 달 트래픽"), value: `${totalTrafficGB.toFixed(2)} GB`, sub: t("superadmin.totalTransfer", "총 전송량"), icon: TrendingUp },
    { label: t("superadmin.totalPageViews", "총 페이지뷰"), value: totalPageViews.toLocaleString(), sub: t("superadmin.thisMonth", "이번 달"), icon: Activity },
  ];

  return (
    <DashboardLayout role="superadmin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" /> {t("superadmin.title", "SaaS 관리 대시보드")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("superadmin.subtitle", "고객사별 리소스 사용량을 실시간으로 모니터링합니다")}</p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("superadmin.addTenant", "고객사 등록")}
          </Button>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-primary mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </section>

        {/* Tenant List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{t("superadmin.tenantList", "고객사 목록")}</h2>
            <p className="text-xs text-muted-foreground">{t("superadmin.tenantListDesc", "등록된 고객사와 리소스 사용 현황")}</p>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("superadmin.noTenants", "등록된 고객사가 없습니다")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">{t("superadmin.tenantName", "고객사명")}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{t("superadmin.plan", "요금제")}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">{t("superadmin.trafficUsage", "트래픽 사용량")}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">{t("superadmin.pageViews", "페이지뷰")}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">{t("superadmin.contentAccess", "콘텐츠 접근")}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{t("admin.statusLabel", "상태")}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tenants.map((tenant: any) => {
                    const traffic = tenantTrafficMap.get(tenant.id) || { bytes: 0, pageViews: 0, contentAccess: 0 };
                    const trafficGB = traffic.bytes / (1024 ** 3);
                    const limitGB = tenant.monthly_traffic_limit_gb || 100;
                    const usagePercent = Math.min(100, (trafficGB / limitGB) * 100);
                    const isOverLimit = usagePercent >= 90;

                    return (
                      <tr key={tenant.id} className="hover:bg-accent/20 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                          <p className="text-[11px] text-muted-foreground">{tenant.domain || "-"} · {tenant.contact_name || "-"}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant="secondary" className="text-[10px]">{tenant.plan}</Badge>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}>
                                {formatBytes(traffic.bytes)}
                              </span>
                              <span className="text-muted-foreground">/ {limitGB} GB</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isOverLimit ? "bg-destructive" : "bg-primary"}`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">{traffic.pageViews.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">{traffic.contentAccess.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant="secondary" className={`text-[10px] ${tenant.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-secondary text-muted-foreground"}`}>
                            {tenant.is_active ? t("superadmin.active", "운영중") : t("superadmin.inactive", "비활성")}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem className="text-xs" onClick={() => openEdit(tenant)}>
                                {t("common.edit")}
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
          )}
        </div>

        {/* Unassigned traffic */}
        {tenantTrafficMap.has("unassigned") && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t("superadmin.unassignedTraffic", "미배정 트래픽")}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("superadmin.unassignedDesc", "고객사에 배정되지 않은 트래픽")}: {formatBytes(tenantTrafficMap.get("unassigned")!.bytes)}
              ({tenantTrafficMap.get("unassigned")!.pageViews} {t("superadmin.pageViews", "페이지뷰")})
            </p>
          </div>
        )}
      </div>

      {/* Tenant Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTenant ? t("superadmin.editTenant", "고객사 수정") : t("superadmin.addTenant", "고객사 등록")}</DialogTitle>
            <DialogDescription>{t("superadmin.tenantDialogDesc", "고객사 정보와 리소스 제한을 설정합니다")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("superadmin.tenantName", "고객사명")} *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: ABC 기업" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("superadmin.domain", "도메인")}</Label>
                <Input value={formDomain} onChange={(e) => setFormDomain(e.target.value)} placeholder="abc.example.com" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("superadmin.plan", "요금제")}</Label>
                <Input value={formPlan} onChange={(e) => setFormPlan(e.target.value)} placeholder="basic / pro / enterprise" className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("superadmin.trafficLimitGB", "월 트래픽 한도 (GB)")}</Label>
                <Input type="number" value={formTrafficLimit} onChange={(e) => setFormTrafficLimit(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("superadmin.storageLimitGB", "월 저장공간 한도 (GB)")}</Label>
                <Input type="number" value={formStorageLimit} onChange={(e) => setFormStorageLimit(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("superadmin.contactName", "담당자명")}</Label>
                <Input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("superadmin.contactEmail", "담당자 이메일")}</Label>
                <Input type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("superadmin.notes", "메모")}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="rounded-xl resize-none min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>{t("common.cancel")}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? t("common.processing") : editingTenant ? t("common.save") : t("superadmin.register", "등록")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
