import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-level skeleton shown while a lazy page chunk is loading.
 * Mimics the standard layout: header (title + subtitle), stat cards row,
 * and a content block. Kept layout-only — no animations beyond pulse.
 */
const RouteSkeleton = () => (
  <div className="min-h-screen w-full bg-background">
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-48 sm:h-8 sm:w-64" />
        <Skeleton className="h-4 w-72 sm:w-96" />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border/60 pb-3 last:border-0"
            >
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default RouteSkeleton;