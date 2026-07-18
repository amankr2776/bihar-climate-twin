import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared full-page skeleton used across compound / prediction / map / reports
 * / alerts so every route displays the same "waiting for climate state"
 * treatment while `useCurrentState()` resolves.
 */
export function PageSkeleton({ label = "Loading data…" }: { label?: string } = {}) {
  return (
    <div aria-busy="true" aria-label={label} className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-panel p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-panel p-4 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-[320px] w-full" />
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-panel p-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

import { Skeleton as _Skeleton } from "@/components/ui/skeleton";
void _Skeleton;


export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-panel p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-3 h-8 w-full" />
          </div>
        ))}
      </div>

      {/* Map + right column */}
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 xl:col-span-9">
          <div className="rounded-xl border border-border bg-panel">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="relative h-[540px] overflow-hidden">
              <Skeleton className="absolute inset-0 rounded-none" />
            </div>
          </div>
        </section>
        <section className="col-span-12 space-y-4 xl:col-span-3">
          <div className="rounded-xl border border-border bg-panel p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-40 w-full" />
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </section>

        {/* Second + third rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <section key={i} className="col-span-12 xl:col-span-6">
            <div className="rounded-xl border border-border bg-panel p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-[240px] w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function MapTransitionOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      aria-busy="true"
      aria-label="Recalculating risk"
      className="pointer-events-auto absolute inset-0 z-[600] flex items-center justify-center bg-background/45 backdrop-blur-[2px]"
    >
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel/90 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Recalculating risk…
      </div>
    </div>
  );
}
