import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Number of large content blocks to render */
  blocks?: number;
  /** Show a header bar (title + subtitle) */
  header?: boolean;
  className?: string;
}

/**
 * Generic page-level skeleton used inside dashboards while data is loading.
 * Mirrors the typical header + cards/list layout used across admin & student pages.
 */
export const PageSkeleton = ({ blocks = 3, header = true, className }: PageSkeletonProps) => {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-live="polite">
      {header && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: blocks }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default PageSkeleton;
