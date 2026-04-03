import { Users, Search, Filter, UserPlus, MoreVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

const roleLabel: Record<string, { text: string; className: string }> = {
  admin: { text: "관리자", className: "text-destructive bg-destructive/10" },
  teacher: { text: "강사", className: "text-info bg-info/10" },
  student: { text: "학습자", className: "text-foreground bg-secondary" },
};

const AdminUsers = () => {
  const [search, setSearch] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const roleMap = new Map<string, string>();
  roles.forEach((r: any) => { roleMap.set(r.user_id, r.role); });

  const filtered = profiles.filter((u: any) => {
    const q = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) || (u.department || "").toLowerCase().includes(q);
  });

  const teacherCount = roles.filter((r: any) => r.role === "teacher").length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">사용자 관리</h1>
            <p className="text-muted-foreground mt-1">사용자를 관리하고 역할을 설정하세요.</p>
          </div>
          <Button className="rounded-xl gap-2">
            <UserPlus className="h-4 w-4" /> 사용자 추가
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">전체 사용자</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">활성 사용자</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{teacherCount}</p>
            <p className="text-xs text-muted-foreground mt-1">강사</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="이름 또는 부서 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-border" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Filter className="h-3.5 w-3.5" /> 필터
          </Button>
        </div>

        <div className="stat-card !p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">이름</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">부서</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">역할</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">직급</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((profile: any) => {
                const role = roleLabel[roleMap.get(profile.user_id) || "student"] || roleLabel.student;
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
                      <span className="text-sm text-muted-foreground">{profile.department || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${role.className}`}>
                        {role.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{profile.position || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">사용자가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
