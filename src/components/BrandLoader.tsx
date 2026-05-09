import { cn } from "@/lib/utils";
import MetamLogo from "@/components/MetamLogo";

interface BrandLoaderProps {
  /** Render full viewport height (for route fallbacks) */
  fullscreen?: boolean;
  /** Optional sub-text under the logo */
  label?: string;
  className?: string;
}

/**
 * Brand-aligned skeleton loader.
 * Shows the METAM wordmark with a shimmer sweep — replaces generic spinners
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
      <span className="brand-loader-wordmark inline-flex items-center" aria-label="METAM 로딩 중">
        <MetamLogo className="h-8 sm:h-10 w-auto text-foreground/80" />
      </span>
      <div className="h-[2px] w-40 overflow-hidden rounded-full bg-muted">
        <div className="brand-loader-bar h-full w-1/3 rounded-full bg-foreground/70" />
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
};

export default BrandLoader;
