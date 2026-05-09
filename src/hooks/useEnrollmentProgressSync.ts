import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  userId: string | undefined;
  courseId: string | undefined;
  overallProgress: number;        // 0–100, computed from completed lessons / total
  enrollmentCompletedAt: string | null | undefined;
  contentsLength: number;
  enabled?: boolean;
}

/**
 * Single source of truth for enrollment.progress + completed_at sync.
 * - Reads completion_criteria.min_progress_pct (default 80) for course-level completion.
 * - Sets completed_at exactly once when threshold is first crossed (never overwrites,
 *   never resets to null on later drops).
 * - No-ops while contents are still loading (contentsLength === 0).
 */
export function useEnrollmentProgressSync({
  userId,
  courseId,
  overallProgress,
  enrollmentCompletedAt,
  contentsLength,
  enabled = true,
}: Options) {
  const queryClient = useQueryClient();
  const lastSyncedRef = useRef<number | null>(null);

  const { data: criteria } = useQuery({
    queryKey: ["completion-criteria", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("completion_criteria")
        .select("min_progress_pct")
        .eq("course_id", courseId!)
        .maybeSingle();
      return data;
    },
    enabled: enabled && !!courseId,
  });

  useEffect(() => {
    if (!enabled || !userId || !courseId || contentsLength === 0) return;
    const percentage = overallProgress;
    if (lastSyncedRef.current === percentage) return;
    lastSyncedRef.current = percentage;

    const minPct = criteria ? Number(criteria.min_progress_pct) : 80;
    const shouldComplete = percentage >= minPct;
    const alreadyCompleted = !!enrollmentCompletedAt;

    const payload: { progress: number; completed_at?: string } = { progress: percentage };
    // Only set completed_at on first crossing — never overwrite, never null-out.
    if (shouldComplete && !alreadyCompleted) {
      payload.completed_at = new Date().toISOString();
    }

    (async () => {
      await supabase
        .from("enrollments")
        .update(payload)
        .eq("user_id", userId)
        .eq("course_id", courseId);
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId, userId] });
    })();
  }, [overallProgress, userId, courseId, contentsLength, enabled, criteria, enrollmentCompletedAt, queryClient]);
}
