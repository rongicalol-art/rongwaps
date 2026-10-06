import type { Flashcard } from '../../../../data/flashcards';
import type { SAMPLE_BOOKS } from '../../../../data/books';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { LevelTag, ReferenceRow, SectionEyebrow } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/levels';
import type { BuiltWithMember, RankedSoundFamily } from '../../utils/rankBuiltWith';
import { AppearsInCard } from './AppearsInCard';
import { SoundFamilyCard } from './SoundFamilyCard';
import { RAIL_CARD_CLASSES, SEE_ALL_CLASSES } from './railStyles';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

const MAX_WORD_ROWS = 4;

/**
 * True when there is any supporting reference content ("Sound family",
 * "Appears in" or "In words") to show in the right-hand rail. Used to collapse
 * the rail away when empty so the left column can take the full width.
 */
export function hasSupportingInfo(
  relatedWords: Flashcard[],
  builtWithMembers: readonly BuiltWithMember[],
  soundFamily: RankedSoundFamily | null,
): boolean {
  return relatedWords.length > 0 || builtWithMembers.length > 0 || soundFamily !== null;
}

export function V3SupportingInformation({
  relatedWords,
  builtWithMembers,
  soundFamily,
  activeChar,
  activeBook,
  setDictionaryWord,
  openRelatedBreakdown,
}: {
  relatedWords: Flashcard[];
  builtWithMembers: BuiltWithMember[];
  soundFamily: RankedSoundFamily | null;
  activeChar?: string;
  activeBook: CourseBook;
  setDictionaryWord: (word: string) => void;
  openRelatedBreakdown: () => void;
}) {
  const levels = useLevels();
  const related = relatedWords.slice(0, MAX_WORD_ROWS);

  if (!hasSupportingInfo(relatedWords, builtWithMembers, soundFamily)) return null;

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Supporting information">
      {activeChar && soundFamily && (
        <SoundFamilyCard
          key={`family:${activeChar}`}
          family={soundFamily}
          accentClassName={activeBook.accent}
          activeBookId={activeBook.id}
          onOpen={setDictionaryWord}
        />
      )}

      {activeChar && builtWithMembers.length > 0 && (
        <AppearsInCard key={`appears:${activeChar}`} members={builtWithMembers} accentClassName={activeBook.accent} activeBookId={activeBook.id} onOpen={setDictionaryWord} />
      )}

      {related.length > 0 && (
        <div className={RAIL_CARD_CLASSES}>
          <SectionEyebrow
            title="In words"
            count={relatedWords.length}
            action={relatedWords.length > related.length && (
              <button type="button" onClick={openRelatedBreakdown} className={SEE_ALL_CLASSES}>
                See all
              </button>
            )}
          />
          <div className="mt-1">
            {related.map((card) => {
              const isCourse = card.source !== 'dictionary';
              return (
                <ReferenceRow
                  key={card.id}
                  glyph={card.front}
                  accentClassName={activeBook.accent}
                  primary={numberToToneMarks(card.pinyin)}
                  secondary={card.back}
                  onClick={() => setDictionaryWord(card.front)}
                  ariaLabel={`Open ${card.front}`}
                  trailing={isCourse
                    ? <LevelTag bookId={card.bookId} lessonId={card.lessonId} />
                    : <LevelTag level={resolveLevel(card.front, levels)} />}
                />
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}
