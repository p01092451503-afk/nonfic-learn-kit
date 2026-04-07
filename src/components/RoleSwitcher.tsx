import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, GraduationCap, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

const roleConfig = {
  admin: { icon: Shield, path: "/admin", labelKey: "roles.admin" },
  teacher: { icon: Users, path: "/teacher", labelKey: "roles.teacher" },
  student: { icon: GraduationCap, path: "/student", labelKey: "roles.student" },
} as const;

const RoleSwitcher = () => {
  const { roles, primaryRole } = useUserRole();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Map roles to switchable dashboard roles (super_admin → admin)
  const switchableRoles = Array.from(
    new Set(roles.map((r) => (r === "super_admin" ? "admin" : r)))
  ).filter((r) => r in roleConfig) as Array<keyof typeof roleConfig>;

  if (switchableRoles.length <= 1) return null;

  const CurrentIcon = roleConfig[primaryRole]?.icon || GraduationCap;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Switch role">
          <CurrentIcon className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {roles.map((role) => {
          const config = roleConfig[role];
          if (!config) return null;
          const Icon = config.icon;
          const isActive = role === primaryRole;
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => navigate(config.path)}
              className={`text-xs gap-2 ${isActive ? "font-bold bg-accent" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(config.labelKey)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;
