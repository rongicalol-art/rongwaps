import React from 'react';

export function LibrarySkeleton() {
  return (
    <div className="w-full pb-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`skeleton-card-${i}`}
            className="flex h-[150px] flex-col items-center justify-center gap-2.5 rounded-[24px] bg-ui-surface px-4"
          >
            <div className="h-10 w-14 rounded-md bg-ui-hover animate-pulse" />
            <div className="h-3 w-16 rounded-md bg-ui-hover animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-ui-hover animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
