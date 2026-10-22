import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { fetchAllFlashcardExamples, fetchPackedFlashcardExtras } from '../../../services/contentPacks';
import { FLASHCARD_EXTRAS_CACHE_LIMIT, flashcardExtrasKey, type FlashcardExtras } from '../../../utils/vocabulary/flashcardExtrasPack';
import { getIdPosition } from '../../../utils/lesson/curriculumPosition';
import { debugLogger } from '../../../utils/debug/debugLogger';

export type { FlashcardExtras };
const EMPTY: FlashcardExtras = { examples: [], wordHook: null };
const LOADING = { extras: EMPTY, isLoading: true };
const IDLE = { extras: EMPTY, isLoading: false };
const cache = new Map<string, typeof IDLE>();
const failed = new Set<string>();
const pending = new Map<string, Promise<void>>();
const active = new Map<string, number>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void, key: string | null) => {
  listeners.add(listener);
  if (key) active.set(key, (active.get(key) ?? 0) + 1);
  return () => {
    listeners.delete(listener);
    if (key) { const remaining = (active.get(key) ?? 1) - 1; if (remaining) active.set(key, remaining); else active.delete(key); }
  };
};

function loadCard(card: Flashcard): Promise<void> {
  const key = flashcardExtrasKey(card);
  if (cache.has(key) && !failed.has(key)) {
    const state = cache.get(key)!; cache.delete(key); cache.set(key, state);
    return Promise.resolve();
  }
  failed.delete(key);
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    try {
      let extras = await fetchPackedFlashcardExtras(card);
      // A missing word lookup means no authored hook. Edited course cards keep
      // their original full-corpus matching, loaded only when actually needed.
      if (extras === undefined || (extras === null && getIdPosition(card.id))) {
        const { lookupLiveFlashcardExtras } = await import('./flashcardContentFallback');
        extras = await lookupLiveFlashcardExtras(card);
      }
      cache.set(key, { extras: extras ?? EMPTY, isLoading: false });
    } catch (error) {
      debugLogger.error('Cache', 'Flashcard content load failed', error);
      failed.add(key);
      cache.set(key, IDLE);
    } finally {
      while (cache.size > FLASHCARD_EXTRAS_CACHE_LIMIT) {
        const oldest = [...cache.keys()].find((candidate) => !active.has(candidate));
        if (!oldest) break;
        cache.delete(oldest);
        failed.delete(oldest);
      }
      pending.delete(key);
      listeners.forEach((listener) => listener());
    }
  })();
  pending.set(key, task);
  return task;
}

/** Load only requested cards. Repeated calls share both shard and card requests. */
export async function preloadFlashcardContent(cards: readonly Flashcard[], signal?: AbortSignal): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, cards.length) }, async () => {
    while (next < cards.length) {
      signal?.throwIfAborted();
      const card = cards[next++];
      await loadCard(card);
      signal?.throwIfAborted();
      if (failed.has(flashcardExtrasKey(card))) throw new Error('Examples could not load');
    }
  }));
}
export function getFlashcardExtras(card: Flashcard): FlashcardExtras | null {
  return cache.get(flashcardExtrasKey(card))?.extras ?? null;
}

/** One next card, rather than four speculative shards competing with the current card. */
export function prefetchFlashcardExtras(cards: Flashcard[], currentIndex: number) {
  const card = cards[currentIndex + 1];
  if (!card) return;
  const run = () => { if (!document.hidden) void loadCard(card); };
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 1000 });
  else window.setTimeout(run, 100);
}

export function useFlashcardExtras(card: Flashcard | null | undefined) {
  const key = card ? flashcardExtrasKey(card) : null;
  const watch = useCallback((listener: () => void) => subscribe(listener, key), [key]);
  const state = useSyncExternalStore(watch, () => key ? cache.get(key) ?? LOADING : IDLE, () => IDLE);
  useEffect(() => {
    if (card) void loadCard(card);
    // Same matching signature shares results even if a parent remaps the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** "Show more": fetches the held-back other-lesson examples once, on request. */
export function useMoreExamples(card: Flashcard) {
  const key = flashcardExtrasKey(card);
  const [state, setState] = useState<{ key: string; examples: FlashcardExtras['examples'] | null; loading: boolean; failed: boolean }>(
    { key, examples: null, loading: false, failed: false });
  const current = state.key === key ? state : { key, examples: null, loading: false, failed: false };
  const load = useCallback(() => {
    setState({ key, examples: null, loading: true, failed: false });
    fetchAllFlashcardExamples(card)
      .then((examples) => setState({ key, examples, loading: false, failed: false }))
      .catch(() => setState({ key, examples: null, loading: false, failed: true }));
    // The key already captures every card field the shard lookup reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { moreExamples: current.examples, loadingMore: current.loading, moreFailed: current.failed, loadMore: load };
}
