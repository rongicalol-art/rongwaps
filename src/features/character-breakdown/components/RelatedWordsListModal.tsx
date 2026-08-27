import React from 'react';
import { PosBadge, WorkspaceDetailShell } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../data/books';
import { numberToToneMarks } from '../../../utils/pinyin';
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
  const { setDictionaryWord } = useAppStore();
  const groups = React.useMemo(() => {
    const groupsMap: { [key: number]: Flashcard[] } = {};
    relatedWords.forEach(card => {
      if (!groupsMap[card.bookId]) {
        groupsMap[card.bookId] = [];
      }
      groupsMap[card.bookId].push(card);
    });

    const sortedIds = Object.keys(groupsMap).map(Number).sort((a, b) => b - a);
    return sortedIds.map(bookId => ({
      bookId,
      cards: groupsMap[bookId]
    }));
  }, [relatedWords]);

  return (
    <WorkspaceDetailShell
      ariaLabel={`Words related to ${initialChar}`}
      title={`Related to “${initialChar}”`}
      onClose={onClose}
      maxWidthClassName="max-w-[900px]"
      contentInnerClassName="flex flex-col gap-5 pb-24"
    >
          {groups.length === 0 ? (
            <div className="py-12 text-center font-bold text-ui-muted">
              No related words found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(group => {
                const bookInfo = SAMPLE_BOOKS.find(b => b.id === group.bookId);
                const bookTitle = group.bookId === 0 ? 'Dictionary' : bookInfo ? bookInfo.title : `Book ${group.bookId}`;

                return (
                  <div key={group.bookId} className="flex flex-col gap-2">
                    <div className="ml-3 flex select-none items-center justify-between text-[12px] font-black uppercase tracking-wider text-ui-muted">
                      <span>{bookTitle}</span>
                      <span className="text-[11px] font-bold lowercase opacity-80">{group.cards.length} word(s)</span>
                    </div>
                    <div className="flex w-full flex-col overflow-hidden rounded-[20px] bg-ui-surface shadow-sm">
                      {group.cards.map((card, idx) => {
                        const isLast = idx === group.cards.length - 1;
                        return (
                          <button
                            key={card.id || idx}
                            onClick={() => {
                              if (onWordClick) {
                                onWordClick(card.front);
                              } else {
                                setDictionaryWord(card.front);
                              }
                            }}
                            className={`group flex w-full flex-row items-center gap-4 bg-ui-surface px-4 py-3 text-left outline-none transition-colors hover:bg-ui-surface-hover active:bg-ui-hover focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/25 ${!isLast ? 'border-b-2 border-ui-divider' : ''}`}
                          >
                            <span className={`text-[28px] sm:text-[32px] leading-none font-chinese pt-1 ${activeBook.accent} transition-all shrink-0`}>
                              {card.front}
                            </span>
                            <div className="flex flex-col items-start justify-center flex-1 min-w-0 overflow-hidden">
                              <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full pr-1">
                                <span className="h-[20px] flex-1 truncate text-[13px] font-bold tracking-widest text-ui-muted sm:text-[14px]">
                                  {numberToToneMarks(card.pinyin)}
                                </span>
                                <PosBadge pos={card.pos} />
                                {group.bookId > 0 && <span className="flex shrink-0 select-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ui-muted opacity-80">
                                  <span>B{card.bookId} · L{card.lessonId}</span>
                                  <span className={`w-2 h-2 rounded-full ${bookInfo?.accentBg || activeBook.accentBg} shrink-0`} />
                                </span>}
                              </div>
                              <span className="mt-0.5 h-[20px] w-full truncate text-[13px] font-bold text-ui-ink sm:text-[14px]">
                                {card.back}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </WorkspaceDetailShell>
  );
}
