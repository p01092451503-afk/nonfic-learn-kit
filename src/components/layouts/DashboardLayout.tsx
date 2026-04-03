import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ClipboardList, Trophy, Users, Settings,
  LogOut, Menu, X, Bell, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const studentNav: NavItem[] = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "내 강좌", href: "/dashboard/courses", icon: BookOpen },
  { label: "과제", href: "/dashboard/assignments", icon: ClipboardList },
  { label: "성취", href: "/dashboard/achievements", icon: Trophy },
];

const teacherNav: NavItem[] = [
  { label: "대시보드", href: "/teacher", icon: LayoutDashboard },
  { label: "강좌 관리", href: "/teacher/courses", icon: BookOpen },
  { label: "과제 관리", href: "/teacher/assignments", icon: ClipboardList },
  { label: "수강생 관리", href: "/teacher/students", icon: Users },
];

const adminNav: NavItem[] = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "사용자 관리", href: "/admin/users", icon: Users },
  { label: "강좌 관리", href: "/admin/courses", icon: BookOpen },
  { label: "설정", href: "/admin/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: "student" | "teacher" | "admin";
}

const DashboardLayout = ({ children, role = "student" }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useUser();
  const { primaryRole } = useUserRole();

  const activeRole = role || primaryRole;
  const navItems = activeRole === "admin" ? adminNav : activeRole === "teacher" ? teacherNav : studentNav;
  const roleLabel = activeRole === "admin" ? "Admin" : activeRole === "teacher" ? "Teacher" : "Student";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = profile?.full_name
    ? profile.full_name.slice(0, 2)
    : "NF";

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 flex flex-col items-start">
          <h1 className="font-display text-[1.7rem] tracking-wider text-sidebar-primary">NONFICTION</h1>
          <span className="mt-1.5 inline-block text-[11px] tracking-[0.1em] font-medium text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full">
            {roleLabel}
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}>
                <item.icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button onClick={handleSignOut} className="nav-item w-full text-muted-foreground hover:text-destructive">
            <LogOut className="h-[18px] w-[18px]" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
          </Button>
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">{profile?.full_name || "사용자"}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
