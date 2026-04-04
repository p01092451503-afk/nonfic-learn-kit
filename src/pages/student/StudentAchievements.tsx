import { Award, Flame, Star, Target, TrendingUp, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useTranslation } from "react-i18next";

const badgeIcons: Record<string, React.ElementType> = {
  star: Star, flame: Flame, target: Target, award: Award, zap: Zap,
};

const StudentAchievements = () => {
  const { user } = useUser();
  const { t } = useTranslation();

  const { data: gamification } = useQuery({
    queryKey: ["my-gamification", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_gamification").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: myBadges = [] } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_badges").select("*, badges(*)").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ["all-badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_gamification").select("user_id, total_points, level").order("total_points", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: leaderProfiles = [] } = useQuery({
    queryKey: ["leader-profiles", leaderboard.map((l: any) => l.user_id)],
    queryFn: async () => {
      const ids = leaderboard.map((l: any) => l.user_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: leaderboard.length > 0,
  });

  const earnedBadgeIds = new Set(myBadges.map((b: any) => b.badge_id));
  const profileMap = new Map(leaderProfiles.map((p: any) => [p.user_id, p.full_name]));

  const level = gamification?.level || 1;
  const totalPoints = gamification?.total_points || 0;
  const xp = gamification?.experience_points || 0;
  const streak = gamification?.streak_days || 0;
  const nextLevelXp = level * 200;
  const xpProgress = nextLevelXp > 0 ? Math.min(Math.round((xp / nextLevelXp) * 100), 100) : 0;

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("achievements.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("achievements.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card text-center">
            <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">Lv.{level}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("achievements.currentLevel")}</p>
          </div>
          <div className="stat-card text-center">
            <Zap className="h-5 w-5 text-warning mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">{totalPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("achievements.totalPoints")}</p>
          </div>
          <div className="stat-card text-center">
            <Flame className="h-5 w-5 text-destructive mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("achievements.consecutiveDays")}</p>
          </div>
          <div className="stat-card text-center">
            <Award className="h-5 w-5 text-success mx-auto mb-3" />
            <p className="text-3xl font-bold text-foreground">{myBadges.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("achievements.earnedBadges")}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t("achievements.nextLevel")}</span>
            <span className="text-xs text-muted-foreground">{xp} / {nextLevelXp} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("achievements.badgeCollection")}</h2>
            {allBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("achievements.noBadges")}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allBadges.map((badge: any) => {
                  const earned = earnedBadgeIds.has(badge.id);
                  const Icon = badgeIcons[badge.icon] || Star;
                  return (
                    <div key={badge.id} className={`stat-card text-center !p-4 ${!earned ? "opacity-40 grayscale" : ""}`}>
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${earned ? "text-warning" : "text-muted-foreground"}`} />
                      <h3 className="text-sm font-medium text-foreground">{badge.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                      {earned && <p className="text-[10px] text-success font-medium mt-1.5">{t("achievements.earned")}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("achievements.leaderboard")}</h2>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              <div className="stat-card !p-0 divide-y divide-border">
                {leaderboard.map((entry: any, idx: number) => (
                  <div key={entry.user_id} className="p-3 flex items-center gap-3">
                    <span className={`text-sm font-bold w-6 text-center ${idx < 3 ? "text-warning" : "text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                      {(profileMap.get(entry.user_id) || "?").slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{profileMap.get(entry.user_id) || t("common.user")}</p>
                      <p className="text-[10px] text-muted-foreground">Lv.{entry.level || 1}</p>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{entry.total_points || 0}pt</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentAchievements;