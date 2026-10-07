import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { fetchCourseExampleRecords, fetchMemoryHooksMap, resolveMnemonicFromMap } from '../../../services/contentPacks';
import { fetchVocabulary } from '../../../services/vocabularyService';
import type { RankedExample } from '../../../utils/vocabulary/courseExamples';
import { debugLogger } from '../../../utils/debug/debugLogger';
import { normalizeMnemonic, wordMnemonicKey } from '../../character-memory-hooks';
import { buildExampleIndex, type ExampleIndex } from './exampleIndex';

export interface FlashcardExtras {
  examples: RankedExample[];
  wordHook: string | null;
}

const EMPTY: FlashcardExtras = { examples: [], wordHook: null };

let index: ExampleIndex | null = null;
let hooks: Map<string, string> | null = null;
let ready = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const extrasCache = new Map<string, FlashcardExtras>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getReady = () => ready;

function idle(task: () => void) {
  const w: Window = window;
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(task, { timeout: 1000 });
  else w.setTimeout(task, 60);
}

/** Loads every pack the flashcard back needs, once, then builds the sync index. */
export function preloadFlashcardContent(): Promise<void> {
  loading ??= (async () => {
    try {
      const [records, vocab, hookMap] = await Promise.all([
        fetchCourseExampleRecords(),
        fetchVocabulary(),
        fetchMemoryHooksMap(),
      ]);
      index = buildExampleIndex(records, vocab);
      hooks = hookMap;
      ready = true;
      listeners.forEach((listener) => listener());
      // Warm the Chinese word segmenter so the first rendered sentence isn't slow.
      idle(() => {
        try {
          Array.from(new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment('你好'));
        } catch {
          /* segmenter unavailable; SmartSentence falls back on its own */
        }
      });
    } catch (error) {
      debugLogger.error('Cache', 'Flashcard content preload failed', error);
      loading = null;
    }
  })();
  return loading;
}

/** Synchronous; null until the preload has finished. */
export function getFlashcardExtras(card: Flashcard): FlashcardExtras | null {
  if (!ready || !index) return null;
  const key = `${card.id}:${card.front}`;
  const cached = extrasCache.get(key);
  if (cached) return cached;
  const raw = hooks ? resolveMnemonicFromMap(hooks, wordMnemonicKey(card.front)) : null;
  const extras: FlashcardExtras = {
    examples: index.lookup(card),
    wordHook: raw ? (normalizeMnemonic(raw) ?? null) : null,
  };
  extrasCache.set(key, extras);
  return extras;
}

/** Warm the cache for the cards the learner is about to reach. */
export function prefetchFlashcardExtras(cards: Flashcard[], currentIndex: number) {
  if (!ready) return;
  idle(() => {
    for (const offset of [1, 2, 3, -1]) {
      const card = cards[currentIndex + offset];
      if (card) getFlashcardExtras(card);
    }
  });
}

export function useFlashcardExtras(card: Flashcard | null | undefined) {
  const isReady = useSyncExternalStore(subscribe, getReady, getReady);
  useEffect(() => {
    void preloadFlashcardContent();
  }, []);
  const extras = useMemo(
    () => (isReady && card ? getFlashcardExtras(card) : null),
    [isReady, card],
  );
  return { extras: extras ?? EMPTY, isLoading: !isReady };
}
