import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, ScreenHeader, Skeleton } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { searchVocabulary } from '../../../services/vocabularyService';
import { sanitizeDictionaryDefinitions } from '../../../utils/dictionaryDefinitions';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { DBDictionaryEntry } from '../../../types/database';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { ExtendedDefinitions, SummaryQuickActions } from '../../character-breakdown';
import { WordCharacterChips } from './WordCharacterChips';
import { WordExamplesSection } from './WordExamplesSection';
import { WordRelatedWords } from './WordRelatedWords';
import { WordDecompositionStrip } from './WordDecompositionStrip';
import { useWordExtras } from '../hooks/useWordExtras';

const HANZI_RE = /[\u3400-\u9FFF]/u;

function WordDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" role="status" aria-label="Loading dictionary entry">
      <div className="rounded-feature bg-ui-surface p-6">
        <Skeleton className="h-16 w-40" />
        <Skeleton className="mt-3 h-6 w-32" />
      </div>
      <div className="rounded-feature bg-ui-surface p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
    </div>
  );
}

function FallbackWords({
  word,
  fallbackWords,
  onOpenWord,
}: {
  word: string;
  fallbackWords: Array<{ word: string; entries: DBDictionaryEntry[] }>;
  onOpenWord: (word: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 border-b border-ui-divider pb-5">
        <p className="text-lg font-extrabold leading-tight text-ui-ink">Read “{word}” as words</p>
        <p className="text-sm font-bold text-ui-muted">
          Phrase has no single dictionary entry. Here are its useful word parts.
        </p>
      </div>
      <div className="overflow-hidden rounded-control border border-ui-divider">
        {fallbackWords.map(({ word: part, entries: partEntries }, idx) => (
          <button
            key={`${part}-${idx}`}
            type="button"
            onClick={() => onOpenWord(part)}
            className="grid w-full grid-cols-[minmax(72px,0.32fr)_minmax(0,1fr)] gap-4 border-t border-ui-divider bg-ui-surface p-4 text-left outline-none transition first:border-t-0 hover:bg-ui-hover focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/20"
          >
            <div>
              <span className="font-chinese text-3xl font-black text-ui-ink-strong">{part}</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(partEntries[0].pinyin || []).slice(0, 2).map((py, i) => (
                  <span key={i} className="text-xs font-bold text-brand-primary">
                    {numberToToneMarks(py)}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-1">
              {partEntries
                .flatMap((entry) => Object.values(entry.definitions ?? {}))
                .slice(0, 4)
                .map((definition, i) => (
                  <li key={i} className="text-sm font-bold leading-5 text-ui-ink">
                    <span className="mr-1.5 text-ui-muted">{i + 1}.</span>
                    {String(definition)}
                  </li>
                ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function NotFound({ word }: { word: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ui-muted">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ui-canvas">
        <AppIcon name="search" size={32} className="text-ui-muted opacity-80" />
      </div>
      <p className="mb-2 text-2xl font-extrabold text-ui-ink">Not Found</p>
      <p className="px-8 text-center text-[15px] font-bold text-ui-muted">
        We couldn't find <span className="text-ui-ink">“{word}”</span> in the dictionary.
      </p>
    </div>
  );
}

interface WordDetailViewProps {
  word: string;
  workspaceOffset?: boolean;
  onClose: () => void;
  pushCharacter: (char: string) => void;
  depth: number;
}

export function WordDetailView({
  word,
  workspaceOffset = true,
  onClose,
  pushCharacter,
  depth,
}: WordDetailViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const activeBookId = useAppStore((state) => state.activeBookId);
  const activeBook = SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0];
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);

  const [entries, setEntries] = useState<DBDictionaryEntry[]>([]);
  const [fallbackWords, setFallbackWords] = useState<Array<{ word: string; entries: DBDictionaryEntry[] }>>([]);
  const [inCourseWords, setInCourseWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const { examples, relatedWords, isLoading: isExtrasLoading } = useWordExtras(word);

  const modalFocusProps = useModalFocus({ containerRef, isActive: true, onEscape: onClose });

  useEffect(() => {
    let isMounted = true;
    const fetchWord = async () => {
      setLoading(true);
      try {
        const data = await getDictionaryEntries(word);
        const vocabularyWords = await searchVocabulary(word);

        let wordFallbacks: Array<{ word: string; entries: DBDictionaryEntry[] }> = [];
        if (data.length === 0 && word.length > 1) {
          const chineseOnly = Array.from(word)
            .filter((character) => HANZI_RE.test(character))
            .join('');
          const segmented = Array.from(
            new Intl.Segmenter('zh-TW', { granularity: 'word' }).segment(chineseOnly),
          )
            .map((segment) => segment.segment)
            .filter((w) => HANZI_RE.test(w));
          const candidates =
            segmented.length === 1 && segmented[0] === chineseOnly
              ? Array.from(chineseOnly)
              : segmented;
          const resolved = await Promise.all(
            candidates.map(async (w) => ({ word: w, entries: await getDictionaryEntries(w) })),
          );
          wordFallbacks = resolved.filter((item) => item.entries.length > 0);
        }

        if (isMounted) {
          setEntries(data);
          setFallbackWords(wordFallbacks);
          setInCourseWords(vocabularyWords.filter((v) => v.front === word));
          setLoading(false);
        }
      } catch (err) {
        console.error('WordDetailView: failed to load word:', err);
        if (isMounted) setLoading(false);
      }
    };
    fetchWord();
    return () => {
      isMounted = false;
    };
  }, [word]);

  const chars = Array.from(word);
  // Keep multi-character words on a single row by scaling the glyph size to the
  // word length (2-character words stay hero-sized; longer words shrink so the
  // whole word reads left-to-right instead of stacking vertically).
  const wordSizeClass =
    chars.length <= 2
      ? 'text-5xl sm:text-6xl'
      : chars.length <= 4
        ? 'text-4xl sm:text-5xl'
        : 'text-3xl sm:text-4xl';
  const primary = entries[0];
  const primaryChar = primary?.traditional || word;
  const pinyin = primary?.pinyin?.[0] ? numberToToneMarks(primary.pinyin[0]) : '';
  const sanitized = useMemo(() => sanitizeDictionaryDefinitions(primary?.definitions), [primary]);
  const primaryCourseCard = inCourseWords[0] ?? undefined;

  // Headline definition: the course book's own wording first; otherwise the
  // shortest dictionary meaning, which reads best as a quick summary.
  const heroDefinition = useMemo(() => {
    const courseDefinition = primaryCourseCard?.back?.trim();
    if (courseDefinition) return courseDefinition;
    const lines = sanitized.definitions.filter((line) => line.trim().length > 0);
    if (lines.length === 0) return undefined;
    return lines.reduce((shortest, line) => (line.length < shortest.length ? line : shortest));
  }, [primaryCourseCard, sanitized]);

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Dictionary details for ${word}`}
      tabIndex={-1}
      onKeyDown={modalFocusProps.onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      style={{ zIndex: 300 + depth }}
      className={`absolute inset-0 flex h-full flex-col bg-ui-practice-canvas font-sans pointer-events-auto ${workspaceOffset ? 'workspace-window w-auto' : 'w-full'}`}
    >
      <ScreenHeader
        onClose={onClose}
        centerContent={
          <h1 className="w-full text-center text-sm font-black text-ui-ink-strong sm:text-base">Dictionary</h1>
        }
        maxWidth="none"
        className="sticky top-0 z-40 w-full max-w-full shrink-0 border-0 bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent px-4 shadow-none backdrop-blur-[2px] sm:px-6 lg:px-10"
      />

      <div className="custom-scrollbar relative z-10 flex-1 overflow-y-auto bg-transparent">
        <div className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-6 px-4 py-4 pb-12 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {loading ? (
            <WordDetailSkeleton />
          ) : entries.length === 0 ? (
            fallbackWords.length > 0 ? (
              <FallbackWords word={word} fallbackWords={fallbackWords} onOpenWord={setDictionaryWord} />
            ) : (
              <NotFound word={word} />
            )
          ) : (
            <>
              <header className="relative isolate min-w-0 overflow-hidden rounded-feature bg-ui-surface">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 sm:gap-7 sm:p-6">
                  <div className="flex min-w-0 items-baseline gap-x-1 font-chinese leading-tight text-ui-ink-strong">
                    {chars.map((char, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => pushCharacter(char)}
                        aria-label={`Open breakdown for ${char}`}
                        className={`cursor-pointer whitespace-nowrap outline-none transition-colors hover:text-brand-primary focus-visible:rounded-md focus-visible:ring-4 focus-visible:ring-brand-primary/25 active:opacity-50 ${wordSizeClass}`}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                  <div className="relative min-w-0 text-left">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {pinyin && (
                        <span className="truncate text-xl font-black text-brand-primary sm:text-2xl">{pinyin}</span>
                      )}
                    </div>
                    {heroDefinition && (
                      <p className="mt-1 line-clamp-2 max-w-2xl text-sm font-bold leading-snug text-ui-ink sm:text-lg">
                        {heroDefinition}
                      </p>
                    )}
                    {primaryCourseCard && (
                      <p className="mt-2 text-[10px] font-extrabold text-ui-muted">B{primaryCourseCard.bookId} · L{primaryCourseCard.lessonId}</p>
                    )}
                  </div>
                </div>
                <SummaryQuickActions char={primaryChar} />

                <ExtendedDefinitions entries={entries} />
              </header>

              <WordCharacterChips word={word} pushCharacter={pushCharacter} />

              <WordExamplesSection
                examples={examples}
                isLoading={isExtrasLoading}
                word={word}
                activeBook={activeBook}
              />

              <WordDecompositionStrip word={word} onOpenCharacter={pushCharacter} />

              <WordRelatedWords
                relatedWords={relatedWords}
                isLoading={isExtrasLoading}
                onOpenWord={setDictionaryWord}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
