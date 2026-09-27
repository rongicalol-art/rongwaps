import { debugLogger } from '../../../utils/debugLogger';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon, DetailShell, ScreenHeader, Skeleton } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { searchVocabulary } from '../../../services/vocabularyService';
import { cleanVocabText } from '../../../utils/vocabCleaner';
import { sanitizeDictionaryDefinitions } from '../../../utils/dictionaryDefinitions';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { DBDictionaryEntry } from '../../../types/database';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { ExtendedDefinitions, SummaryQuickActions } from '../../character-breakdown';
import { MemoryHookBlock } from '../../character-memory-hooks';
import { WordExamplesSection } from './WordExamplesSection';
import { WordDecompositionStrip } from './WordDecompositionStrip';
import { WordSupportingInformation, hasWordSupportingInfo } from './WordSupportingInformation';
import { useWordExtras } from '../hooks/useWordExtras';

const HANZI_RE = /[\u3400-\u9FFF]/u;

export function WordDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in duration-200" role="status" aria-label="Loading dictionary entry">
      {/* 1. Header Card Skeleton */}
      <header className="relative isolate min-w-0 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 sm:gap-7 sm:p-6">
          <Skeleton className="h-16 w-20 sm:h-20 sm:w-28 rounded-feature shrink-0" />
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-6 w-28 sm:w-36" />
            <Skeleton className="h-5 w-4/5 max-w-md" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="border-t border-ui-divider/70 px-4 py-3 sm:px-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        </div>

        {/* Extended Definitions Skeleton */}
        <div className="border-t border-ui-divider/70 px-4 py-4 sm:px-6 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </header>

      {/* 2-Column Section Matching Loaded Layout */}
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,64fr)_minmax(19rem,36fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          {/* 2. Decomposition Strip Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-3">
              <Skeleton className="h-14 w-14 rounded-compact shrink-0" />
              <Skeleton className="h-14 w-14 rounded-compact shrink-0" />
            </div>
          </div>

          {/* 3. Memory Hook Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* 4. Example Sentences Skeleton */}
          <div className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex flex-col gap-2 pt-1">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-ui-divider/50">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          </div>
        </div>

        {/* Right Sidebar on Desktop (Supporting info: Characters & Related Words) */}
        <aside aria-label="Word context" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          {/* Characters Card Skeleton */}
          <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <div className="mt-1 divide-y divide-ui-divider/40">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 py-3">
                  <Skeleton className="h-10 w-10 rounded-compact shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related Words Card Skeleton */}
          <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <div className="mt-1 divide-y divide-ui-divider/40">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 py-3">
                  <Skeleton className="h-10 w-10 rounded-compact shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3.5 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
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
        <p className="text-sm font-bold text-ui-muted-strong">
          Phrase has no single dictionary entry. Here are its useful word parts.
        </p>
      </div>
      <div className="overflow-hidden rounded-control border border-ui-divider">
        {fallbackWords.map(({ word: part, entries: partEntries }, idx) => (
          <button
            key={`${part}-${idx}`}
            type="button"
            onClick={() => onOpenWord(part)}
            className="grid w-full grid-cols-[minmax(72px,0.32fr)_minmax(0,1fr)] gap-4 border-t border-ui-divider bg-ui-surface p-4 text-left transition first:border-t-0 hover:bg-ui-hover focus-ring focus-visible:ring-inset"
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
      <p className="px-8 text-center text-[15px] font-bold text-ui-muted-strong">
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
  const activeBookId = useAppStore((state) => state.activeBookId);
  const activeBook = SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0];
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);

  const [entries, setEntries] = useState<DBDictionaryEntry[]>([]);
  const [fallbackWords, setFallbackWords] = useState<Array<{ word: string; entries: DBDictionaryEntry[] }>>([]);
  const [inCourseWords, setInCourseWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const { examples, relatedWords, isLoading: isExtrasLoading } = useWordExtras(word);

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
          setInCourseWords(
            vocabularyWords.filter(
              (v) =>
                v.front === word ||
                v.traditional === word ||
                v.simplified === word ||
                cleanVocabText(v.traditional || '') === word ||
                cleanVocabText(v.simplified || '') === word ||
                cleanVocabText(v.front || '') === word,
            ),
          );
          setLoading(false);
        }
      } catch (err) {
        debugLogger.error('Supabase', 'WordDetailView: failed to load word:', err);
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

  const hasSupporting = hasWordSupportingInfo(word, relatedWords, isExtrasLoading);

  return (
    <DetailShell.Root
      ariaLabel={`Word breakdown for ${word}`}
      tone="practice"
      style={{ zIndex: 300 + depth }}
      workspaceOffset={workspaceOffset}
      onEscape={onClose}
    >
      <DetailShell.Scroller>
        <ScreenHeader
          variant="panel"
          tone="practice"
          onClose={onClose}
          centerContent={
            <h1 className="w-full text-center text-xs sm:text-sm font-black uppercase tracking-wider text-ui-ink-strong">Word breakdown</h1>
          }
        />
        <div className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-6 px-4 py-4 pb-12 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="word-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="w-full"
              >
                <WordDetailSkeleton />
              </motion.div>
            ) : entries.length === 0 ? (
              <motion.div
                key="word-fallback"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="w-full"
              >
                {fallbackWords.length > 0 ? (
                  <FallbackWords word={word} fallbackWords={fallbackWords} onOpenWord={setDictionaryWord} />
                ) : (
                  <NotFound word={word} />
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`word-loaded-${word}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col gap-6"
              >
                <header className="relative isolate min-w-0 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 sm:gap-7 sm:p-6">
                    <div className="flex min-w-0 items-baseline gap-x-1 font-chinese leading-tight text-ui-ink-strong">
                      {chars.map((char, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => pushCharacter(char)}
                          aria-label={`Open breakdown for ${char}`}
                          className={`cursor-pointer whitespace-nowrap rounded-xs focus-ring transition-colors hover:text-brand-primary active:opacity-50 ${wordSizeClass}`}
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
                  <SummaryQuickActions char={primaryChar} audioSrc={primaryCourseCard?.audio} />

                  <ExtendedDefinitions entries={entries} />
                </header>

                <div
                  className={
                    hasSupporting
                      ? 'grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,64fr)_minmax(19rem,36fr)] lg:gap-8'
                      : 'flex min-w-0 flex-col gap-6 lg:gap-8'
                  }
                >
                  <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
                    <WordDecompositionStrip word={word} onOpenCharacter={pushCharacter} />

                    <MemoryHookBlock
                      cacheKey={`word_${word}`}
                      word={word}
                      pinyin={pinyin || undefined}
                      emptyText={<>No memory hook for this word yet.</>}
                    />

                    <WordExamplesSection
                      examples={examples}
                      isLoading={isExtrasLoading}
                      word={word}
                      activeBook={activeBook}
                    />
                  </div>

                  {hasSupporting && (
                    <aside
                      aria-label="Word context"
                      className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:self-start"
                    >
                      <WordSupportingInformation
                        word={word}
                        pushCharacter={pushCharacter}
                        relatedWords={relatedWords}
                        isRelatedLoading={isExtrasLoading}
                        onOpenWord={setDictionaryWord}
                        activeBook={activeBook}
                      />
                    </aside>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DetailShell.Scroller>
    </DetailShell.Root>
  );
}
