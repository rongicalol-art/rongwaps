import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { ResolvedLevel } from '../../../utils/lesson/levels';
import type { DBDictionaryEntry } from '../../../types/database';
import type { Flashcard } from '../../../data/flashcards';
import { HeroDetails, StrokeOrderBox, SummaryQuickActions, useExtendedDefinitions } from '../../character-breakdown';

const HANZI_RE = /[㐀-鿿]/u;

/** Canvas size per character, shrinking with word length so the whole word stays on one row. */
function canvasSize(count: number, wide: boolean) {
  if (count <= 1) return wide ? 208 : 164;
  if (count === 2) return wide ? 144 : 64;
  if (count <= 4) return wide ? 100 : 68;
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
  const actions = { char: primaryChar, pinyin: pinyin || undefined, meaning, ttsText: word };
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

        <div className="flex min-w-0 max-w-full flex-1 flex-col items-start gap-1.5 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            {pinyin && <span className="truncate text-2xl font-black leading-tight text-brand-primary-text sm:text-[26px]">{pinyin}</span>}
            {!wide && (
              <SummaryQuickActions className="ml-0.5 flex items-center [&>button]:h-8 [&>button]:w-8" {...actions} />
            )}
          </div>
          <HeroDetails subject={word} meaning={meaning} more={more} wide={wide} courseCard={courseCard} level={level} actions={actions} />
        </div>
      </div>
    </header>
  );
}
