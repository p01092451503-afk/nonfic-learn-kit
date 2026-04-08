import { supabase } from "@/integrations/supabase/client";

export async function translateKoToEn(texts: string[]): Promise<string[]> {
  const filtered = texts.filter((t) => t.trim());
  if (filtered.length === 0) return texts.map(() => "");

  const { data, error } = await supabase.functions.invoke("translate", {
    body: { texts: filtered },
  });

  if (error) {
    console.error("Translation error:", error);
    throw new Error("Translation failed");
  }

  return data.translations || [];
}
