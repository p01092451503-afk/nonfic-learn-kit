import { useState, useRef, useEffect } from "react";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

type AvatarCategory = "all" | "female" | "male" | "casual" | "professional" | "senior";

interface AvatarItem {
  id: number;
  src: string;
  categories: string[];
  label: string;
}

const AVATAR_DATA: AvatarItem[] = [
  // Row 1: Original 8
  { id: 1, src: "/avatars/avatar-01.png", categories: ["female", "casual"], label: "캐주얼 여성 1" },
  { id: 2, src: "/avatars/avatar-02.png", categories: ["male", "professional"], label: "프로페셔널 남성 1" },
  { id: 3, src: "/avatars/avatar-03.png", categories: ["female", "professional"], label: "프로페셔널 여성 1" },
  { id: 4, src: "/avatars/avatar-04.png", categories: ["male", "casual"], label: "캐주얼 남성 1" },
  { id: 5, src: "/avatars/avatar-05.png", categories: ["female", "casual"], label: "캐주얼 여성 2" },
  { id: 6, src: "/avatars/avatar-06.png", categories: ["male", "senior", "professional"], label: "시니어 남성 1" },
  { id: 7, src: "/avatars/avatar-07.png", categories: ["female", "casual"], label: "캐주얼 여성 3" },
  { id: 8, src: "/avatars/avatar-08.png", categories: ["male", "casual"], label: "캐주얼 남성 2" },
  // Row 2: Beauty professional set
  { id: 9, src: "/avatars/avatar-09.png", categories: ["female", "casual"], label: "캐주얼 여성 4" },
  { id: 10, src: "/avatars/avatar-10.png", categories: ["male", "professional"], label: "프로페셔널 남성 2" },
  { id: 11, src: "/avatars/avatar-11.png", categories: ["female", "casual"], label: "캐주얼 여성 5" },
  { id: 12, src: "/avatars/avatar-12.png", categories: ["female", "casual"], label: "캐주얼 여성 6" },
  { id: 13, src: "/avatars/avatar-13.png", categories: ["female", "senior", "professional"], label: "시니어 여성 1" },
  { id: 14, src: "/avatars/avatar-14.png", categories: ["male", "casual"], label: "캐주얼 남성 3" },
  { id: 15, src: "/avatars/avatar-15.png", categories: ["female", "casual"], label: "캐주얼 여성 7" },
  { id: 16, src: "/avatars/avatar-16.png", categories: ["male", "professional"], label: "프로페셔널 남성 3" },
  // Row 3: New diverse set
  { id: 17, src: "/avatars/avatar-17.png", categories: ["female", "professional"], label: "프로페셔널 여성 2" },
  { id: 18, src: "/avatars/avatar-18.png", categories: ["male", "casual"], label: "캐주얼 남성 4" },
  { id: 19, src: "/avatars/avatar-19.png", categories: ["female", "senior", "professional"], label: "시니어 여성 2" },
  { id: 20, src: "/avatars/avatar-20.png", categories: ["male", "senior"], label: "시니어 남성 2" },
  { id: 21, src: "/avatars/avatar-21.png", categories: ["female", "casual"], label: "캐주얼 여성 8" },
  { id: 22, src: "/avatars/avatar-22.png", categories: ["male", "casual"], label: "캐주얼 남성 5" },
  { id: 23, src: "/avatars/avatar-23.png", categories: ["female", "professional"], label: "프로페셔널 여성 3" },
  { id: 24, src: "/avatars/avatar-24.png", categories: ["male", "professional"], label: "프로페셔널 남성 4" },
];

const CATEGORIES: { key: AvatarCategory; labelKey: string }[] = [
  { key: "all", labelKey: "mypage.catAll" },
  { key: "female", labelKey: "mypage.catFemale" },
  { key: "male", labelKey: "mypage.catMale" },
  { key: "casual", labelKey: "mypage.catCasual" },
  { key: "professional", labelKey: "mypage.catProfessional" },
  { key: "senior", labelKey: "mypage.catSenior" },
];

// Preload avatars
const preloadAvatars = () => {
  AVATAR_DATA.forEach(({ src }) => {
    const img = new Image();
    img.src = src;
  });
};

