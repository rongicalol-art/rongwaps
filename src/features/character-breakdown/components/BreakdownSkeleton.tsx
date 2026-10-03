import React from 'react';
import { Skeleton } from '../../../lib/widgets';

export const BreakdownSkeleton: React.FC = () => {
  return (
    <div
      className="w-full flex flex-col gap-6 lg:gap-10 animate-in fade-in duration-200"
      role="status"
      aria-label="Loading character breakdown"
    >
      {/* 1. Hero Summary Header matching V3CharacterSummary */}
      <header className="relative isolate min-w-0 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 p-4 sm:gap-7 sm:p-6 lg:gap-8">
          <Skeleton className="h-[112px] w-[112px] shrink-0 rounded-feature" />
          <div className="relative min-w-0 text-left">
            <Skeleton className="h-6 w-28 sm:w-36 mb-2" />
            <Skeleton className="h-5 w-4/5 max-w-md" />
            <Skeleton className="mt-2 h-3.5 w-16" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t-2 border-ui-divider px-4 py-3 sm:px-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        </div>

        {/* Extended Definitions */}
        <div className="border-t-2 border-ui-divider px-4 py-4 sm:px-6 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </header>

      {/* 2. 2-Column Section matching V3CharacterBreakdown */}
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,64fr)_minmax(19rem,36fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          {/* Component Tree Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-[74px] rounded-compact" />
              <Skeleton className="h-[74px] rounded-compact" />
            </div>
          </div>

          {/* Memory Hook Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Example Sentences Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex flex-col gap-2 pt-1">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t-2 border-ui-divider">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          </div>
        </div>

        {/* Right Sidebar on Desktop matching V3SupportingInformation */}
        <aside aria-label="Character context" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="mt-1 divide-y-2 divide-ui-divider">
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
};
