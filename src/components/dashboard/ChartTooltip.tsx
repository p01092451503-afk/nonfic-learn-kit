import type { TooltipProps } from "recharts";

/**
 * Unified, branded tooltip for all dashboard charts.
 * Visual: clean white card, subtle shadow, accent left bar, color dots per series.
 * Use as: <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
 */
export interface ChartTooltipProps extends TooltipProps<any, any> {
  /** Optional value formatter (e.g. (v) => `${v}%`) */
  valueFormatter?: (value: number | string, name?: string) => string;
  /** Optional label override formatter */
  labelFormatter?: (label: string) => string;
  /** Optional unit suffix appended to numeric values */
  unit?: string;
}

export const ChartTooltip = ({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  unit,
}: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const formatVal = (v: any, name?: string) => {
    if (valueFormatter) return valueFormatter(v, name);
    if (typeof v === "number") {
      const n = Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1);
      return unit ? `${n}${unit}` : n;
    }
    return String(v ?? "");
  };

  const displayLabel = label != null ? (labelFormatter ? labelFormatter(String(label)) : String(label)) : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/80 bg-background shadow-lg min-w-[140px]">
      <div className="px-3 py-2">
        {displayLabel && (
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {displayLabel}
          </div>
        )}
        <ul className="space-y-1">
          {payload.map((entry: any, idx: number) => {
            const color = entry.color || entry.payload?.fill || entry.fill || "hsl(var(--foreground))";
            const name = entry.name ?? entry.dataKey;
            return (
              <li key={idx} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate max-w-[140px]">{name}</span>
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatVal(entry.value, name)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ChartTooltip;