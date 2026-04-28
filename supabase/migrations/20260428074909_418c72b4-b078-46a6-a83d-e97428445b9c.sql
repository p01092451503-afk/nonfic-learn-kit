
-- Aggregated stats RPC for AdminDashboard to replace 2 huge full-table SELECTs
-- (was fetching ALL enrollments + ALL profiles per dashboard load).
CREATE OR REPLACE FUNCTION public.admin_dashboard_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_enrollments',  (SELECT COUNT(*) FROM public.enrollments),
    'total_completions',  (SELECT COUNT(*) FROM public.enrollments WHERE completed_at IS NOT NULL),
    'active_courses',     (SELECT COUNT(*) FROM public.courses WHERE status = 'published'),
    'top_courses', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT c.id, c.title,
               COUNT(e.id) AS enrolled,
               COALESCE(ROUND(AVG(e.progress)), 0) AS avg_progress
        FROM public.courses c
        JOIN public.enrollments e ON e.course_id = c.id
        WHERE c.status = 'published'
        GROUP BY c.id, c.title
        ORDER BY COUNT(e.id) DESC
        LIMIT 3
      ) t
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary() TO authenticated;
