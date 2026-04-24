import { supabase } from "@/integrations/supabase/client";
import { translateKoToEn } from "@/lib/translate";
import type { MultilingualValue } from "@/components/admin/MultilingualTextFields";

/**
 * Saves Korean + English translations for a record into an i18n table.
 * Auto-translates KO→EN if EN is empty.
 */
export async function saveContentTranslations(params: {
  table: "announcement_i18n" | "board_post_i18n";
  fkColumn: "announcement_id" | "post_id";
  recordId: string;
  value: MultilingualValue;
}) {
  const { table, fkColumn, recordId, value } = params;

  let enTitle = value.en.title.trim();
  let enContent = value.en.content.trim();

  // Auto-translate missing English fields
  const needsTranslation = !enTitle || !enContent;
  if (needsTranslation) {
    try {
      const [tTitle, tContent] = await translateKoToEn([
        enTitle ? "" : value.ko.title,
        enContent ? "" : value.ko.content,
      ]);
      if (!enTitle) enTitle = tTitle || value.ko.title;
      if (!enContent) enContent = tContent || value.ko.content;
    } catch {
      // Fallback to KO if translation fails
      if (!enTitle) enTitle = value.ko.title;
      if (!enContent) enContent = value.ko.content;
    }
  }

  // Delete existing translations for clean upsert
  await (supabase as any).from(table).delete().eq(fkColumn, recordId);

  // Insert KO + EN
  const rows = [
    { [fkColumn]: recordId, language_code: "ko", title: value.ko.title, content: value.ko.content },
    { [fkColumn]: recordId, language_code: "en", title: enTitle, content: enContent },
  ];
  const { error } = await (supabase as any).from(table).insert(rows);
  if (error) throw error;
}

/**
 * Loads existing translations for editing.
 * Falls back to base record fields if no translations exist.
 */
export async function loadContentTranslations(params: {
  table: "announcement_i18n" | "board_post_i18n";
  fkColumn: "announcement_id" | "post_id";
  recordId: string;
  fallbackTitle: string;
  fallbackContent: string;
}): Promise<MultilingualValue> {
  const { table, fkColumn, recordId, fallbackTitle, fallbackContent } = params;
  const { data } = await (supabase as any).from(table).select("language_code, title, content").eq(fkColumn, recordId);
  const ko = (data || []).find((r: any) => r.language_code === "ko");
  const en = (data || []).find((r: any) => r.language_code === "en");
  return {
    ko: { title: ko?.title ?? fallbackTitle, content: ko?.content ?? fallbackContent },
    en: { title: en?.title ?? "", content: en?.content ?? "" },
  };
}

/**
 * Picks the best translation for a given language, falling back to KO then base.
 */
export function pickTranslation<T extends { language_code: string; title: string; content: string }>(
  translations: T[] | undefined | null,
  lang: string,
  fallback: { title: string; content: string }
): { title: string; content: string } {
  if (!translations?.length) return fallback;
  const match = translations.find((t) => t.language_code === lang);
  if (match) return { title: match.title, content: match.content };
  const ko = translations.find((t) => t.language_code === "ko");
  if (ko) return { title: ko.title, content: ko.content };
  return fallback;
}