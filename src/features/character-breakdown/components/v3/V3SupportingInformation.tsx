import type { ReactNode } from 'react';
import type { Flashcard } from '../../../../data/flashcards';
import type { SAMPLE_BOOKS } from '../../../../data/books';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { ReferenceRow, SectionEyebrow } from '../../../../lib/widgets';
import { useCharBreakdownState } from '../../../../hooks/useCharBreakdown';
import { CharacterGlyph } from '../breakdown/CharacterGlyph';
import type { UsedAsGroups } from '../../utils/rankParentCharacters';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

const SEE_ALL_CLASSES = 'min-h-9 shrink-0 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring';

const MAX_COURSE_ROWS = 4;
const MAX_OTHER_CHIPS = 10;

/**
 * True when there is any supporting reference content ("In words" or "Part of")
 * to show in the right-hand rail. Used to collapse the rail away when empty so
 * the left column can take the full width.
 */
export function hasSupportingInfo(relatedWords: Flashcard[], usedAsGroups: UsedAsGroups): boolean {
  return (
    relatedWords.length > 0 ||
    usedAsGroups.courseParents.length > 0 ||
    usedAsGroups.otherParents.length > 0
  );
}

/**
 * "Part of" row: cached character-breakdown metadata, same shared row anatomy
 * as word rows (`ReferenceRow` — see WIDGETS.md).
 */
function PartOfRow({ character, accentClassName, onClick, trailing }: {
  character: string;
  accentClassName: string;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  const { data, isLoading } = useCharBreakdownState(character);
  const pinyin = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : '';
  const gloss = data?.definition?.split(';')[0]?.trim() || '';
  return (
    <ReferenceRow
      glyph={character}
      accentClassName={accentClassName}
      loading={isLoading}
      primary={!isLoading && pinyin ? pinyin : undefined}
      secondary={!isLoading && gloss ? gloss : undefined}
      onClick={onClick}
      ariaLabel={`Open breakdown for ${character}`}
      trailing={trailing}
    />
  );
}

/** Compact tile for non-course characters — keeps the rail short. */
function OtherParentChip({ character, accentClassName, onClick }: {
  character: string;
  accentClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open breakdown for ${character}`}
      title={`Open breakdown for ${character}`}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-compact border border-ui-border bg-ui-surface shadow-[0_var(--depth-sm)_0_var(--color-ui-divider)] transition-[background-color,transform,box-shadow] hover:bg-ui-surface-hover active:translate-y-[length:var(--depth-sm)] active:shadow-none focus-ring ${accentClassName}`}
    >
      <CharacterGlyph character={character} className="font-chinese text-[20px] leading-none" />
    </button>
  );
}

export function V3SupportingInformation({ relatedWords, usedAsComponents, usedAsGroups, activeBook, setDictionaryWord, openUsedAsBreakdown, openRelatedBreakdown }: {
  relatedWords: Flashcard[];
  usedAsComponents: string[];
  usedAsGroups: UsedAsGroups;
  activeBook: CourseBook;
  setDictionaryWord: (word: string) => void;
  openUsedAsBreakdown: () => void;
  openRelatedBreakdown: () => void;
}) {
  const related = relatedWords.slice(0, 4);
  const courseRows = usedAsGroups.courseParents.slice(0, MAX_COURSE_ROWS);
  const otherChips = usedAsGroups.otherParents.slice(0, MAX_OTHER_CHIPS);
  const shownCount = courseRows.length + otherChips.length;

  if (!hasSupportingInfo(relatedWords, usedAsGroups)) return null;

  const hasPartOfCard = shownCount > 0;

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Supporting information">
      {related.length > 0 && (
        <div className="min-w-0 rounded-feature bg-ui-surface p-4 shadow-[0_var(--depth-md)_0_var(--color-ui-border)] sm:p-6">
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
            {related.map((card) => (
              <ReferenceRow
                key={card.id}
                glyph={card.front}
                accentClassName={activeBook.accent}
                primary={numberToToneMarks(card.pinyin)}
                secondary={card.back}
                onClick={() => setDictionaryWord(card.front)}
                ariaLabel={`Open ${card.front}`}
                trailing={card.source !== 'dictionary'
                  ? <span className="shrink-0 text-[9px] font-extrabold text-ui-muted">B{card.bookId} · L{card.lessonId}</span>
                  : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {hasPartOfCard && (
        <div className="min-w-0 rounded-feature bg-ui-surface p-4 shadow-[0_var(--depth-md)_0_var(--color-ui-border)] sm:p-6">
          <SectionEyebrow
            title="Part of"
            count={usedAsComponents.length}
            action={usedAsComponents.length > shownCount && (
              <button type="button" onClick={openUsedAsBreakdown} className={SEE_ALL_CLASSES}>
                See all
              </button>
            )}
          />

          {courseRows.length > 0 && (
            <div className="mt-1">
              {courseRows.map((entry) => (
                <PartOfRow
                  key={entry.character}
                  character={entry.character}
                  accentClassName={activeBook.accent}
                  onClick={() => setDictionaryWord(entry.character)}
                  trailing={<span className="shrink-0 text-[9px] font-extrabold text-ui-muted">B{entry.bookId} · L{entry.lessonId}</span>}
                />
              ))}
            </div>
          )}

          {otherChips.length > 0 && (
            <div className={courseRows.length > 0 ? 'mt-3' : 'mt-1'}>
              <div className="flex flex-wrap gap-2">
                {otherChips.map((item) => (
                  <OtherParentChip
                    key={item}
                    character={item}
                    accentClassName={activeBook.accent}
                    onClick={() => setDictionaryWord(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
