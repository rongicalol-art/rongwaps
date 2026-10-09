import type { Flashcard } from '../../../../data/flashcards';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { LevelTag } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { BreakdownRow } from './BreakdownRow';
import { ShowMoreButton } from './ShowMoreButton';

const MAX_WORD_ROWS = 6;

/** Words that contain the active character. */
export function V3WordsList({ relatedWords, activeChar, setDictionaryWord, openRelatedBreakdown }: {
  relatedWords: Flashcard[];
  activeChar: string;
  setDictionaryWord: (word: string) => void;
  openRelatedBreakdown: () => void;
}) {
  const levels = useLevels();
  const shown = relatedWords.slice(0, MAX_WORD_ROWS);
  return (
    <div className="flex min-w-0 flex-col">
      {shown.map((card) => (
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
      ))}
      {relatedWords.length > shown.length && (
        <ShowMoreButton label={`See all ${relatedWords.length}`} onClick={openRelatedBreakdown} />
      )}
    </div>
  );
}
