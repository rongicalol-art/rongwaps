import type { ReactNode } from 'react';
import { ScreenLayout } from './ScreenLayout';
import { Skeleton } from './Skeleton';
import { cn } from '../../utils/cn';

interface ScreenSkeletonProps {
  type?: 'flashcard' | 'quiz' | 'listening' | 'writing';
}

function SkeletonFrame({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="absolute inset-0 flex h-full w-full select-none flex-col overflow-hidden bg-transparent pt-[72px] animate-in fade-in duration-200"
    >
      <span className="sr-only">Loading practice activity</span>
      {children}
    </div>
  );
}

function PracticeChoiceSkeletonRow({ index, widthClass }: { index: number; widthClass: string }) {
  return (
    <div className="relative flex w-full select-none items-center rounded-control border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-6 py-4">
      <span className="mr-4 w-8 shrink-0 text-sm font-bold text-ui-muted">
        {index + 1}
      </span>
      <span className="flex-1 text-left text-[19px] font-bold leading-tight">
        <Skeleton className={cn('h-5', widthClass)} />
      </span>
    </div>
  );
}

export function ScreenSkeleton({ type = 'flashcard' }: ScreenSkeletonProps) {
  if (type === 'flashcard') {
    return (
      <SkeletonFrame>
        <ScreenLayout maxWidth="none" className="relative flex h-full max-w-[760px] flex-col pb-dock-clearance pt-2 pointer-events-none">
          <div className="flex-1 flex flex-col justify-center pointer-events-none">
            <div className="relative z-10 mx-auto flex h-[clamp(420px,68vh,660px)] max-h-[calc(100dvh-180px)] w-full max-w-[720px] flex-col items-center justify-center pointer-events-none">
              <div className="relative mx-auto flex items-center justify-center w-[min(340px,calc(100vw-32px))] sm:w-[min(480px,calc(100vw-var(--workspace-nav-width,0px)-48px))] md:w-[min(540px,calc(100vw-var(--workspace-nav-width,0px)-48px))] lg:w-[min(620px,calc(100vw-var(--workspace-nav-width,0px)-64px))] max-w-[620px] h-[clamp(360px,48vh,420px)] sm:h-[clamp(420px,53vh,480px)] md:h-[clamp(450px,55vh,520px)] lg:h-[clamp(480px,58vh,560px)] select-none">
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 sm:p-8">
                    {/* Large character glyph placeholder */}
                    <div className="flex items-center justify-center gap-2">
                      <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-feature" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScreenLayout>
      </SkeletonFrame>
    );
  }

  if (type === 'quiz') {
    return (
      <SkeletonFrame>
        <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 sm:px-6 pb-[240px] overscroll-none overflow-y-auto">
          {/* Header Format Menu & Title */}
          <div className="mt-4 flex w-full items-center gap-2.5 px-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control">
              <Skeleton className="h-5 w-5 rounded-sm" />
            </div>
            <Skeleton className="h-6 w-44" />
          </div>

          {/* Question Prompt Area */}
          <div className="flex w-full items-center justify-center py-6 sm:py-8 mb-2 px-4">
            <Skeleton className="h-20 w-24 sm:h-24 sm:w-28 rounded-feature" />
          </div>

          {/* Exactly 3 Choices matching QuizChoices */}
          <div className="grid grid-cols-1 gap-3 w-full pb-4 px-2 sm:px-0">
            <PracticeChoiceSkeletonRow index={0} widthClass="w-[58%]" />
            <PracticeChoiceSkeletonRow index={1} widthClass="w-[46%]" />
            <PracticeChoiceSkeletonRow index={2} widthClass="w-[64%]" />
          </div>
        </div>
      </SkeletonFrame>
    );
  }

  if (type === 'listening') {
    return (
      <SkeletonFrame>
        <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 sm:px-6 pb-[240px] overscroll-none overflow-y-auto">
          {/* Header Format Menu & Title */}
          <div className="mt-4 flex w-full items-center gap-2.5 px-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control">
              <Skeleton className="h-5 w-5 rounded-sm" />
            </div>
            <Skeleton className="h-6 w-44" />
          </div>

          {/* Audio Button matching AudioControls */}
          <div className="relative mb-12 mt-6 flex items-center justify-center">
            <div className="relative flex h-[130px] w-[130px] items-center justify-center rounded-modal border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
          </div>

          {/* Exactly 3 Choices matching ListeningOptions */}
          <div className="flex flex-col gap-3 w-full">
            <PracticeChoiceSkeletonRow index={0} widthClass="w-[52%]" />
            <PracticeChoiceSkeletonRow index={1} widthClass="w-[66%]" />
            <PracticeChoiceSkeletonRow index={2} widthClass="w-[44%]" />
          </div>
        </div>
      </SkeletonFrame>
    );
  }

  // type === 'writing'
  return (
    <SkeletonFrame>
      <ScreenLayout maxWidth="xl" className="flex-1 justify-center items-center overflow-hidden overscroll-none px-2 sm:px-4 flex-col relative w-full pb-[90px] md:pb-[100px]">
        <div className="flex-1 flex flex-col items-center justify-center w-full gap-2 sm:gap-4 pb-2 pt-2">
          <div className="flex flex-col items-center w-full max-h-full">
            {/* Meaning Above */}
            <div className="w-full flex-shrink-0 flex flex-col items-center justify-center px-4 mb-3 sm:mb-6 mt-4 select-none">
              <Skeleton className="h-7 w-48 sm:w-56" />
            </div>

            {/* Canvas Box matching HanziCanvas */}
            <div className="relative mx-auto select-none w-[280px] h-[280px]">
              <div className="absolute inset-0 overflow-hidden rounded-feature bg-ui-surface border-0 border-b-[length:var(--depth-lg)] border-b-ui-border shadow-ambient-sm">
                {/* Background Grid Lines (Tiánzìgé format) */}
                <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex items-center justify-center opacity-30">
                  <div className="w-full h-[2px] border-t-2 border-dashed border-ui-muted" />
                  <div className="absolute h-full w-[2px] border-l-2 border-dashed border-ui-muted" />
                </div>
              </div>
            </div>

            {/* Bottom area of Canvas: Pinyin and indicator */}
            <div className="mt-4 sm:mt-6 flex flex-col items-center gap-3 h-[40px]">
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </ScreenLayout>
    </SkeletonFrame>
  );
}