const AvatarTab = () => {
  const { user, profile, refreshProfile } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || "");
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  const currentSavedAvatar = profile?.avatar_url || "";

  useEffect(() => {
    preloadAvatars();
  }, []);

  useEffect(() => {
    if (profile?.avatar_url) {
      setSelectedAvatar(profile.avatar_url);
      // If saved avatar is a storage URL (not a preset), treat as custom
      const isPreset = AVATAR_DATA.some((a) => a.src === profile.avatar_url);
      if (!isPreset && profile.avatar_url) {
        setCustomAvatarUrl(profile.avatar_url);
      }
    }
  }, [profile?.avatar_url]);

  const filteredAvatars =
    activeCategory === "all"
      ? AVATAR_DATA
      : AVATAR_DATA.filter((a) => a.categories.includes(activeCategory));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("common.error"), description: t("mypage.fileTooLarge"), variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      setCustomAvatarUrl(urlWithCache);
      setSelectedAvatar(urlWithCache);
      toast({ title: t("mypage.uploadSuccess") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!user) return;
    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  const hasSelection = selectedAvatar !== currentSavedAvatar;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("mypage.selectAvatar")}</h2>
        <p className="text-sm text-muted-foreground">{t("mypage.selectAvatarDesc")}</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === key
                ? "bg-foreground text-background ring-2 ring-foreground shadow-sm"
                : "bg-background text-muted-foreground border border-border hover:border-foreground/40"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {/* Custom uploaded avatar - show first if exists */}
        {customAvatarUrl && (
          <button
            onClick={() => setSelectedAvatar(customAvatarUrl)}
            className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-150 cursor-pointer ${
              selectedAvatar === customAvatarUrl
                ? "ring-2 ring-foreground scale-105 z-10"
                : selectedAvatar
                  ? "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-muted-foreground hover:scale-103"
                  : "hover:ring-1 hover:ring-muted-foreground hover:scale-103"
            }`}
            style={{ backgroundColor: "#FAF6F0" }}
          >
            <img src={customAvatarUrl} alt="Custom" className="w-full h-full object-cover" />
            {selectedAvatar === customAvatarUrl && (
              <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background border border-foreground flex items-center justify-center">
                <Check className="h-3 w-3 text-foreground" />
              </div>
            )}
            {currentSavedAvatar === customAvatarUrl && selectedAvatar !== customAvatarUrl && (
              <span className="absolute top-1 left-1 text-[8px] bg-foreground/80 text-background px-1.5 py-0.5 rounded-full leading-none">
                {t("mypage.recentlyUsed")}
              </span>
            )}
          </button>
        )}

        {/* Preset avatars */}
        {filteredAvatars.map((avatar) => {
          const isSelected = selectedAvatar === avatar.src;
          const isRecentlyUsed = currentSavedAvatar === avatar.src && !isSelected;
          return (
            <button
              key={avatar.id}
              onClick={() => setSelectedAvatar(avatar.src)}
              className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "ring-2 ring-foreground scale-105 z-10"
                  : selectedAvatar
                    ? "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-muted-foreground hover:scale-[1.03]"
                    : "hover:ring-1 hover:ring-muted-foreground hover:scale-[1.03]"
              }`}
              style={{ backgroundColor: "#FAF6F0" }}
            >
              <img src={avatar.src} alt={avatar.label} className="w-full h-full object-cover" loading="lazy" />
              {isSelected && (
                <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background border border-foreground flex items-center justify-center">
                  <Check className="h-3 w-3 text-foreground" />
                </div>
              )}
              {isRecentlyUsed && (
                <span className="absolute top-1 left-1 text-[8px] bg-foreground/80 text-background px-1.5 py-0.5 rounded-full leading-none">
                  {t("mypage.recentlyUsed")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Photo Button */}
      <div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ring-1 ring-border hover:ring-foreground/40 transition-all text-sm text-muted-foreground hover:text-foreground"
        >
          <ImagePlus className="h-4 w-4" />
          <span>{isUploading ? t("common.saving") : t("mypage.uploadPhoto")}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Preview Bar */}
      <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl border border-border">
        <div className="h-[60px] w-[60px] shrink-0 rounded-full overflow-hidden border-2 border-background shadow-sm bg-card">
          {selectedAvatar ? (
            <img src={selectedAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-lg font-bold text-muted-foreground">
              {profile?.full_name?.slice(0, 2) || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{profile?.full_name || t("common.user")}</p>
          <p className="text-xs text-muted-foreground">{t("mypage.previewDesc")}</p>
        </div>
        <Button
          onClick={handleApply}
          disabled={isSaving || !selectedAvatar}
          className="rounded-xl px-6 py-3 h-auto text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              {t("common.saving")}
            </>
          ) : (
            t("mypage.applyAvatar")
          )}
        </Button>
      </div>
    </div>
  );
};

export default AvatarTab;
