import { Skeleton } from '../../../lib/widgets';

export function WordDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6 animate-in fade-in duration-200" role="status" aria-label="Loading dictionary entry">
      <div className="flex items-center gap-4 sm:gap-6">
        <Skeleton className="h-[112px] w-[112px] shrink-0 rounded-feature sm:h-[144px] sm:w-[144px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-6 w-4/5 max-w-md" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[84px] rounded-control" />
        <Skeleton className="h-[84px] rounded-control" />
      </div>
      <Skeleton className="h-16 rounded-control" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-8 w-[4.5rem] shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
