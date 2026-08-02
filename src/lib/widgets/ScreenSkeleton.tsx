import type { ReactNode } from 'react';
import { ScreenLayout } from './ScreenLayout';
import { cn } from '../../utils/cn';

interface ScreenSkeletonProps {
  type?: 'flashcard' | 'quiz' | 'listening' | 'writing';
}

function Shimmer({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block rounded-full bg-ui-divider motion-safe:animate-pulse', className)}
    />
  );
}

function ChoiceRows() {
  return (
    <div className="grid w-full gap-3">
      {['w-[72%]', 'w-[54%]', 'w-[64%]'].map((widthClass, index) => (
        <div
          key={widthClass}
          className="flex min-h-14 items-center gap-4 rounded-[18px] border-b-4 border-ui-border bg-ui-surface px-4"
        >
          <Shimmer className="h-8 w-8 shrink-0 rounded-[10px]" />
          <Shimmer className={cn('h-4', widthClass)} />
          <span className="sr-only">Choice {index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function SkeletonFrame({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="absolute inset-0 flex h-full w-full select-none flex-col overflow-hidden bg-transparent pt-[72px]"
    >
      <span className="sr-only">Loading practice</span>
      {children}
    </div>
  );
}

export function ScreenSkeleton({ type = 'flashcard' }: ScreenSkeletonProps) {
  if (type === 'flashcard') {
    return (
      <SkeletonFrame>
        <ScreenLayout maxWidth="xl" className="flex h-full flex-col justify-center pb-[150px] pt-2">
          <div className="mx-auto flex h-[420px] max-h-[60vh] w-full max-w-[320px] flex-col items-center justify-center rounded-[32px] border-b-4 border-ui-border bg-ui-surface p-8 sm:h-[480px] sm:max-w-[400px] md:max-w-[460px]">
            <Shimmer className="h-28 w-28 rounded-[24px] sm:h-36 sm:w-36" />
            <Shimmer className="mt-auto h-4 w-32" />
          </div>
        </ScreenLayout>
      </SkeletonFrame>
    );
  }

  if (type === 'writing') {
    return (
      <SkeletonFrame>
        <ScreenLayout maxWidth="xl" className="flex flex-1 flex-col items-center justify-center pb-[150px]">
          <Shimmer className="mb-6 h-6 w-44" />
          <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-[32px] border-b-4 border-ui-border bg-ui-surface sm:max-w-[320px]">
            <Shimmer className="h-32 w-32 rounded-[24px]" />
          </div>
          <Shimmer className="mt-6 h-5 w-24" />
        </ScreenLayout>
      </SkeletonFrame>
    );
  }

  return (
    <SkeletonFrame>
      <ScreenLayout maxWidth="md" className="flex flex-1 flex-col justify-center gap-8 pb-[170px]">
        <div className="flex flex-col items-center gap-4">
          {type === 'listening' ? (
            <div className="flex h-[130px] w-[130px] items-center justify-center rounded-[36px] border-b-[8px] border-ui-border bg-ui-divider motion-safe:animate-pulse">
              <Shimmer className="h-14 w-14 rounded-[18px] bg-ui-muted/20" />
            </div>
          ) : (
            <>
              <Shimmer className="h-5 w-56" />
              <Shimmer className="h-24 w-28 rounded-[24px]" />
            </>
          )}
        </div>
        <ChoiceRows />
      </ScreenLayout>
    </SkeletonFrame>
  );
}
