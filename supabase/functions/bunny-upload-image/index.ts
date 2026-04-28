import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const STORAGE_ZONE = Deno.env.get("BUNNY_STORAGE_ZONE");
    const STORAGE_KEY = Deno.env.get("BUNNY_STORAGE_API_KEY");
    const STORAGE_HOST = Deno.env.get("BUNNY_STORAGE_HOSTNAME") || "storage.bunnycdn.com";
    const CDN_HOST = Deno.env.get("BUNNY_STORAGE_CDN_HOSTNAME");

    if (!STORAGE_ZONE || !STORAGE_KEY || !CDN_HOST) {
      return new Response(JSON.stringify({ error: "Bunny Storage env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const folder = (form.get("folder") as string | null) || "media";
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "file required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const safeName = `${crypto.randomUUID()}.${ext}`;
    const path = `${folder}/${safeName}`;
    const url = `https://${STORAGE_HOST}/${STORAGE_ZONE}/${path}`;

    const buf = await file.arrayBuffer();
    const put = await fetch(url, {
      method: "PUT",
      headers: {
        AccessKey: STORAGE_KEY,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buf,
    });

    if (!put.ok) {
      const text = await put.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Bunny storage upload failed", status: put.status, details: text }), {
        status: put.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cdnUrl = `https://${CDN_HOST}/${path}`;
    return new Response(
      JSON.stringify({ url: cdnUrl, path, size: buf.byteLength, contentType: file.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});