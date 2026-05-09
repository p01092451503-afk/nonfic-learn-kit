import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export interface TrendSeries {
  key: string;
  label: string;
  color: string; // hsl token like "hsl(var(--primary))"
}

interface Props {
  /** parallel arrays — days[i] aligns with each series value at index i */
  days: string[];
  series: Array<TrendSeries & { values: number[] }>;
  height?: number;
  className?: string;
}

/**
 * Multi-line area chart for dashboard trend visualization.
 * Designed for compact rendering within stat-card containers.
 */
export const MultiTrendChart = ({ days, series, height = 220, className }: Props) => {
  const data = days.map((d, i) => {
    const row: Record<string, any> = { date: d.slice(5) }; // MM-DD
    series.forEach((s) => {
      row[s.label] = s.values[i] ?? 0;
    });
    return row;
  });

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient id={`grad-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickMargin={6} minTickGap={20} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} width={28} stroke="hsl(var(--muted-foreground))" />
          <Tooltip cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }} content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.label}
              stroke={s.color}
              fill={`url(#grad-${s.key})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MultiTrendChart;