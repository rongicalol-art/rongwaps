import type { Flashcard } from '../../../../data/flashcards';
import type { DBCharacterBreakdown } from '../../../../types/database';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { CharacterHeroPanel } from './CharacterHeroPanel';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ExtendedDefinitionsPanel, MoreDefinitionsToggle, useExtendedDefinitions } from '../ExtendedDefinitions';
import { SummaryQuickActions } from '../SummaryQuickActions';
import { useCharDictionaryEntry } from '../../hooks/useCharDictionaryEntry';
import {
  sanitizeDictionaryDefinitions,
  isPureVariantDefinition,
  extractCedictReference,
} from '../../../../utils/vocabulary/dictionaryDefinitions';
import { useAppStore } from '../../../../store/useAppStore';
import { LevelTag } from '../../../../lib/widgets';
import { usePrimaryReading, useReadings } from '../../../../hooks/usePronunciation';
import { useLevel } from '../../../../hooks/useLevels';

export function V3CharacterSummary({
  character,
  data,
  courseCards,
  accentHex,
}: {
  character: string;
  data: DBCharacterBreakdown | null;
  courseCards: Flashcard[];
  accentHex?: string;
}) {
  const isReferenceDefinition = Boolean(
    data?.definition &&
    (isPureVariantDefinition(data.definition) || extractCedictReference(data.definition)),
  );
  const dictEntries = useCharDictionaryEntry((!data?.definition || isReferenceDefinition) ? character : undefined);
  const dictEntry = dictEntries[0];
  const courseCard = courseCards[0];
  const pinyin = usePrimaryReading(character, data?.pinyin?.[0] || courseCard?.pinyin || dictEntry?.pinyin?.[0]);
  // Other readings, pinyin only (誰 also shuí; 大 also dài).
  const otherReadings = useReadings(character).slice(1, 4);
  const dictDef = Array.isArray(dictEntry?.definitions)
    ? dictEntry.definitions[0]
    : typeof dictEntry?.definitions === 'string'
      ? dictEntry.definitions
      : undefined;

  const rawMeaning = (isReferenceDefinition && dictDef)
    ? dictDef
    : (data?.definition || courseCard?.back || dictDef);

  const characterPreference = useAppStore((state) => state.characterPreference);
  const level = useLevel(character);
  const meaning = rawMeaning
    ? sanitizeDictionaryDefinitions(rawMeaning, { preferredScript: characterPreference }).definitions[0] || rawMeaning
    : undefined;

  const more = useExtendedDefinitions(character);
  const [moreOpen, setMoreOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => setMoreOpen(false), [character]);

  return (
    <header className="min-w-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:gap-6">
        <CharacterHeroPanel character={character} accentHex={accentHex} />
        <div className="flex min-w-0 flex-col gap-1.5 text-left">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {pinyin && <span className="truncate text-[26px] font-black leading-tight text-brand-primary">{numberToToneMarks(pinyin)}</span>}
            {otherReadings.length > 0 && (
              <span className="text-xs font-bold text-ui-muted sm:text-sm">
                also{' '}
                {otherReadings.map((reading, index) => (
                  <span key={reading.pinyin}>
                    {index > 0 && ' · '}
                    <span className="text-brand-primary">{reading.pinyin}</span>
                  </span>
                ))}
              </span>
            )}
          </div>
          {meaning && (
            <div className="flex min-w-0 items-start gap-1">
              <p className="line-clamp-2 min-w-0 max-w-2xl text-[22px] font-black leading-tight text-ui-ink-strong">{meaning}</p>
              {more?.hasExtra && <MoreDefinitionsToggle open={moreOpen} onToggle={() => setMoreOpen((value) => !value)} count={more.hasExtraDefinitions ? more.definitions.length - 1 : undefined} />}
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
            char={character}
            audioSrc={data?.audio ?? undefined}
            pinyin={pinyin ? numberToToneMarks(pinyin) : undefined}
            meaning={meaning}
          />
        </div>
      </div>
    </header>
  );
}
