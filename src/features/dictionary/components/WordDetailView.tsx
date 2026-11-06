import { debugLogger } from '../../../utils/debug/debugLogger';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DetailShell, ScreenHeader } from '../../../lib/widgets';
import { useLevel } from '../../../hooks/useLevels';
import { useAppStore } from '../../../store/useAppStore';
import { useWordEntry } from '../../../hooks/useWordEntry';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { readingHeadline, taiwanReadingOf } from '../../../utils/vocabulary/wordEntry';
import type { DBDictionaryEntry } from '../../../types/database';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AlsoReadings, BreakdownTabs, EntryLayout, EntrySenses, useEntryLead, type BreakdownTab } from '../../character-breakdown';
import { MemoryHookBlock } from '../../character-memory-hooks';
import { WordExamplesSection } from './WordExamplesSection';
import { WordDecompositionStrip } from './WordDecompositionStrip';
import { WordHero } from './WordHero';
import { WordRelatedList } from './WordRelatedList';
import { WordDetailSkeleton } from './WordDetailSkeleton';
import { FallbackWords } from './FallbackWords';
import { NotFound } from './NotFound';
import { useWordExtras } from '../hooks/useWordExtras';

const HANZI_RE = /[㐀-鿿]/u;

/** A phrase with no entry of its own, read as its dictionary words (我有拖延症 → 我 · 有 · 拖延症). */
async function phraseParts(word: string): Promise<Array<{ word: string; entries: DBDictionaryEntry[] }>> {
  const chineseOnly = Array.from(word).filter((character) => HANZI_RE.test(character)).join('');
  const segmented = Array.from(new Intl.Segmenter('zh-TW', { granularity: 'word' }).segment(chineseOnly))
    .map((segment) => segment.segment)
    .filter((part) => HANZI_RE.test(part));
  const candidates = segmented.length === 1 && segmented[0] === chineseOnly ? Array.from(chineseOnly) : segmented;
  const resolved = await Promise.all(candidates.map(async (part) => ({ word: part, entries: await getDictionaryEntries(part) })));
  return resolved.filter((item) => item.entries.length > 0);
}

interface WordDetailViewProps {
  word: string;
  /** The reading it was opened for (a search row's pinyin). */
  reading?: string | null;
  onClose?: () => void;
  /** Set when stacked over another view: shows a back arrow instead of close. */
  onBack?: () => void;
  pushCharacter: (char: string) => void;
  depth: number;
}

export function WordDetailView({
  word,
  reading,
  onClose,
  onBack,
  pushCharacter,
  depth,
}: WordDetailViewProps) {
  const activeBookId = useAppStore((state) => state.activeBookId);
  const activeBook = SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0];
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);

  const { entry, isLoading } = useWordEntry(word);
  const topRef = useRef<HTMLDivElement>(null);
  const { lead, selectReading } = useEntryLead(entry, word, reading, topRef);
  const [fallbackWords, setFallbackWords] = useState<Array<{ word: string; entries: DBDictionaryEntry[] }> | null>(null);
  const { examples, relatedWords, examplesLoading, relatedLoading } = useWordExtras(word);
  const level = useLevel(entry?.word ?? word);

  useEffect(() => {
    setFallbackWords(null);
    if (isLoading || lead || Array.from(word).length < 2) return undefined;
    let active = true;
    phraseParts(word)
      .then((parts) => { if (active) setFallbackWords(parts); })
      .catch((error) => {
        debugLogger.error('Supabase', 'WordDetailView: failed to read the phrase as words:', error);
        if (active) setFallbackWords([]);
      });
    return () => { active = false; };
  }, [word, isLoading, lead]);

  const reduceMotion = useReducedMotion();
  type WordTab = 'related' | 'examples';
  const tabs: BreakdownTab<WordTab>[] = [];
  if (relatedLoading || relatedWords.length > 0) tabs.push({ id: 'related', label: 'Related words', count: relatedLoading ? undefined : relatedWords.length });
  if (examplesLoading || examples.length > 0) tabs.push({ id: 'examples', label: 'Examples', count: examplesLoading ? undefined : examples.length });
  const [tab, setTab] = useState<WordTab | null>(null);
  useEffect(() => setTab(null), [word]);
  const activeTab = tabs.find((item) => item.id === tab)?.id ?? tabs[0]?.id;
  const loading = isLoading || (!lead && fallbackWords === null && Array.from(word).length > 1);

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
        <div className="relative mx-auto flex min-h-full w-full max-w-[800px] flex-col gap-6 px-4 py-4 pb-12 sm:px-6 sm:py-6 lg:max-w-[1180px]">
          {loading ? (
            <motion.div
              key="word-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full"
            >
              <WordDetailSkeleton />
            </motion.div>
          ) : !entry || !lead ? (
            <motion.div
              key="word-fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16 }}
              className="w-full"
            >
              {fallbackWords && fallbackWords.length > 0 ? (
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
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <EntryLayout
                topRef={topRef}
                hero={(
                  <WordHero
                    word={entry.word}
                    accentHex={activeBook.accentHex}
                    pinyin={lead.pinyin}
                    meaning={readingHeadline(lead, simpleDefinitions) || undefined}
                    courseCard={lead.cards[0]}
                    level={lead === entry.readings[0] ? level : null}
                    alsoReadings={<AlsoReadings readings={entry.readings} lead={lead} onSelect={selectReading} />}
                  />
                )}
                intro={<>
                  <WordDecompositionStrip word={entry.word} onOpenCharacter={pushCharacter} accentHex={activeBook.accentHex} edgeHex={activeBook.edgeHex} />
                  <MemoryHookBlock cacheKey={`word_${entry.word}`} word={entry.word} pinyin={lead.pinyin || undefined} />
                </>}
                senses={<EntrySenses entry={entry} leadKey={lead.key} onSelectReading={selectReading} onOpenWord={pushCharacter} />}
                aside={<>
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
                          <WordRelatedList word={word} relatedWords={relatedWords} isLoading={relatedLoading} onOpenWord={setDictionaryWord} taiwan={entry ? taiwanReadingOf(entry, lead) : null} />
                        )}
                        {activeTab === 'examples' && (
                          <WordExamplesSection examples={examples} isLoading={examplesLoading} word={word} />
                        )}
                      </motion.div>
                    </div>
                  )}
                </>}
              />
            </motion.div>
          )}
        </div>
      </DetailShell.Scroller>
    </DetailShell.Root>
  );
}
