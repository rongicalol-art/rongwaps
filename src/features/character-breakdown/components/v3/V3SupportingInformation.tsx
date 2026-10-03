import { useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Flashcard } from '../../../../data/flashcards';
import type { SAMPLE_BOOKS } from '../../../../data/books';
import type { SoundHookEntry } from '../../../../services/contentPacks';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { ReferenceRow, SectionEyebrow } from '../../../../lib/widgets';
import { useCharBreakdownState } from '../../../../hooks/useCharBreakdown';
import { isPureVariantDefinition } from '../../../../utils/dictionaryDefinitions';
import type { UsedAsGroups } from '../../utils/rankParentCharacters';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

const SEE_ALL_CLASSES = 'min-h-9 shrink-0 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring';

const MAX_COURSE_ROWS = 4;

/**
 * True when there is any supporting reference content ("In words", "Part of", or "Sound family")
 * to show in the right-hand rail. Used to collapse the rail away when empty so
 * the left column can take the full width.
 */
export function hasSupportingInfo(
  relatedWords: Flashcard[],
  usedAsGroups: UsedAsGroups,
  soundFamily?: SoundHookEntry['family'],
): boolean {
  return (
    relatedWords.length > 0 ||
    usedAsGroups.courseParents.length > 0 ||
    usedAsGroups.otherParents.length > 0 ||
    Boolean(soundFamily && soundFamily.length > 0)
  );
}

/**
 * "Part of" row: cached character-breakdown metadata, same shared row anatomy
 * as word rows (`ReferenceRow` — see WIDGETS.md).
 * Automatically omits characters without definitions or pure variants.
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

  if (!isLoading && (!gloss || isPureVariantDefinition(gloss))) {
    return null;
  }

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

/**
 * Sound family row: shared reference row anatomy (ReferenceRow) displaying
 * the family character glyph, modern pinyin, and English gloss.
 */
function SoundFamilyRow({
  character,
  pinyin: initialPinyin,
  accentClassName,
  onClick,
  trailing,
}: {
  character: string;
  pinyin?: string;
  accentClassName: string;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  const { data, isLoading } = useCharBreakdownState(character);
  const pinyin = initialPinyin
    ? numberToToneMarks(initialPinyin)
    : (data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : '');
  const rawGloss = data?.definition?.split(';')[0]?.trim() || '';
  const gloss = isPureVariantDefinition(rawGloss) ? '' : rawGloss;

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

export function V3SupportingInformation({
  relatedWords,
  usedAsGroups,
  soundFamily,
  soundHook,
  activeChar,
  courseRank,
  activeBook,
  setDictionaryWord,
  openUsedAsBreakdown,
  openRelatedBreakdown,
}: {
  relatedWords: Flashcard[];
  usedAsComponents: string[];
  usedAsGroups: UsedAsGroups;
  soundFamily?: SoundHookEntry['family'];
  soundHook?: SoundHookEntry | null;
  activeChar?: string;
  courseRank?: Map<string, { bookId: number; lessonId: number }>;
  activeBook: CourseBook;
  setDictionaryWord: (word: string) => void;
  openUsedAsBreakdown: () => void;
  openRelatedBreakdown: () => void;
}) {
  const [showAllFamily, setShowAllFamily] = useState(false);

  useEffect(() => {
    setShowAllFamily(false);
  }, [soundFamily]);

  const related = relatedWords.slice(0, 4);
  const familyList = useMemo(() => soundFamily ?? [], [soundFamily]);
  const visibleFamily = showAllFamily ? familyList : familyList.slice(0, MAX_COURSE_ROWS);

  // Exclude characters already presented in Sound Family from "Part of"
  // so learners never see the same phonetic relatives duplicated across two cards.
  const familyCharSet = useMemo(() => new Set(familyList.map((m) => m.character)), [familyList]);

  const filteredCourseParents = useMemo(() => {
    if (familyCharSet.size === 0) return usedAsGroups.courseParents;
    return usedAsGroups.courseParents.filter((entry) => !familyCharSet.has(entry.character));
  }, [usedAsGroups.courseParents, familyCharSet]);

  const filteredOtherParents = useMemo(() => {
    if (familyCharSet.size === 0) return usedAsGroups.otherParents;
    return usedAsGroups.otherParents.filter((char) => !familyCharSet.has(char));
  }, [usedAsGroups.otherParents, familyCharSet]);

  const totalFilteredCount = filteredCourseParents.length + filteredOtherParents.length;
  const courseRows = filteredCourseParents.slice(0, MAX_COURSE_ROWS);
  const otherRows = filteredOtherParents.slice(0, Math.max(0, MAX_COURSE_ROWS - courseRows.length));
  const shownCount = courseRows.length + otherRows.length;

  if (!hasSupportingInfo(relatedWords, usedAsGroups, soundFamily)) return null;

  const hasPartOfCard = shownCount > 0;

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Supporting information">
      {related.length > 0 && (
        <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
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

      {familyList.length > 0 && (
        <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
          <SectionEyebrow
            title="Sound family"
            count={familyList.length}
            action={familyList.length > MAX_COURSE_ROWS && (
              <button
                type="button"
                onClick={() => setShowAllFamily((prev) => !prev)}
                className={SEE_ALL_CLASSES}
              >
                {showAllFamily ? 'Show less' : 'See all'}
              </button>
            )}
          />
          <p className="mt-0.5 text-xs font-semibold text-ui-muted">
            {soundHook?.phonetic?.glyph && activeChar && soundHook.phonetic.glyph !== activeChar ? (
              <>
                Shares sound component <span className="font-chinese font-bold text-ui-ink">{soundHook.phonetic.glyph}</span> ({soundHook.phonetic.reading})
              </>
            ) : (
              <>Characters sharing this phonetic root</>
            )}
          </p>
          <div className="mt-2">
            {visibleFamily.map((member) => {
              const rank = courseRank?.get(member.character);
              return (
                <SoundFamilyRow
                  key={member.character}
                  character={member.character}
                  pinyin={member.pinyin}
                  accentClassName={activeBook.accent}
                  onClick={() => setDictionaryWord(member.character)}
                  trailing={rank ? (
                    <span className="shrink-0 text-[9px] font-extrabold text-ui-muted">
                      B{rank.bookId} · L{rank.lessonId}
                    </span>
                  ) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {hasPartOfCard && (
        <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
          <SectionEyebrow
            title="Part of"
            count={totalFilteredCount}
            action={totalFilteredCount > shownCount && (
              <button type="button" onClick={openUsedAsBreakdown} className={SEE_ALL_CLASSES}>
                See all
              </button>
            )}
          />

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
            {otherRows.map((char) => (
              <PartOfRow
                key={char}
                character={char}
                accentClassName={activeBook.accent}
                onClick={() => setDictionaryWord(char)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
