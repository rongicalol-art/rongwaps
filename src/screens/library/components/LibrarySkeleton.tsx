import { Skeleton } from '../../../lib/widgets';

export function LibrarySkeleton() {
  return (
    <div className="w-full pb-8 animate-in fade-in duration-200" role="status" aria-label="Loading library cards">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`skeleton-card-${i}`} className="group relative h-full select-none rounded-feature">
            <article className="relative flex h-full flex-col overflow-hidden rounded-feature bg-ui-surface border-b-[length:var(--depth-md)] border-ui-border">
              {/* Top-right bookmark/trash icon placeholder */}
              <div className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center">
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>

              {/* Centered card content */}
              <div className="pointer-events-none relative z-0 flex flex-1 flex-col items-center justify-center px-4 py-6">
                <Skeleton className="mb-3 h-10 w-14 rounded-feature" />
                <Skeleton className="mb-1 h-3 w-16" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
