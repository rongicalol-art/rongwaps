import { Skeleton } from '../../../lib/widgets';

export function WordDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in duration-200" role="status" aria-label="Loading dictionary entry">
      {/* 1. Header Card Skeleton */}
      <header className="relative isolate min-w-0 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 sm:gap-7 sm:p-6">
          <Skeleton className="h-16 w-20 sm:h-20 sm:w-28 rounded-feature shrink-0" />
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-6 w-28 sm:w-36" />
            <Skeleton className="h-5 w-4/5 max-w-md" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="border-t border-ui-divider/70 px-4 py-3 sm:px-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        </div>

        {/* Extended Definitions Skeleton */}
        <div className="border-t border-ui-divider/70 px-4 py-4 sm:px-6 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </header>

      {/* 2-Column Section Matching Loaded Layout */}
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,64fr)_minmax(19rem,36fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          {/* 2. Decomposition Strip Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-3">
              <Skeleton className="h-14 w-14 rounded-compact shrink-0" />
              <Skeleton className="h-14 w-14 rounded-compact shrink-0" />
            </div>
          </div>

          {/* 3. Memory Hook Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* 4. Example Sentences Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex flex-col gap-2 pt-1">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-ui-divider/50">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          </div>
        </div>

        {/* Right Sidebar on Desktop (Supporting info: Characters & Related Words) */}
        <aside aria-label="Word context" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          {/* Characters Card Skeleton */}
          <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <div className="mt-1 divide-y divide-ui-divider/40">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 py-3">
                  <Skeleton className="h-10 w-10 rounded-compact shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related Words Card Skeleton */}
          <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="mt-1 divide-y divide-ui-divider/40">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 py-3">
                  <Skeleton className="h-10 w-10 rounded-compact shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3.5 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
