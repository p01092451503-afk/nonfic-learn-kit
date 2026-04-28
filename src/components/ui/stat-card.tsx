import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import Sparkline from "./sparkline";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<Tone, { text: string; bg: string; chart: string }> = {
  primary: { text: "text-primary", bg: "bg-primary/10", chart: "hsl(var(--primary))" },
  success: { text: "text-chart-2", bg: "bg-chart-2/10", chart: "hsl(var(--chart-2))" },
  warning: { text: "text-chart-4", bg: "bg-chart-4/10", chart: "hsl(var(--chart-4))" },
  danger:  { text: "text-destructive", bg: "bg-destructive/10", chart: "hsl(var(--destructive))" },
  info:    { text: "text-chart-3", bg: "bg-chart-3/10", chart: "hsl(var(--chart-3))" },
  neutral: { text: "text-foreground", bg: "bg-muted", chart: "hsl(var(--muted-foreground))" },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** Sparkline time-series (oldest -> newest) */
  trend?: number[];
  /** Percent delta vs. prior period; positive = up, negative = down */
  delta?: number | null;
  /** When true, downward delta is rendered as positive sentiment (e.g. "errors fell -30%") */
  invertDelta?: boolean;
  /** Hint shown beneath the value (e.g. "vs last 7 days") */
  hint?: string;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const formatDelta = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

/**
 * Unified visualization-rich stat card.
 * Combines: large value · icon chip · sparkline trend · period-over-period delta.
 */
export const StatCard = ({
  label,
  value,
  unit,
  icon: Icon,
  tone = "primary",
  trend,
  delta,
  invertDelta = false,
  hint,
  badge,
  onClick,
  className,
}: StatCardProps) => {
  const t = TONE[tone];
  const interactive = !!onClick;

  let deltaSentiment: "up" | "down" | "flat" | null = null;
  if (delta !== null && delta !== undefined) {
    if (delta > 0) deltaSentiment = invertDelta ? "down" : "up";
    else if (delta < 0) deltaSentiment = invertDelta ? "up" : "down";
    else deltaSentiment = "flat";
  }

  const deltaColor =
    deltaSentiment === "up"
      ? "text-chart-2"
      : deltaSentiment === "down"
      ? "text-destructive"
      : "text-muted-foreground";

  const DeltaIcon =
    deltaSentiment === "up" ? TrendingUp : deltaSentiment === "down" ? TrendingDown : Minus;

  const Wrapper: any = interactive ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "stat-card !p-4 sm:!p-5 text-left flex flex-col gap-3 min-w-0",
        interactive && "cursor-pointer hover:border-primary/30 transition-colors group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className={cn("rounded-lg p-2 shrink-0", t.bg)}>
              <Icon className={cn("h-4 w-4", t.text)} />
            </span>
          )}
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{label}</p>
        </div>
        {badge}
      </div>

      <div className="flex items-end justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">
              {value}
            </span>
            {unit && (
              <span className="text-xs text-muted-foreground">{unit}</span>
            )}
          </div>
          {(deltaSentiment || hint) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {deltaSentiment && (
                <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", deltaColor)}>
                  <DeltaIcon className="h-3 w-3" />
                  {formatDelta(delta as number)}
                </span>
              )}
              {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        {trend && trend.length > 1 && (
          <div className="w-20 sm:w-24 shrink-0">
            <Sparkline data={trend} color={t.chart} />
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default StatCard;