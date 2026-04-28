import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SystemSettingsMap = Record<string, any>;

export const useSystemSettings = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async (): Promise<SystemSettingsMap> => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("key, value");
      if (error) throw error;
      const map: SystemSettingsMap = {};
      (data || []).forEach((row: any) => {
        map[row.key] = row.value;
      });
      return map;
    },
    staleTime: 60_000,
  });

  const settings = data || {};
  // teacher_role_enabled defaults to true if missing
  const teacherRoleEnabled = settings.teacher_role_enabled !== false;

  return { settings, teacherRoleEnabled, isLoading };
};