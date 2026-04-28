import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SparklineSeries = {
  days: string[];
  signups: number[];
  enrollments: number[];
  completions: number[];
  sessions: number[];
  pageviews: number[];
  submissions: number[];
  assessments: number[];
};

const EMPTY: SparklineSeries = {
  days: [],
  signups: [],
  enrollments: [],
  completions: [],
  sessions: [],
  pageviews: [],
  submissions: [],
  assessments: [],
};

/**
 * Fetches the last N days of dashboard time-series in a single RPC call.
 * Cached aggressively (5 min stale) — same payload powers many stat cards.
 */
export const useDashboardSparklines = (days = 14) => {
  return useQuery({
    queryKey: ["dashboard-sparklines", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_sparklines", { p_days: days });
      if (error) {
        console.error("Dashboard sparkline load failed:", error);
        return EMPTY;
      }
      return normalizeSparklineSeries(data);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item) || 0);
};

const normalizeSparklineSeries = (value: unknown): SparklineSeries => {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    days: Array.isArray(row.days) ? row.days.map(String) : [],
    signups: toNumberArray(row.signups),
    enrollments: toNumberArray(row.enrollments),
    completions: toNumberArray(row.completions),
    sessions: toNumberArray(row.sessions),
    pageviews: toNumberArray(row.pageviews),
    submissions: toNumberArray(row.submissions),
    assessments: toNumberArray(row.assessments),
  };
};

/**
 * Computes a percentage delta between the most recent value and the prior period.
 * Returns null when there isn't enough data to compute a meaningful delta.
 */
export const computeDelta = (series: number[] | undefined): number | null => {
  if (!series || series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  const recent = series.slice(half).reduce((a, b) => a + b, 0);
  if (prev === 0 && recent === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((recent - prev) / prev) * 100);
};