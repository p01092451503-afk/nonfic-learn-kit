import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ClipboardList, Trophy, Users, Settings, Compass, UserCircle, ClipboardCheck,
  LogOut, Menu, X, ChevronRight, GraduationCap, CalendarCheck, Activity, Building2, Bell, Megaphone, FileText, BarChart3, Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";
import RoleSwitcher from "@/components/RoleSwitcher";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  showNew?: boolean;
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
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const [hasNewBoardPost, setHasNewBoardPost] = useState(false);
  const { profile, signOut } = useUser();
  const { primaryRole } = useUserRole();
  const { t } = useTranslation();

  const activeRole = role || primaryRole;

  // Check for new announcements & board posts (published within last 24 hours)
  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const checkNew = async () => {
      const { count } = await supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .gte("created_at", since);
      setHasNewAnnouncement((count ?? 0) > 0);
    };
    const checkNewBoard = async () => {
      const { count } = await supabase
        .from("board_posts")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .gte("created_at", since);
      setHasNewBoardPost((count ?? 0) > 0);
    };
    checkNew();
    checkNewBoard();
  }, []);

  // Preload user avatar for instant rendering
  useEffect(() => {
    if (profile?.avatar_url) {
      const img = new Image();
      img.src = profile.avatar_url;
    }
  }, [profile?.avatar_url]);

  const studentNav: NavItem[] = [
    { label: t("nav.dashboard"), href: "/student", icon: LayoutDashboard },
    { label: t("nav.courseCatalog"), href: "/catalog", icon: Compass },
    { label: t("nav.myCourses"), href: "/dashboard/courses", icon: BookOpen },
    { label: t("nav.assignments"), href: "/dashboard/assignments", icon: ClipboardList },
    { label: t("nav.achievements"), href: "/dashboard/achievements", icon: Trophy },
    { label: t("nav.announcements", "공지사항"), href: "/student/announcements", icon: Megaphone, showNew: hasNewAnnouncement },
    { label: t("nav.board", "게시판"), href: "/student/board", icon: FileText, showNew: hasNewBoardPost },
    { label: t("nav.myPage"), href: "/mypage", icon: UserCircle },
  ];

  const teacherNav: NavItem[] = [
    { label: t("nav.dashboard"), href: "/teacher", icon: LayoutDashboard },
    { label: t("nav.courseManagement"), href: "/teacher/courses", icon: BookOpen },
    { label: t("nav.assignmentManagement"), href: "/teacher/assignments", icon: ClipboardList },
    { label: t("nav.studentManagement"), href: "/teacher/students", icon: Users },
    { label: t("nav.notificationManagement", "알림 관리"), href: "/teacher/notifications", icon: Bell },
    { label: t("nav.announcementManagement", "공지사항 관리"), href: "/teacher/announcements", icon: Megaphone },
    { label: t("nav.boardManagement", "게시판 관리"), href: "/teacher/board", icon: FileText },
    { label: t("nav.attendanceManagement"), href: "/teacher/attendance", icon: CalendarCheck },
  ];
  const adminNav: NavItem[] = [
    { label: t("nav.dashboard"), href: "/admin", icon: LayoutDashboard },
    { label: t("nav.userManagement"), href: "/admin/users", icon: Users },
    { label: t("nav.branchManagement", "지점 관리"), href: "/admin/branches", icon: Building2 },
    { label: t("nav.courseManagement"), href: "/admin/courses", icon: BookOpen },
    { label: t("nav.enrollmentManagement"), href: "/admin/enrollments", icon: ClipboardCheck },
    { label: t("nav.learningManagement"), href: "/admin/learning", icon: GraduationCap },
    { label: t("nav.attendanceManagement"), href: "/admin/attendance", icon: CalendarCheck },
    { label: t("nav.completionManagement"), href: "/admin/completion", icon: Trophy },
    { label: t("nav.notificationManagement", "알림 관리"), href: "/admin/notifications", icon: Bell },
    { label: t("nav.announcementManagement", "공지사항 관리"), href: "/admin/announcements", icon: Megaphone },
    { label: t("nav.boardManagement", "게시판 관리"), href: "/admin/board", icon: FileText },
    { label: t("nav.surveyManagement", "설문 관리"), href: "/admin/surveys", icon: ClipboardList },
    { label: t("nav.videoManagement", "동영상 관리"), href: "/admin/videos", icon: Video },
    { label: t("nav.trafficMonitoring", "통계 현황"), href: "/admin/traffic", icon: BarChart3 },
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
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" aria-hidden="true" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        role="navigation"
        aria-label={t("nav.mainNavigation", "메인 내비게이션")}
      >
        <div className="p-6 flex flex-col items-start relative">
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label={t("common.closeSidebar", "사이드바 닫기")}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="font-display text-[1.7rem] tracking-wider text-sidebar-primary">NONFICTION</h1>
          <span className="mt-1.5 inline-block text-[11px] tracking-[0.1em] font-medium text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full" aria-label={`${t("common.role", "역할")}: ${roleLabel}`}>
            {roleLabel}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label={t("nav.sideNavigation", "사이드 메뉴")}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                aria-current={isActive ? "page" : undefined}>
                <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>{item.label}</span>
                {item.showNew && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold leading-none rounded bg-destructive text-destructive-foreground animate-pulse">
                    NEW
                  </span>
                )}
                {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button onClick={handleSignOut} className="nav-item w-full text-muted-foreground hover:text-destructive" aria-label={t("auth.logout")}>
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>{t("auth.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center px-6 gap-4" role="banner">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground" aria-label={t("common.openSidebar", "메뉴 열기")}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1" />
          <LanguageToggle />
          <RoleSwitcher />
          <NotificationBell />
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground overflow-hidden" role="img" aria-label={profile?.full_name || t("common.user")}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.full_name || t("common.user")} className="h-full w-full object-cover" fetchPriority="high" decoding="async" />
              ) : (
                <span aria-hidden="true">{initials}</span>
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">{profile?.full_name || t("common.user")}</p>
            </div>
          </div>
        </header>
        <main className={contentClassName || "flex-1 min-w-0 p-6 lg:p-8"} role="main">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
