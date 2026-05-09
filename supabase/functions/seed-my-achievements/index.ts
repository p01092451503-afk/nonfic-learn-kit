import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const uid = user.id;

    // Wipe prior achievement-related rows for this user
    await admin.from("point_history").delete().eq("user_id", uid);
    await admin.from("user_badges").delete().eq("user_id", uid);
    await admin.from("user_gamification").delete().eq("user_id", uid);
    await admin.from("user_sessions").delete().eq("user_id", uid);

    // Gamification snapshot
    await admin.from("user_gamification").insert({
      user_id: uid,
      total_points: 1450,
      experience_points: 1450,
      level: 15,
      streak_days: 12,
      last_activity_date: new Date().toISOString().slice(0, 10),
    });

    // 8 weeks of point history (mixed activities)
    const actions = [
      { type: "lesson_completed", pts: 10, desc: "차시 완료" },
      { type: "assessment_passed", pts: 30, desc: "평가 합격" },
      { type: "assignment_completed", pts: 20, desc: "과제 완료" },
      { type: "streak_bonus", pts: 50, desc: "7일 연속 학습 보너스" },
      { type: "assessment_completed", pts: 10, desc: "평가 응시" },
    ];
    const phRows: any[] = [];
    for (let d = 0; d < 56; d++) {
      const day = new Date(Date.now() - d * 86400000);
      const count = d % 3 === 0 ? 3 : d % 2 === 0 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const a = actions[(d + k) % actions.length];
        phRows.push({
          user_id: uid,
          points: a.pts,
          action_type: a.type,
          description: a.desc,
          created_at: new Date(day.getTime() - k * 3600000).toISOString(),
        });
      }
    }
    await admin.from("point_history").insert(phRows);

    // Sessions for streak visualization
    const sessions = Array.from({ length: 14 }, (_, i) => ({
      user_id: uid,
      login_at: new Date(Date.now() - i * 86400000).toISOString(),
      logout_at: new Date(Date.now() - i * 86400000 + 45 * 60000).toISOString(),
    }));
    await admin.from("user_sessions").insert(sessions);

    // Award badges based on criteria
    await admin.rpc("check_and_award_badges", { p_user_id: uid });

    return json({ ok: true });
  } catch (err) {
    console.error("seed-my-achievements error", err);
    return json({ error: (err as Error).message }, 500);
  }
});