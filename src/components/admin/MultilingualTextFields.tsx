import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Languages, Loader2 } from "lucide-react";
import { translateKoToEn } from "@/lib/translate";
import { toast } from "sonner";

export interface MultilingualValue {
  ko: { title: string; content: string };
  en: { title: string; content: string };
}

export const EMPTY_MULTILINGUAL: MultilingualValue = {
  ko: { title: "", content: "" },
  en: { title: "", content: "" },
};

interface Props {
  value: MultilingualValue;
  onChange: (v: MultilingualValue) => void;
  contentRows?: number;
  autoTranslate?: boolean;
  onAutoTranslateChange?: (v: boolean) => void;
}

const MultilingualTextFields = ({ value, onChange, contentRows = 6, autoTranslate, onAutoTranslateChange }: Props) => {
  const { t } = useTranslation();
  const [translating, setTranslating] = useState(false);
  const [internalAuto, setInternalAuto] = useState(true);
  const isControlled = autoTranslate !== undefined && !!onAutoTranslateChange;
  const auto = isControlled ? !!autoTranslate : internalAuto;
  const setAuto = (v: boolean) => {
    if (isControlled) onAutoTranslateChange!(v);
    else setInternalAuto(v);
    // Clear EN when enabling auto-translate so save-time translation kicks in
    if (v) onChange({ ...value, en: { title: "", content: "" } });
  };

  const updateKo = (patch: Partial<MultilingualValue["ko"]>) =>
    onChange({ ...value, ko: { ...value.ko, ...patch } });
  const updateEn = (patch: Partial<MultilingualValue["en"]>) =>
    onChange({ ...value, en: { ...value.en, ...patch } });

  const handleAutoTranslate = async () => {
    if (!value.ko.title.trim() && !value.ko.content.trim()) {
      toast.error(t("multilingual.koEmpty", "한국어 내용을 먼저 입력하세요."));
      return;
    }
    try {
      setTranslating(true);
      const [enTitle, enContent] = await translateKoToEn([value.ko.title, value.ko.content]);
      onChange({ ...value, en: { title: enTitle || value.en.title, content: enContent || value.en.content } });
      toast.success(t("multilingual.translated", "영어로 자동 번역되었습니다."));
    } catch {
      toast.error(t("multilingual.translateFailed", "번역에 실패했습니다."));
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Tabs defaultValue="ko" className="w-full">
      <div className="flex items-center justify-between gap-2">
        <TabsList className="h-8">
          <TabsTrigger value="ko" className="text-xs h-6">한국어</TabsTrigger>
          <TabsTrigger value="en" className="text-xs h-6" disabled={auto}>English</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={auto} onCheckedChange={setAuto} aria-label={t("multilingual.autoTranslate", "자동 번역")} />
            <Label className="text-xs cursor-pointer" onClick={() => setAuto(!auto)}>
              {t("multilingual.autoTranslate", "자동 번역")}
            </Label>
          </div>
          {!auto && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAutoTranslate} disabled={translating}>
              {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
              {t("multilingual.translateNow", "한→영 번역")}
            </Button>
          )}
        </div>
      </div>
      <TabsContent value="ko" className="space-y-3 mt-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("announcements.titleLabel", "제목")} (KO) *</Label>
          <Input value={value.ko.title} onChange={(e) => updateKo({ title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("announcements.content", "내용")} (KO) *</Label>
          <Textarea value={value.ko.content} onChange={(e) => updateKo({ content: e.target.value })} rows={contentRows} />
        </div>
        {auto && (
          <p className="text-[11px] text-muted-foreground">
            {t("multilingual.autoTranslateHint", "저장 시 한국어 내용이 영어로 자동 번역됩니다.")}
          </p>
        )}
      </TabsContent>
      {!auto && (
      <TabsContent value="en" className="space-y-3 mt-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("announcements.titleLabel", "제목")} (EN)</Label>
          <Input value={value.en.title} onChange={(e) => updateEn({ title: e.target.value })} placeholder={t("multilingual.autoFillHint", "비워두면 한국어로 표시됩니다")} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("announcements.content", "내용")} (EN)</Label>
          <Textarea value={value.en.content} onChange={(e) => updateEn({ content: e.target.value })} rows={contentRows} placeholder={t("multilingual.autoFillHint", "비워두면 한국어로 표시됩니다")} />
        </div>
      </TabsContent>
      )}
    </Tabs>
  );
};

export const isMultilingualValid = (v: MultilingualValue) =>
  v.ko.title.trim().length > 0 && v.ko.content.trim().length > 0;

export default MultilingualTextFields;