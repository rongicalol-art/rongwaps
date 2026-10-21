import { debugLogger } from '../../../utils/debug/debugLogger';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DetailShell, ScreenHeader } from '../../../lib/widgets';
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
import { BreakdownTabs, type BreakdownTab } from '../../character-breakdown';
import { MemoryHookBlock } from '../../character-memory-hooks';
import { WordExamplesSection } from './WordExamplesSection';
import { WordDecompositionStrip } from './WordDecompositionStrip';
import { WordHero } from './WordHero';
import { WordRelatedList } from './WordRelatedList';
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
  const { examples, relatedWords, examplesLoading, relatedLoading } = useWordExtras(word);

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

  const reduceMotion = useReducedMotion();
  type WordTab = 'related' | 'examples';
  const tabs: BreakdownTab<WordTab>[] = [];
  if (relatedLoading || relatedWords.length > 0) tabs.push({ id: 'related', label: 'Related words', count: relatedLoading ? undefined : relatedWords.length });
  if (examplesLoading || examples.length > 0) tabs.push({ id: 'examples', label: 'Examples', count: examplesLoading ? undefined : examples.length });
  const [tab, setTab] = useState<WordTab | null>(null);
  useEffect(() => setTab(null), [word]);
  const activeTab = tabs.find((item) => item.id === tab)?.id ?? tabs[0]?.id;

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
            <h1 className="w-full text-center text-base sm:text-lg font-black uppercase tracking-wider text-ui-ink-strong">Word breakdown</h1>
          }
        />
        <div className="relative mx-auto flex min-h-full w-full max-w-[800px] flex-col gap-6 px-4 py-4 pb-12 sm:px-6 sm:py-6">
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
                className="flex w-full flex-col gap-7"
              >
                <WordHero
                  word={word}
                  accentHex={activeBook.accentHex}
                  pinyin={pinyin}
                  meaning={heroDefinition}
                  entries={entries}
                  courseCard={primaryCourseCard}
                  level={level}
                  primaryChar={primaryChar}
                />

                <WordDecompositionStrip word={word} onOpenCharacter={pushCharacter} accentHex={activeBook.accentHex} edgeHex={activeBook.edgeHex} />

                <MemoryHookBlock
                  cacheKey={`word_${word}`}
                  word={word}
                  pinyin={pinyin || undefined}
                  emptyText={<>No memory hook for this word yet.</>}
                />

                {activeTab && (
                  <div className="flex min-w-0 flex-col gap-3">
                    <BreakdownTabs tabs={tabs} active={activeTab} onChange={setTab} />
                    <motion.div
                      key={`${word}-${activeTab}`}
                      role="tabpanel"
                      id={`breakdown-panel-${activeTab}`}
                      aria-labelledby={`breakdown-tab-${activeTab}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.2, 0.9, 0.3, 1] }}
                      className="min-w-0"
                    >
                      {activeTab === 'related' && (
                        <WordRelatedList word={word} relatedWords={relatedWords} isLoading={relatedLoading} onOpenWord={setDictionaryWord} />
                      )}
                      {activeTab === 'examples' && (
                        <WordExamplesSection examples={examples} isLoading={examplesLoading} word={word} />
                      )}
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DetailShell.Scroller>
    </DetailShell.Root>
  );
}
