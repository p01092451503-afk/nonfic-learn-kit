import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
}

/** Minimal vertical bar chart, used for weekly activity-style visualizations. */
export const MiniBarChart = ({ data, height = 140, color = "hsl(var(--primary))", highlightLast = true }: Props) => {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={highlightLast && i === data.length - 1 ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniBarChart;