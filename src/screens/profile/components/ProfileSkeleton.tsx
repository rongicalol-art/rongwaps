import { Skeleton } from '../../../lib/widgets';

export function ProfileSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in duration-200" role="status" aria-label="Loading profile">
      {/* Profile Hero Card Skeleton */}
      <section className="relative w-full rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
            {/* Avatar Circle */}
            <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex flex-col gap-1.5">
              <Skeleton className="h-5 w-32 sm:w-40" />
              <Skeleton className="h-3.5 w-24 sm:w-28" />
            </div>
          </div>
          {/* Action button */}
          <Skeleton className="h-9 w-20 sm:w-24 shrink-0 rounded-control" />
        </div>
      </section>

      {/* Review Hub Card Skeleton */}
      <section className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 rounded-control" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="mt-5 flex items-baseline gap-2.5">
          <Skeleton className="h-10 w-16 sm:h-12 sm:w-20" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <Skeleton className="h-3.5 w-full rounded-full" />
          <div className="mt-3 flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Start Review Button */}
        <div className="mt-6">
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
      </section>

      {/* Learning Stats Grid Skeleton (2x2 grid matching LearningStatsGrid) */}
      <section>
        <div className="mb-2.5 sm:mb-3">
          <Skeleton className="h-3.5 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex min-w-0 items-center gap-3 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4"
            >
              <Skeleton className="h-8 w-8 rounded-control shrink-0" />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <Skeleton className="h-6 w-12 sm:w-16" />
                <Skeleton className="h-3 w-16 sm:w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
