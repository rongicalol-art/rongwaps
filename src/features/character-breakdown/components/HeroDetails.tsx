import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LevelTag } from '../../../lib/widgets';
import type { ResolvedLevel } from '../../../utils/lesson/levels';
import { ExtendedDefinitionsPanel, MoreDefinitionsToggle, type ExtendedDefinitionsData } from './ExtendedDefinitions';
import { SummaryQuickActions } from './SummaryQuickActions';

export interface HeroActions {
  char: string;
  pinyin?: string;
  meaning?: string;
  ttsText?: string;
}

interface HeroDetailsProps {
  /** What the hero shows; a new one closes the extra definitions. */
  subject: string;
  meaning?: string;
  more: ExtendedDefinitionsData | null;
  wide: boolean;
  courseCard?: { bookId: number; lessonId: number };
  level: ResolvedLevel | null;
  /** Audio and Save; on wide screens they sit under the tags. */
  actions: HeroActions;
}

/** A word or character hero's meaning (extra definitions one tap away), lesson and level tags, and wide-screen actions. */
export function HeroDetails({ subject, meaning, more, wide, courseCard, level, actions }: HeroDetailsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => setMoreOpen(false), [subject]);

  return (
    <>
      {meaning && (
        <div className="flex min-w-0 items-start gap-0.5 sm:gap-1">
          <p className="line-clamp-3 min-w-0 max-w-2xl text-pretty text-[18px] font-black leading-snug text-ui-ink-strong sm:line-clamp-2 sm:text-[22px] sm:leading-tight">{meaning}</p>
          {more?.hasExtra && (
            <MoreDefinitionsToggle
              open={moreOpen}
              onToggle={() => setMoreOpen((value) => !value)}
              count={wide && more.hasExtraDefinitions ? more.definitions.length - 1 : undefined}
            />
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {moreOpen && more && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <ExtendedDefinitionsPanel data={more} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {(courseCard || level) && (
        <div className={wide ? 'flex flex-wrap items-center gap-2' : 'flex flex-wrap items-center gap-1.5'}>
          {courseCard && <LevelTag long={wide} bookId={courseCard.bookId} lessonId={courseCard.lessonId} />}
          <LevelTag variant="chip" level={level} />
        </div>
      )}
      {wide && <SummaryQuickActions className="-ml-2 mt-0.5 flex items-center gap-1" {...actions} />}
    </>
  );
}
