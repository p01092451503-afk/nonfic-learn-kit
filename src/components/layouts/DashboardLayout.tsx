import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ClipboardList, Trophy, Users, Settings,
  LogOut, Menu, X, ChevronRight, GraduationCap, CalendarCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
import LanguageToggle from "@/components/LanguageToggle";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: "student" | "teacher" | "admin";
  contentClassName?: string;
}

const DashboardLayout = ({ children, role = "student", contentClassName }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useUser();
  const { primaryRole } = useUserRole();
  const { t } = useTranslation();

  const activeRole = role || primaryRole;

  const studentNav: NavItem[] = [
    { label: t("nav.dashboard"), href: "/student", icon: LayoutDashboard },
    { label: t("nav.myCourses"), href: "/dashboard/courses", icon: BookOpen },
    { label: t("nav.assignments"), href: "/dashboard/assignments", icon: ClipboardList },
    { label: t("nav.achievements"), href: "/dashboard/achievements", icon: Trophy },
  ];

  const teacherNav: NavItem[] = [
    { label: t("nav.dashboard"), href: "/teacher", icon: LayoutDashboard },
    { label: t("nav.courseManagement"), href: "/teacher/courses", icon: BookOpen },
    { label: t("nav.assignmentManagement"), href: "/teacher/assignments", icon: ClipboardList },
    { label: t("nav.studentManagement"), href: "/teacher/students", icon: Users },
  ];

  const adminNav: NavItem[] = [
    { label: t("nav.dashboard"), href: "/admin", icon: LayoutDashboard },
    { label: t("nav.userManagement"), href: "/admin/users", icon: Users },
    { label: t("nav.courseManagement"), href: "/admin/courses", icon: BookOpen },
    { label: t("nav.learningManagement"), href: "/admin/learning", icon: GraduationCap },
    { label: t("nav.attendanceManagement"), href: "/admin/attendance", icon: CalendarCheck },
    { label: t("nav.completionManagement"), href: "/admin/completion", icon: Trophy },
    { label: t("nav.settings"), href: "/admin/settings", icon: Settings },
  ];

  const navItems = activeRole === "admin" ? adminNav : activeRole === "teacher" ? teacherNav : studentNav;
  const roleLabel = t(`roles.${activeRole}`);

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
            <span>{t("auth.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <LanguageToggle />
          <NotificationBell />
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">{profile?.full_name || t("common.user")}</p>
            </div>
          </div>
        </header>
        <main className={contentClassName || "flex-1 p-6 lg:p-8"}>{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
