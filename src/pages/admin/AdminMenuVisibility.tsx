import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ListChecks, Save } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSidebarMenuVisibility, type MenuRole } from "@/hooks/useSidebarMenuVisibility";

interface MenuDef { label: string; href: string; group?: string; }

const STUDENT_MENUS: MenuDef[] = [
  { label: "대시보드", href: "/student" },
  { label: "강의 카탈로그", href: "/catalog" },
  { label: "내 강의", href: "/dashboard/courses" },
  { label: "과제", href: "/dashboard/assignments" },
  { label: "성과", href: "/dashboard/achievements" },
  { label: "공지사항", href: "/student/announcements" },
  { label: "게시판", href: "/student/board" },
  { label: "마이페이지", href: "/mypage" },
];

const TEACHER_MENUS: MenuDef[] = [
  { label: "대시보드", href: "/teacher" },
  { label: "강의 관리", href: "/teacher/courses" },
  { label: "과제 관리", href: "/teacher/assignments" },
  { label: "학생 관리", href: "/teacher/students" },
  { label: "알림 관리", href: "/teacher/notifications" },
  { label: "공지사항 관리", href: "/teacher/announcements" },
  { label: "게시판 관리", href: "/teacher/board" },
  { label: "출결 관리", href: "/teacher/attendance" },
];

const ADMIN_MENUS: MenuDef[] = [
  { group: "인사이트", label: "대시보드", href: "/admin" },
  { group: "인사이트", label: "통계 현황", href: "/admin/traffic" },
  { group: "회원·조직", label: "회원 관리", href: "/admin/users" },
  { group: "회원·조직", label: "조직 관리", href: "/admin/branches" },
  { group: "콘텐츠", label: "강의 관리", href: "/admin/courses" },
  { group: "콘텐츠", label: "동영상 관리", href: "/admin/videos" },
  { group: "콘텐츠", label: "다국어 관리", href: "/admin/i18n" },
  { group: "학습 운영", label: "수강 관리", href: "/admin/enrollments" },
  { group: "학습 운영", label: "학습 관리", href: "/admin/learning" },
  { group: "학습 운영", label: "출결 관리", href: "/admin/attendance" },
  { group: "학습 운영", label: "수료 관리", href: "/admin/completion" },
  { group: "학습 운영", label: "설문 관리", href: "/admin/surveys" },
  { group: "커뮤니케이션", label: "알림 관리", href: "/admin/notifications" },
  { group: "커뮤니케이션", label: "공지사항 관리", href: "/admin/announcements" },
  { group: "커뮤니케이션", label: "게시판 관리", href: "/admin/board" },
  { group: "시스템", label: "설정", href: "/admin/settings" },
  { group: "시스템", label: "메뉴 노출 관리", href: "/admin/menu-visibility" },
  { group: "시스템", label: "시스템 정보", href: "/admin/system-info" },
];

const ROLE_MENUS: Record<MenuRole, MenuDef[]> = {
  student: STUDENT_MENUS,
  teacher: TEACHER_MENUS,
  admin: ADMIN_MENUS,
};

const ROLE_LABEL: Record<MenuRole, string> = {
  student: "학습자",
  teacher: "강사",
  admin: "관리자",
};

const AdminMenuVisibility = () => {
  const { rows, isLoading } = useSidebarMenuVisibility();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Initialize draft from rows
  useEffect(() => {
    if (isLoading) return;
    const init: Record<string, boolean> = {};
    (Object.keys(ROLE_MENUS) as MenuRole[]).forEach((role) => {
      ROLE_MENUS[role].forEach((m) => {
        const key = `${role}::${m.href}`;
        const existing = rows.find((r) => r.role === role && r.menu_key === m.href);
        init[key] = existing?.hidden ?? false;
      });
    });
    setDraft(init);
  }, [rows, isLoading]);

  const toggle = (role: MenuRole, href: string) => {
    const key = `${role}::${href}`;
    setDraft((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const upserts = Object.entries(draft).map(([key, hidden]) => {
        const [role, href] = key.split("::");
        return { role, menu_key: href, hidden, updated_at: new Date().toISOString() };
      });
      const { error } = await (supabase as any)
        .from("sidebar_menu_visibility")
        .upsert(upserts, { onConflict: "role,menu_key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["sidebar-menu-visibility"] });
      toast({ title: "저장되었습니다" });
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderRole = (role: MenuRole) => {
    const menus = ROLE_MENUS[role];
    const groups = useMemo(() => {
      const map: Record<string, MenuDef[]> = {};
      menus.forEach((m) => {
        const g = m.group || "메뉴";
        if (!map[g]) map[g] = [];
        map[g].push(m);
      });
      return map;
    }, [menus]);

    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([groupName, items]) => (
          <Card key={groupName}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y divide-border/80">
                {items.map((m) => {
                  const key = `${role}::${m.href}`;
                  const hidden = !!draft[key];
                  return (
                    <li key={m.href} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.href}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${hidden ? "text-muted-foreground" : "text-foreground"}`}>
                          {hidden ? "숨김" : "노출"}
                        </span>
                        <Switch checked={!hidden} onCheckedChange={() => toggle(role, m.href)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              메뉴 노출 관리
            </h1>
            <p className="text-muted-foreground mt-1">역할별 사이드바 메뉴의 노출 여부를 설정합니다.</p>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>

        <Tabs defaultValue="student" className="w-full">
          <TabsList>
            <TabsTrigger value="student">{ROLE_LABEL.student}</TabsTrigger>
            <TabsTrigger value="teacher">{ROLE_LABEL.teacher}</TabsTrigger>
            <TabsTrigger value="admin">{ROLE_LABEL.admin}</TabsTrigger>
          </TabsList>
          <TabsContent value="student" className="mt-4">{renderRole("student")}</TabsContent>
          <TabsContent value="teacher" className="mt-4">{renderRole("teacher")}</TabsContent>
          <TabsContent value="admin" className="mt-4">{renderRole("admin")}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminMenuVisibility;