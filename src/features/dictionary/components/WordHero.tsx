import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LevelTag } from '../../../lib/widgets';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { ResolvedLevel } from '../../../utils/lesson/levels';
import type { DBDictionaryEntry } from '../../../types/database';
import type { Flashcard } from '../../../data/flashcards';
import {
  ExtendedDefinitionsPanel,
  MoreDefinitionsToggle,
  StrokeOrderBox,
  SummaryQuickActions,
  useExtendedDefinitions,
} from '../../character-breakdown';

const HANZI_RE = /[㐀-鿿]/u;

/** Canvas size per character, shrinking with word length so the whole word stays on one row. */
function canvasSize(count: number, wide: boolean) {
  if (count <= 1) return wide ? 208 : 164;
  if (count === 2) return wide ? 144 : 112;
  if (count <= 4) return wide ? 100 : 76;
  return wide ? 72 : 56;
}

/**
 * The word hero: one stroke-order canvas per character, then pinyin, meaning
 * (with the extra definitions one tap away), lesson and level, audio and save.
 */
export function WordHero({
  word,
  accentHex,
  pinyin,
  meaning,
  entries,
  courseCard,
  level,
  primaryChar,
}: {
  word: string;
  accentHex?: string;
  pinyin: string;
  meaning?: string;
  entries: DBDictionaryEntry[];
  courseCard?: Flashcard;
  level: ResolvedLevel | null;
  primaryChar: string;
}) {
  const chars = Array.from(word);
  const wide = useMediaQuery('(min-width: 640px)');
  const size = canvasSize(chars.length, wide);
  const more = useExtendedDefinitions(undefined, entries);
  const [moreOpen, setMoreOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => setMoreOpen(false), [word]);
  const stacked = chars.length >= 3;

  return (
    <header className="min-w-0">
      <div className={stacked ? 'flex flex-col gap-4' : 'flex items-center gap-4 sm:gap-6'}>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 font-chinese text-ui-ink-strong">
          {chars.map((char, index) => (
            HANZI_RE.test(char) ? (
              <StrokeOrderBox
                key={index}
                char={char}
                size={size}
                accentHex={accentHex}
                className="shrink-0 border-2 border-b-[length:var(--depth-xl)] border-ui-divider bg-ui-surface"
              />
            ) : (
              <span key={index} className="text-3xl">{char}</span>
            )
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
          {pinyin && <span className="truncate text-[26px] font-black leading-tight text-brand-primary">{pinyin}</span>}
          {meaning && (
            <div className="flex min-w-0 items-start gap-1">
              <p className="line-clamp-2 min-w-0 max-w-2xl text-[22px] font-black leading-tight text-ui-ink-strong">{meaning}</p>
              {more?.hasExtra && (
                <MoreDefinitionsToggle
                  open={moreOpen}
                  onToggle={() => setMoreOpen((value) => !value)}
                  count={more.hasExtraDefinitions ? more.definitions.length - 1 : undefined}
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
            <div className="flex flex-wrap items-center gap-2">
              {courseCard && <LevelTag long bookId={courseCard.bookId} lessonId={courseCard.lessonId} />}
              <LevelTag variant="chip" level={level} />
            </div>
          )}
          <SummaryQuickActions
            className="-ml-2 mt-0.5 flex items-center gap-1"
            char={primaryChar}
            audioSrc={courseCard?.audio}
            pinyin={pinyin || undefined}
            meaning={meaning}
          />
        </div>
      </div>
    </header>
  );
}
