import { cn } from "@/lib/utils";

interface RankBarProps {
  /** 0-100 percentage of bar fill */
  value: number;
  /** Bar height in tailwind utility (e.g. "h-2") */
  className?: string;
}

/**
 * Horizontal ranking bar with a left-light → right-dark charcoal gradient.
 * Use for TOP-N ranking visualizations across admin/teacher/student pages.
 */
export const RankBar = ({ value, className }: RankBarProps) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        "h-2",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-foreground/20 via-foreground/60 to-foreground transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default RankBar;