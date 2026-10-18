import { Skeleton } from '../../../lib/widgets';

export function ProfileSkeleton() {
  return <div className="grid w-full gap-7" role="status" aria-label="Loading profile">
    <Skeleton className="h-[120px] w-full rounded-feature lg:h-40" />
    <div className="flex items-center gap-4 px-4">
      <Skeleton className="h-[88px] w-[88px] shrink-0 rounded-full lg:h-28 lg:w-28" />
      <div className="grid flex-1 gap-2"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-full" /></div>
    </div>
    <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-control" />)}</div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-40 rounded-control" />)}</div>
  </div>;
}
