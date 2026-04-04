import { useState, useEffect } from "react";
import { User, Lock, Camera, Check, ArrowRight, BookOpen, Trophy, Star, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

const PRESET_AVATARS = Array.from({ length: 8 }, (_, i) => `/avatars/avatar-0${i + 1}.png`);

const MyPage = () => {
  const { user, profile, refreshProfile } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone_number || "");
  const [position, setPosition] = useState(profile?.position || "");
  const [teamName, setTeamName] = useState(profile?.team_name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || "");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone_number: phone,
          position,
          team_name: teamName,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: t("mypage.profileSaved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    setIsSavingAvatar(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: selectedAvatar })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: t("mypage.avatarSaved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: t("common.error"), description: t("mypage.passwordMinLength"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: t("mypage.passwordMismatch"), variant: "destructive" });
      return;
    }
    setIsChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t("mypage.passwordChanged") });
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setIsChangingPw(false);
    }
  };

  const currentAvatar = profile?.avatar_url;

  // Stats for the header
  const { data: enrollmentStats } = useQuery({
    queryKey: ["mypage-enrollment-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("status, completed_at")
        .eq("user_id", user!.id)
        .eq("status", "approved");
      if (error) throw error;
      const inProgress = data.filter((e: any) => !e.completed_at).length;
      const completed = data.filter((e: any) => e.completed_at).length;
      return { inProgress, completed, total: data.length };
    },
    enabled: !!user?.id,
  });

  const { data: gamification } = useQuery({
    queryKey: ["mypage-gamification", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: badgeCount = 0 } = useQuery({
    queryKey: ["mypage-badges", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const streakDays = gamification?.streak_days || 0;
  const totalPoints = gamification?.total_points || 0;
  const level = gamification?.level || 1;
  const xp = gamification?.experience_points || 0;
  const xpToNext = (level) * 100;
  const xpProgress = Math.min(100, (xp / xpToNext) * 100);

  return (
    <DashboardLayout role="student">
      <div className="space-y-0 -m-6 lg:-m-8">
        {/* Hero */}
        <div className="border-y border-foreground/15">
          <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              {/* Left: avatar + info (expanded) */}
              <div className="flex items-center gap-5 lg:min-w-[320px]">
                <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                  <AvatarImage src={currentAvatar || ""} alt={profile?.full_name || ""} />
                  <AvatarFallback className="bg-card text-foreground text-xl font-semibold">
                    {profile?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <h1 className="text-xl font-bold text-foreground">{profile?.full_name || t("common.user")}</h1>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {profile?.department && (
                      <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{profile.department}</span>
                    )}
                    {profile?.position && (
                      <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{profile.position}</span>
                    )}
                    {profile?.team_name && (
                      <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{profile.team_name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: mini dashboard */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 수강 현황 */}
                <div className="border border-border rounded-xl p-3 sm:p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t("dashboard.inProgress")}</span>
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{enrollmentStats?.inProgress || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{t("dashboard.totalCourses", { count: enrollmentStats?.total || 0 })}</p>
                </div>

                {/* 수강 완료 */}
                <div className="border border-border rounded-xl p-3 sm:p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t("dashboard.coursesCompleted")}</span>
                    <Trophy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{enrollmentStats?.completed || 0}</p>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${enrollmentStats?.total ? ((enrollmentStats.completed || 0) / enrollmentStats.total) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* 레벨 & XP */}
                <div className="border border-border rounded-xl p-3 sm:p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t("dashboard.level")}</span>
                    <Star className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">Lv.{level}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0">{xp}/{xpToNext} XP</span>
                  </div>
                </div>

                {/* 연속학습 & 포인트 & 뱃지 */}
                <div className="border border-border rounded-xl p-3 sm:p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t("dashboard.earnedBadges")}</span>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{badgeCount}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>🔥 {streakDays}{t("common.days")}</span>
                    <span className="text-foreground/20">·</span>
                    <span>{totalPoints} P</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-secondary/50 rounded-xl p-1">
              <TabsTrigger value="profile" className="rounded-lg gap-1.5 text-sm">
                <User className="h-4 w-4" /> {t("mypage.profileTab")}
              </TabsTrigger>
              <TabsTrigger value="avatar" className="rounded-lg gap-1.5 text-sm">
                <Camera className="h-4 w-4" /> {t("mypage.avatarTab")}
              </TabsTrigger>
              <TabsTrigger value="password" className="rounded-lg gap-1.5 text-sm">
                <Lock className="h-4 w-4" /> {t("mypage.passwordTab")}
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="max-w-lg space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{t("mypage.profileInfo")}</h2>
                  <p className="text-sm text-muted-foreground">{t("mypage.profileInfoDesc")}</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.email")}</label>
                    <Input value={user?.email || ""} disabled className="h-11 rounded-xl bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.name")}</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.phone")}</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="h-11 rounded-xl border-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.position")}</label>
                      <Input value={position} onChange={(e) => setPosition(e.target.value)} className="h-11 rounded-xl border-border" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.team")}</label>
                      <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="h-11 rounded-xl border-border" />
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="rounded-xl gap-1.5">
                  {isSavingProfile ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </TabsContent>

            {/* Avatar Tab */}
            <TabsContent value="avatar">
              <div className="max-w-2xl space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{t("mypage.selectAvatar")}</h2>
                  <p className="text-sm text-muted-foreground">{t("mypage.selectAvatarDesc")}</p>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-4">
                  {PRESET_AVATARS.map((url) => (
                    <button
                      key={url}
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 bg-accent ${
                        selectedAvatar === url
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                      {selectedAvatar === url && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Preview */}
                <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-card">
                    {selectedAvatar ? (
                      <img src={selectedAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-lg font-bold text-muted-foreground">
                        {profile?.full_name?.slice(0, 2) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("mypage.preview")}</p>
                    <p className="text-xs text-muted-foreground">{t("mypage.previewDesc")}</p>
                  </div>
                  <Button onClick={handleSaveAvatar} disabled={isSavingAvatar} className="rounded-xl gap-1.5">
                    {isSavingAvatar ? t("common.saving") : t("mypage.applyAvatar")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Password Tab */}
            <TabsContent value="password">
              <div className="max-w-lg space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{t("mypage.changePassword")}</h2>
                  <p className="text-sm text-muted-foreground">{t("mypage.changePasswordDesc")}</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.newPassword")}</label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("mypage.newPasswordPlaceholder")} className="h-11 rounded-xl border-border" minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mypage.confirmPassword")}</label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("mypage.confirmPasswordPlaceholder")} className="h-11 rounded-xl border-border" />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={isChangingPw || !newPassword} className="rounded-xl gap-1.5">
                  {isChangingPw ? t("common.processing") : t("mypage.changePassword")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyPage;
