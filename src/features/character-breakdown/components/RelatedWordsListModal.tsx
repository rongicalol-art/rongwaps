import React from 'react';
import { EmptyState, LevelTag, ReferenceRow, SectionEyebrow, DetailShell } from '../../../lib/widgets';
import { RAIL_CARD_CLASSES } from './v3/railStyles';
import { groupWordsByBook } from '../../../utils/vocabulary/wordOrdering';
import { useLevels } from '../../../hooks/useLevels';
import { resolveLevel } from '../../../utils/lesson/levels';
import { useAppStore } from '../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../data/books';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import type { Flashcard } from '../../../data/flashcards';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface RelatedWordsListModalProps {
  initialChar: string;
  relatedWords: Flashcard[];
  activeBook: CourseBook;
  onClose: () => void;
  onWordClick?: (w: string) => void;
}

export function RelatedWordsListModal({ initialChar, relatedWords, activeBook, onClose, onWordClick }: RelatedWordsListModalProps) {
  const levels = useLevels();
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const groups = React.useMemo(
    () => groupWordsByBook(relatedWords, { activeBookId: activeBook.id, levels }),
    [relatedWords, activeBook.id, levels],
  );

  return (
    <DetailShell
      ariaLabel={`Words related to ${initialChar}`}
      title={`Related to “${initialChar}”`}
      onClose={onClose}
      maxWidthClassName="max-w-[900px]"
      contentInnerClassName="flex flex-col gap-4 pb-24"
    >
      {groups.length === 0 ? (
        <EmptyState icon="search" title="No related words found" compact />
      ) : (
        groups.map((group) => {
          const bookInfo = SAMPLE_BOOKS.find((b) => b.id === group.bookId);
          const bookTitle = group.bookId === 0 ? 'Dictionary' : bookInfo ? bookInfo.title : `Book ${group.bookId}`;
          const isCourse = group.bookId > 0;

          return (
            <section key={group.bookId} className={RAIL_CARD_CLASSES}>
              <SectionEyebrow
                title={bookTitle}
                action={
                  <span className="text-xs font-bold text-ui-muted">
                    {group.cards.length} {group.cards.length === 1 ? 'word' : 'words'}
                  </span>
                }
              />
              <div className="mt-1">
                {group.cards.map((card, idx) => (
                  <ReferenceRow
                    key={card.id || idx}
                    glyph={card.front}
                    accentClassName={activeBook.accent}
                    primary={numberToToneMarks(card.pinyin)}
                    secondary={card.back}
                    onClick={() => (onWordClick ? onWordClick(card.front) : setDictionaryWord(card.front))}
                    ariaLabel={`Open ${card.front}`}
                    trailing={isCourse
                      ? <LevelTag bookId={card.bookId} lessonId={card.lessonId} />
                      : <LevelTag level={resolveLevel(card.front, levels)} />}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </DetailShell>
  );
}
