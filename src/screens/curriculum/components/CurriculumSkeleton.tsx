import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Skeleton } from '../../../lib/widgets';

/** Lessons arrive within a second or two; a longer wait means the server is waking from sleep. */
const WAKING_HINT_AFTER_MS = 5_000;

interface CurriculumSkeletonProps {
  hasStarterLesson?: boolean;
}

function LessonItemSkeleton({ index }: { index: number }) {
  const widthClasses = ['w-44', 'w-36', 'w-48', 'w-40'];
  const titleWidth = widthClasses[index % widthClasses.length];

  return (
    <div
      className="relative flex min-h-20 min-w-0 items-center mb-3 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 self-stretch rounded-[inherit] p-4 text-left">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <Skeleton className="h-14 w-14 rounded-feature" />
        </span>

        <span className="min-w-0 flex-1">
          <Skeleton className="mb-1 h-3 w-16" />
          <Skeleton className={`h-5 ${titleWidth}`} />
        </span>
      </div>
    </div>
  );
}

export function CurriculumSkeleton({ hasStarterLesson = false }: CurriculumSkeletonProps) {
  const [isWaking, setIsWaking] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIsWaking(true), WAKING_HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in duration-200" role="status" aria-label="Loading curriculum">
      <AnimatePresence initial={false}>
        {isWaking && (
          <motion.div
            key="waking"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full overflow-hidden"
          >
            <p className="pb-4 text-center text-sm font-bold text-ui-muted-strong">Waking up. This can take a minute.</p>
          </motion.div>
        )}
      </AnimatePresence>
      {hasStarterLesson && (
        <div className="mb-8 w-full max-w-[400px]">
          <div className="flex w-full items-center justify-between rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center">
                <Skeleton className="h-14 w-14 rounded-feature" />
              </div>
              <div>
                <Skeleton className="mb-1 h-3 w-20" />
                <Skeleton className="h-5 w-36" />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-2 h-8 w-1 rounded-full bg-ui-border" />
        </div>
      )}

      <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <LessonItemSkeleton key={`col1-${i}`} index={i} />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <LessonItemSkeleton key={`col2-${i}`} index={i + 4} />
          ))}
        </div>
      </div>
    </div>
  );
}
