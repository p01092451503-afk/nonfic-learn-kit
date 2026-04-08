import { corsHeaders } from "@anthropic-ai/sdk";

const LOVABLE_API_URL = "https://ai-gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { texts } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(JSON.stringify({ error: "texts array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    if (texts.length > 10) {
      return new Response(JSON.stringify({ error: "Maximum 10 texts at a time" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = texts.length === 1
      ? `Translate the following Korean text to English. Return ONLY the translated text, nothing else.\n\n${texts[0]}`
      : `Translate each of the following Korean texts to English. Return a JSON array of translated strings in the same order. Return ONLY the JSON array, nothing else.\n\n${JSON.stringify(texts)}`;

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional Korean to English translator for an LMS (Learning Management System). Translate accurately and naturally. For course/content titles, keep them concise. For descriptions, maintain the original tone and meaning.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim() || "";

    let translations: string[];
    if (texts.length === 1) {
      translations = [content];
    } else {
      try {
        // Try to parse as JSON array
        const cleaned = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
        translations = JSON.parse(cleaned);
      } catch {
        translations = [content];
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
