import { debugLogger } from '../../../utils/debug/debugLogger';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DetailShell, LevelTag, ScreenHeader } from '../../../lib/widgets';
import { useLevel } from '../../../hooks/useLevels';
import { useAppStore } from '../../../store/useAppStore';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { searchVocabulary } from '../../../services/vocabularyService';
import { cleanVocabText } from '../../../utils/vocabulary/vocabCleaner';
import { sanitizeDictionaryDefinitions } from '../../../utils/vocabulary/dictionaryDefinitions';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import type { DBDictionaryEntry } from '../../../types/database';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { ExtendedDefinitions, StrokeOrderBox, SummaryQuickActions } from '../../character-breakdown';
import { MemoryHookBlock } from '../../character-memory-hooks';
import { WordExamplesSection } from './WordExamplesSection';
import { WordDecompositionStrip } from './WordDecompositionStrip';
import { WordSupportingInformation, hasWordSupportingInfo } from './WordSupportingInformation';
import { WordDetailSkeleton } from './WordDetailSkeleton';
import { FallbackWords } from './FallbackWords';
import { NotFound } from './NotFound';
import { useWordExtras } from '../hooks/useWordExtras';

const HANZI_RE = /[\u3400-\u9FFF]/u;

interface WordDetailViewProps {
  word: string;
  onClose?: () => void;
  /** Set when stacked over another view: shows a back arrow instead of close. */
  onBack?: () => void;
  pushCharacter: (char: string) => void;
  depth: number;
}

export function WordDetailView({
  word,
  onClose,
  onBack,
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
  // Each character gets its own stroke-order box, shrinking with word length so
  // the whole word stays on one row.
  const strokeBoxSize = chars.length <= 1 ? 112 : chars.length === 2 ? 88 : chars.length <= 4 ? 56 : 44;
  const primary = entries[0];
  const primaryChar = primary?.traditional || word;
  const pinyin = primary?.pinyin?.[0] ? numberToToneMarks(primary.pinyin[0]) : '';
  const sanitized = useMemo(() => sanitizeDictionaryDefinitions(primary?.definitions), [primary]);
  const primaryCourseCard = inCourseWords[0] ?? undefined;
  const level = useLevel(primaryChar);

  // Headline definition: the course book's own wording first; otherwise the
  // shortest dictionary meaning, which reads best as a quick summary.
  const heroDefinition = useMemo(() => {
    const courseDefinition = primaryCourseCard?.back?.trim();
    if (courseDefinition) return courseDefinition;
    const lines = sanitized.definitions.filter((line) => line.trim().length > 0);
    if (lines.length === 0) return undefined;
    return lines.reduce((shortest, line) => (line.length < shortest.length ? line : shortest));
  }, [primaryCourseCard, sanitized]);

  const hasSupporting = hasWordSupportingInfo(relatedWords, isExtrasLoading);

  return (
    <DetailShell.Root
      ariaLabel={`Word breakdown for ${word}`}
      tone="practice"
      style={{ zIndex: 300 + depth }}
      onEscape={onBack ?? onClose}
    >
      <DetailShell.Scroller>
        <ScreenHeader
          variant="panel"
          tone="practice"
          onClose={onClose}
          onBack={onBack}
          maxWidth="none"
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
                  <div className={`grid items-center gap-4 p-4 sm:gap-7 sm:p-6 ${chars.length >= 3 ? 'grid-cols-1' : 'grid-cols-[auto_minmax(0,1fr)]'}`}>
                    <div className={`flex min-w-0 flex-wrap items-center gap-2 font-chinese text-ui-ink-strong ${chars.length >= 3 ? 'pr-20' : ''}`}>
                      {chars.map((char, index) => (
                        HANZI_RE.test(char) ? (
                          <StrokeOrderBox
                            key={index}
                            char={char}
                            size={strokeBoxSize}
                            accentHex={activeBook.accentHex}
                            className="shrink-0 bg-ui-canvas/55"
                          />
                        ) : (
                          <span key={index} className="text-3xl">{char}</span>
                        )
                      ))}
                    </div>
                    <div className="relative min-w-0 pr-20 text-left">
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
                      {primaryCourseCard ? (
                        <p className="mt-2"><LevelTag bookId={primaryCourseCard.bookId} lessonId={primaryCourseCard.lessonId} /></p>
                      ) : level ? (
                        <p className="mt-2"><LevelTag variant="chip" level={level} /></p>
                      ) : null}
                    </div>
                  </div>
                  <SummaryQuickActions
                    char={primaryChar}
                    audioSrc={primaryCourseCard?.audio}
                    pinyin={pinyin || undefined}
                    meaning={heroDefinition}
                  />

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
                    <WordDecompositionStrip word={word} onOpenCharacter={pushCharacter} accentHex={activeBook.accentHex} edgeHex={activeBook.edgeHex} />

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
