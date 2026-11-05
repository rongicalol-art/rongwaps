import type { Flashcard } from '../../../../data/flashcards';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { characterReadings } from '../../../../utils/pinyin/characterReadings';
import { LevelTag } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { officialLevel, resolveLevel } from '../../../../utils/lesson/levels';
import type { LevelIndex } from '../../../../utils/packValidators';
import type { EntryReading } from '../../../../utils/vocabulary/wordEntry';
import { BreakdownRow } from './BreakdownRow';
import { ShowMoreButton } from './ShowMoreButton';

const MAX_WORD_ROWS = 6;
/** Per reading when the list splits by reading (長 cháng / zhǎng). */
const MAX_ROWS_PER_READING = 4;

/** Which reading `char` has inside `card`'s word (長大 → zhang3), when its pinyin aligns. */
function readingIn(card: Flashcard, char: string): string | undefined {
  const aligned = characterReadings(card.front, card.pinyin, card.traditional);
  const index = aligned?.characters.indexOf(char) ?? -1;
  return index >= 0 ? aligned?.readings[index]?.[0] : undefined;
}

/** Course words and dictionary words a learner will meet; rare and technical ones wait behind "See all". */
function isProminent(card: Flashcard, levels: LevelIndex | null): boolean {
  return card.source !== 'dictionary' || officialLevel(resolveLevel(card.front, levels)) !== undefined;
}

/**
 * Words that contain the active character. When the character has more than
 * one reading in use, the words split under each reading ("Read cháng",
 * "Read zhǎng"), so the learner sees which words use which sound.
 */
export function V3WordsList({ relatedWords, activeChar, readings, setDictionaryWord, openRelatedBreakdown }: {
  relatedWords: Flashcard[];
  activeChar: string;
  readings?: readonly EntryReading[];
  setDictionaryWord: (word: string) => void;
  openRelatedBreakdown: () => void;
}) {
  const levels = useLevels();
  const prominent = relatedWords.filter((card) => isProminent(card, levels));
  const spoken = (readings ?? []).filter((reading) => !reading.reference);
  const byReading = new Map<string, Flashcard[]>();
  for (const card of prominent) {
    const key = readingIn(card, activeChar);
    const target = spoken.some((reading) => reading.key === key) ? key! : spoken[0]?.key ?? '';
    byReading.set(target, [...(byReading.get(target) ?? []), card]);
  }
  const groups = spoken.filter((reading) => byReading.has(reading.key));
  const split = groups.length > 1;
  const shownCount = split
    ? groups.reduce((sum, reading) => sum + Math.min(MAX_ROWS_PER_READING, byReading.get(reading.key)!.length), 0)
    : Math.min(MAX_WORD_ROWS, prominent.length);

  const row = (card: Flashcard) => (
    <BreakdownRow
      key={card.id}
      glyph={card.front}
      highlight={activeChar}
      pinyin={numberToToneMarks(card.pinyin)}
      meaning={card.back}
      onClick={() => setDictionaryWord(card.front)}
      ariaLabel={`Open ${card.front}`}
      trailing={card.source !== 'dictionary'
        ? <LevelTag bookId={card.bookId} lessonId={card.lessonId} />
        : <LevelTag level={resolveLevel(card.front, levels)} />}
    />
  );

  return (
    <div className="flex min-w-0 flex-col">
      {split
        ? groups.map((reading) => (
          <div key={reading.key} className="flex min-w-0 flex-col">
            <h3 className="px-1 pb-1 pt-3 text-sm font-black text-ui-muted-strong first:pt-1">
              Read <span className="text-brand-primary-text">{reading.pinyin}</span>
            </h3>
            {byReading.get(reading.key)!.slice(0, MAX_ROWS_PER_READING).map(row)}
          </div>
        ))
        : prominent.slice(0, MAX_WORD_ROWS).map(row)}
      {relatedWords.length > shownCount && (
        <ShowMoreButton label={`See all ${relatedWords.length}`} onClick={openRelatedBreakdown} />
      )}
    </div>
  );
}
