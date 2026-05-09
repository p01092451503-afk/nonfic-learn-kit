import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "demo1234!";
const DEMO = [
  { email: "admin@demo.local", role: "admin", full_name: "데모 관리자" },
  { email: "teacher@demo.local", role: "teacher", full_name: "데모 강사" },
  { email: "student@demo.local", role: "student", full_name: "데모 학습자" },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    // 1) Ensure demo users exist with correct roles
    const userIds: Record<string, string> = {};
    for (const d of DEMO) {
      // Find existing user via list (paginate just first page; demo emails are unique)
      let userId: string | null = null;
      let page = 1;
      while (page <= 10) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const found = list?.users?.find((u: any) => u.email?.toLowerCase() === d.email);
        if (found) {
          userId = found.id;
          break;
        }
        if (!list || list.users.length < 200) break;
        page++;
      }
      if (!userId) {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: d.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: d.full_name },
        });
        if (cErr) throw new Error(`createUser ${d.email}: ${cErr.message}`);
        userId = created.user!.id;
      } else {
        // Reset password to known value
        await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
      }
      userIds[d.role] = userId!;

      // Ensure profile + role
      await admin.from("profiles").upsert(
        { user_id: userId, full_name: d.full_name, email: d.email },
        { onConflict: "user_id" },
      );
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role: d.role });
    }

    const adminId = userIds.admin;
    const teacherId = userIds.teacher;
    const studentId = userIds.student;

    // 2) Teacher: instructor for all published courses
    const { data: pubCourses } = await admin
      .from("courses")
      .select("id, title")
      .eq("status", "published")
      .order("created_at", { ascending: true });
    const courseIds = (pubCourses || []).map((c: any) => c.id);
    if (courseIds.length > 0) {
      await admin.from("courses").update({ instructor_id: teacherId }).in("id", courseIds);
    }

    // 3) Wipe demo student's transactional data
    const wipe = async (table: string, col = "user_id") => {
      await admin.from(table).delete().eq(col, studentId);
    };

    // delete assessment_answers via attempts first
    const { data: attempts } = await admin
      .from("assessment_attempts")
      .select("id")
      .eq("user_id", studentId);
    const attemptIds = (attempts || []).map((a: any) => a.id);
    if (attemptIds.length > 0) {
      await admin.from("assessment_answers").delete().in("attempt_id", attemptIds);
    }
    await wipe("assessment_attempts");
    await admin.from("assignment_submissions").delete().eq("student_id", studentId);
    await wipe("content_progress");
    await wipe("certificates");
    await wipe("user_badges");
    await wipe("user_gamification");
    await wipe("point_history");
    await wipe("user_sessions");
    await wipe("notifications");
    await wipe("enrollments");

    // 4) Re-seed student data
    const enrollCourseIds = courseIds.slice(0, 5);
    if (enrollCourseIds.length > 0) {
      const enrollRows = enrollCourseIds.map((cid, i) => ({
        user_id: studentId,
        course_id: cid,
        status: "approved" as const,
        progress: [100, 85, 60, 40, 20][i] ?? 30,
        enrolled_at: new Date(Date.now() - (30 - i * 5) * 86400000).toISOString(),
        completed_at: i === 0 ? new Date(Date.now() - 2 * 86400000).toISOString() : null,
      }));
      await admin.from("enrollments").insert(enrollRows);

      // content_progress: first 15 published contents across enrolled courses
      const { data: contents } = await admin
        .from("course_contents")
        .select("id, course_id")
        .in("course_id", enrollCourseIds)
        .eq("is_published", true)
        .order("order_index", { ascending: true })
        .limit(25);
      const cps = (contents || []).slice(0, 25).map((c: any, i: number) => {
        const completed = i < 15;
        return {
          user_id: studentId,
          content_id: c.id,
          completed,
          progress_percentage: completed ? 100 : [70, 50, 30, 20, 10][(i - 15) % 5],
          completed_at: completed
            ? new Date(Date.now() - (15 - i) * 86400000).toISOString()
            : null,
          last_accessed_at: new Date(Date.now() - i * 3600000).toISOString(),
          last_position_seconds: completed ? 0 : 120,
        };
      });
      if (cps.length > 0) await admin.from("content_progress").insert(cps);
    }

    // gamification
    await admin.from("user_gamification").insert({
      user_id: studentId,
      total_points: 1450,
      experience_points: 1450,
      level: 15,
      streak_days: 12,
      last_activity_date: new Date().toISOString().slice(0, 10),
    });

    // point_history (last 14 days)
    const actions = ["lesson_completed", "assessment_passed", "streak_bonus", "assignment_completed"];
    const pts = [10, 30, 10, 20];
    const phRows: any[] = [];
    for (let i = 0; i < 14; i++) {
      const day = new Date(Date.now() - i * 86400000);
      for (let k = 0; k < 2; k++) {
        const idx = (i + k) % actions.length;
        phRows.push({
          user_id: studentId,
          points: pts[idx],
          action_type: actions[idx],
          description: "데모 활동",
          created_at: new Date(day.getTime() - k * 3600000).toISOString(),
        });
      }
    }
    await admin.from("point_history").insert(phRows);

    // user_sessions (14 days of logins)
    const sessionRows = Array.from({ length: 14 }, (_, i) => ({
      user_id: studentId,
      login_at: new Date(Date.now() - i * 86400000).toISOString(),
      logout_at: new Date(Date.now() - i * 86400000 + 45 * 60000).toISOString(),
      duration_seconds: 45 * 60,
    }));
    await admin.from("user_sessions").insert(sessionRows);

    // notifications
    await admin.from("notifications").insert([
      { user_id: studentId, title: "새로운 강의가 등록되었습니다", message: "관심 분야의 신규 강의를 확인해보세요.", type: "info" },
      { user_id: studentId, title: "과제 마감 D-3", message: "제출 기한이 다가오고 있습니다.", type: "warning" },
      { user_id: studentId, title: "축하합니다! 레벨 업", message: "Lv.15에 도달했습니다.", type: "success" },
    ]);

    // award badges by criteria
    await admin.rpc("check_and_award_badges", { p_user_id: studentId });

    return json({
      ok: true,
      users: { admin: adminId, teacher: teacherId, student: studentId },
      courses_assigned: courseIds.length,
      enrolled: enrollCourseIds.length,
    });
  } catch (err) {
    console.error("reset-demo-data error", err);
    return json({ error: (err as Error).message }, 500);
  }
});