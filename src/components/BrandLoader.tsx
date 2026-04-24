import { cn } from "@/lib/utils";

interface BrandLoaderProps {
  /** Render full viewport height (for route fallbacks) */
  fullscreen?: boolean;
  /** Optional sub-text under the logo */
  label?: string;
  className?: string;
}

/**
 * Brand-aligned skeleton loader.
 * Shows the NONFICTION wordmark with a shimmer sweep — replaces generic spinners
 * during route transitions and data loading states.
 */
export const BrandLoader = ({ fullscreen = false, label, className }: BrandLoaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullscreen ? "min-h-screen w-full bg-background" : "w-full py-12",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="brand-loader-wordmark select-none font-serif text-3xl sm:text-4xl font-semibold tracking-[0.2em] text-foreground/90"
        aria-label="NONFICTION 로딩 중"
      >
        NONFICTION
      </span>
      <div className="h-[2px] w-40 overflow-hidden rounded-full bg-muted">
        <div className="brand-loader-bar h-full w-1/3 rounded-full bg-foreground/70" />
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
};

export default BrandLoader;
