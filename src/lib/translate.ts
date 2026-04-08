import { supabase } from "@/integrations/supabase/client";

const AI_GATEWAY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/translate`;

export async function translateTexts(texts: string[]): Promise<string[]> {
  const filtered = texts.filter((t) => t.trim());
  if (filtered.length === 0) return texts.map(() => "");

  const { data, error } = await supabase.functions.invoke("translate", {
    body: { texts: filtered },
  });

  if (error) throw error;
  return data?.translations || [];
}
