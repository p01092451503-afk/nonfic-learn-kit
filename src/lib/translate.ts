const AI_GATEWAY_URL = "https://ai-gateway.lovable.dev/v1/chat/completions";

export async function translateKoToEn(texts: string[]): Promise<string[]> {
  const filtered = texts.filter((t) => t.trim());
  if (filtered.length === 0) return texts.map(() => "");

  const prompt = filtered.length === 1
    ? `Translate the following Korean text to English. Return ONLY the translated text, nothing else.\n\n${filtered[0]}`
    : `Translate each of the following Korean texts to English. Return a JSON array of translated strings in the same order. Return ONLY the JSON array, nothing else.\n\n${JSON.stringify(filtered)}`;

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      "x-project-id": import.meta.env.VITE_SUPABASE_PROJECT_ID,
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
    throw new Error("Translation failed");
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content?.trim() || "";

  if (filtered.length === 1) {
    return [content];
  }

  try {
    const cleaned = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [content];
  }
}
