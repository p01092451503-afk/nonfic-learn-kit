
-- Daily time-series for sparkline charts on stat cards.
-- Returns the last 14 days (oldest first) for several KPIs in a single call.
CREATE OR REPLACE FUNCTION public.dashboard_sparklines(p_days int DEFAULT 14)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      (CURRENT_DATE - (p_days - 1))::date,
      CURRENT_DATE::date,
      '1 day'::interval
    )::date AS d
  ),
  signups AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  ),
  enrolls AS (
    SELECT (enrolled_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
    FROM public.enrollments
    WHERE enrolled_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  ),
  completions AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
    FROM public.enrollments
    WHERE completed_at IS NOT NULL
      AND completed_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  ),
  sessions AS (
    SELECT (login_at AT TIME ZONE 'UTC')::date AS d,
           COUNT(DISTINCT user_id) AS n
    FROM public.user_sessions
    WHERE login_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  ),
  pageviews AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
    FROM public.traffic_logs
    WHERE event_type = 'page_view'
      AND created_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  ),
  submissions AS (
    SELECT (submitted_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
    FROM public.assignment_submissions
    WHERE submitted_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  ),
  assessments AS (
    SELECT (started_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
    FROM public.assessment_attempts
    WHERE started_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'days',        (SELECT jsonb_agg(to_char(d, 'YYYY-MM-DD') ORDER BY d) FROM days),
    'signups',     (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN signups s USING (d)),
    'enrollments', (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN enrolls s USING (d)),
    'completions', (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN completions s USING (d)),
    'sessions',    (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN sessions s USING (d)),
    'pageviews',   (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN pageviews s USING (d)),
    'submissions', (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN submissions s USING (d)),
    'assessments', (SELECT jsonb_agg(COALESCE(s.n, 0) ORDER BY days.d) FROM days LEFT JOIN assessments s USING (d))
  );
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_sparklines(int) TO authenticated;
