import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MenuRole = "student" | "teacher" | "admin";

export interface MenuVisibilityRow {
  role: MenuRole;
  menu_key: string;
  hidden: boolean;
}

export const useSidebarMenuVisibility = () => {
  const { data, ...rest } = useQuery({
    queryKey: ["sidebar-menu-visibility"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sidebar_menu_visibility")
        .select("role, menu_key, hidden");
      if (error) throw error;
      return (data || []) as MenuVisibilityRow[];
    },
    staleTime: 60_000,
  });

  const isHidden = (role: MenuRole, menuKey: string) =>
    !!data?.find((r) => r.role === role && r.menu_key === menuKey)?.hidden;

  return { rows: data || [], isHidden, ...rest };
};