import { Users, Search, Filter, Shield, UserPlus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const users = [
  { name: "김서연", email: "seryeon@nonfiction.com", department: "마케팅팀", role: "student", status: "active", joinedAt: "2026-01-15" },
  { name: "박준혁", email: "junhyuk@nonfiction.com", department: "디자인팀", role: "student", status: "active", joinedAt: "2026-02-01" },
  { name: "이민지", email: "minji@nonfiction.com", department: "제품개발팀", role: "teacher", status: "active", joinedAt: "2025-11-10" },
  { name: "정우진", email: "woojin@nonfiction.com", department: "영업팀", role: "student", status: "active", joinedAt: "2026-03-05" },
  { name: "최예린", email: "yerin@nonfiction.com", department: "마케팅팀", role: "student", status: "inactive", joinedAt: "2025-12-20" },
  { name: "한도윤", email: "doyoon@nonfiction.com", department: "디자인팀", role: "teacher", status: "active", joinedAt: "2025-10-01" },
  { name: "송하늘", email: "haneul@nonfiction.com", department: "제품개발팀", role: "student", status: "active", joinedAt: "2026-03-20" },
  { name: "관리자", email: "admin@nonfiction.com", department: "경영지원팀", role: "admin", status: "active", joinedAt: "2025-09-01" },
];

const roleLabel: Record<string, { text: string; className: string }> = {
  admin: { text: "관리자", className: "text-destructive bg-destructive/10" },
  teacher: { text: "강사", className: "text-info bg-info/10" },
  student: { text: "학습자", className: "text-foreground bg-secondary" },
};

const AdminUsers = () => {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-5xl">
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
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">전체 사용자</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.status === "active").length}</p>
            <p className="text-xs text-muted-foreground mt-1">활성 사용자</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.role === "teacher").length}</p>
            <p className="text-xs text-muted-foreground mt-1">강사</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="이름 또는 이메일 검색" className="pl-9 h-10 rounded-xl border-border" />
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
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">상태</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const role = roleLabel[user.role];
                return (
                  <tr key={user.email} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                          {user.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{user.department}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${role.className}`}>
                        {role.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs ${user.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                        {user.status === "active" ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
