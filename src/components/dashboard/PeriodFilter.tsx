import { cn } from "@/lib/utils";

export type Period = "7d" | "30d" | "all";

interface Props {
  value: Period;
  onChange: (p: Period) => void;
  className?: string;
  /** Optional override labels (e.g. localized) */
  labels?: Partial<Record<Period, string>>;
}

const DEFAULTS: Record<Period, string> = { "7d": "7d", "30d": "30d", all: "All" };

/** Compact 7d / 30d / All segmented control used to filter dashboard charts. */
export const PeriodFilter = ({ value, onChange, className, labels }: Props) => {
  const options: Period[] = ["7d", "30d", "all"];
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background p-0.5 text-[11px]",
        className,
      )}
      role="tablist"
      aria-label="Period filter"
    >
      {options.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p)}
            className={cn(
              "px-2.5 py-1 rounded-full transition-colors",
              active
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels?.[p] ?? DEFAULTS[p]}
          </button>
        );
      })}
    </div>
  );
};

export const periodToDays = (p: Period): number => (p === "7d" ? 7 : p === "30d" ? 30 : 365);

export default PeriodFilter;