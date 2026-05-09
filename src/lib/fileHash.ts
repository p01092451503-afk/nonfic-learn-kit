/**
 * Compute SHA-256 hash for a file using Web Crypto.
 * Returns lowercase hex string.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

import { supabase } from "@/integrations/supabase/client";

export interface DuplicateAsset {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  file_size_mb: number | null;
  created_at: string;
}

/**
 * Look up an existing video_assets row with the same file_hash.
 * Returns null if none.
 */
export async function findDuplicateByHash(hash: string): Promise<DuplicateAsset | null> {
  const { data, error } = await supabase
    .from("video_assets")
    .select("id,title,video_url,thumbnail_url,file_size_mb,created_at")
    .eq("file_hash", hash)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as DuplicateAsset | null) ?? null;
}