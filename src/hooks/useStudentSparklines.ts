import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";

export type StudentSparklines = {
  days: string[];
  lessons: number[];      // content_progress completed per day
  points: number[];       // points earned per day
  sessions: number[];     // logins per day
  assignments: number[];  // submissions per day
  assessments: number[];  // attempts per day
  badges: number[];       // badges earned per day
  completions: number[];  // courses completed per day
  enrollments: number[];  // enrollments started per day
};

const empty = (n: number): StudentSparklines => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  return {
    days,
    lessons: Array(n).fill(0),
    points: Array(n).fill(0),
    sessions: Array(n).fill(0),
    assignments: Array(n).fill(0),
    assessments: Array(n).fill(0),
    badges: Array(n).fill(0),
    completions: Array(n).fill(0),
    enrollments: Array(n).fill(0),
  };
};

const bucketize = (rows: any[] | null | undefined, dateField: string, days: string[]) => {
  const idx = new Map(days.map((d, i) => [d, i]));
  const out = Array(days.length).fill(0);
  (rows || []).forEach((r) => {
    const v = r[dateField];
    if (!v) return;
    const k = format(new Date(v), "yyyy-MM-dd");
    const i = idx.get(k);
    if (i !== undefined) out[i] += 1;
    return;
  });
  return out;
};

const sumByDay = (rows: any[] | null | undefined, dateField: string, valueField: string, days: string[]) => {
  const idx = new Map(days.map((d, i) => [d, i]));
  const out = Array(days.length).fill(0);
  (rows || []).forEach((r) => {
    const v = r[dateField];
    if (!v) return;
    const k = format(new Date(v), "yyyy-MM-dd");
    const i = idx.get(k);
    if (i !== undefined) out[i] += Number(r[valueField]) || 0;
  });
  return out;
};

/**
 * Per-user activity time series for student dashboard stat cards.
 * Single batched call → multiple sparkline-ready arrays.
 */
export const useStudentSparklines = (userId: string | undefined, days = 14) => {
  return useQuery({
    queryKey: ["student-sparklines", userId, days],
    queryFn: async (): Promise<StudentSparklines> => {
      if (!userId) return empty(days);
      const since = startOfDay(subDays(new Date(), days - 1)).toISOString();

      const [cp, ph, us, asg, ass, ub, en] = await Promise.all([
        supabase.from("content_progress").select("completed_at").eq("user_id", userId).eq("completed", true).gte("completed_at", since),
        supabase.from("point_history").select("created_at, points").eq("user_id", userId).gte("created_at", since),
        supabase.from("user_sessions").select("login_at").eq("user_id", userId).gte("login_at", since),
        supabase.from("assignment_submissions").select("submitted_at").eq("student_id", userId).gte("submitted_at", since),
        supabase.from("assessment_attempts").select("completed_at").eq("user_id", userId).not("completed_at", "is", null).gte("completed_at", since),
        supabase.from("user_badges").select("earned_at").eq("user_id", userId).gte("earned_at", since),
        supabase.from("enrollments").select("enrolled_at, completed_at").eq("user_id", userId).gte("enrolled_at", since),
      ]);

      const skel = empty(days);
      return {
        days: skel.days,
        lessons: bucketize(cp.data, "completed_at", skel.days),
        points: sumByDay(ph.data, "created_at", "points", skel.days),
        sessions: bucketize(us.data, "login_at", skel.days),
        assignments: bucketize(asg.data, "submitted_at", skel.days),
        assessments: bucketize(ass.data, "completed_at", skel.days),
        badges: bucketize(ub.data, "earned_at", skel.days),
        completions: bucketize(en.data, "completed_at", skel.days),
        enrollments: bucketize(en.data, "enrolled_at", skel.days),
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

export const computeDelta = (series: number[] | undefined): number | null => {
  if (!series || series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  const recent = series.slice(half).reduce((a, b) => a + b, 0);
  if (prev === 0 && recent === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((recent - prev) / prev) * 100);
};