import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutSlice[];
  size?: number;
  centerValue?: string | number;
  centerLabel?: string;
}

export const DonutChart = ({ data, size = 180, centerValue, centerLabel }: Props) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;
  const slices = empty ? [{ label: "—", value: 1, color: "hsl(var(--muted))" }] : data;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="65%"
              outerRadius="100%"
              paddingAngle={empty ? 0 : 2}
              stroke="none"
            >
              {slices.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            {!empty && (
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {(centerValue !== undefined || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue !== undefined && (
              <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{centerValue}</span>
            )}
            {centerLabel && <span className="text-[11px] text-muted-foreground mt-1">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="space-y-2 text-sm min-w-0 flex-1">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.label} className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-muted-foreground truncate flex-1">{d.label}</span>
              <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
              <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DonutChart;