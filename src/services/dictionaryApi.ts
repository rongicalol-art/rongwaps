import type { Flashcard } from '../data/flashcards';
import type { WordExample } from '../types/models';
import { fetchContent } from './staticContentService';
import type { SearchResult } from '../utils/vocabulary/dictionarySearch';
import type { DBDictionaryRow } from '../types/database';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  init.signal?.throwIfAborted();
  init.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, 25_000);
  try {
    const response = await fetchContent(`/api/dictionary/${path}`, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Dictionary request failed (${response.status})`);
    return await response.json() as T;
  } finally { clearTimeout(deadline); init.signal?.removeEventListener('abort', cancel); }
}
export const searchDictionaryApi = (query: string, limit = 30) => request<SearchResult[]>(`search?q=${encodeURIComponent(query)}&limit=${limit}`);
async function fetchLookupBatches(words: string[], signal?: AbortSignal): Promise<Map<string, DBDictionaryRow[]>> {
  const result = new Map<string, DBDictionaryRow[]>();
  for (let start = 0; start < words.length; start += 64) {
    signal?.throwIfAborted();
    const batch = await request<Record<string, DBDictionaryRow[]>>('lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words: words.slice(start, start + 64) }), signal });
    for (const [word, rows] of Object.entries(batch)) result.set(word, rows);
  }
  return result;
}

const inflightLookup = new Map<string, Promise<DBDictionaryRow[]>>();
let lookupTick: Set<string> | null = null;
export async function lookupDictionaryApi(words: string[], signal?: AbortSignal): Promise<Map<string, DBDictionaryRow[]>> {
  if (signal) return fetchLookupBatches(words, signal);
  for (const word of words) {
    if (inflightLookup.has(word)) continue;
    if (!lookupTick) {
      const batch = new Set<string>();
      lookupTick = batch;
      const resolvers = new Map<string, { resolve: (rows: DBDictionaryRow[]) => void; reject: (error: unknown) => void }>();
      queueMicrotask(() => {
        lookupTick = null;
        const all = [...batch];
        fetchLookupBatches(all).then(
          fetched => { for (const w of all) { inflightLookup.delete(w); resolvers.get(w)?.resolve(fetched.get(w) ?? []); } },
          error => { for (const w of all) { inflightLookup.delete(w); resolvers.get(w)?.reject(error); } },
        );
      });
      (batch as Set<string> & { resolvers?: typeof resolvers }).resolvers = resolvers;
    }
    const tick = lookupTick as Set<string> & { resolvers: Map<string, { resolve: (rows: DBDictionaryRow[]) => void; reject: (error: unknown) => void }> };
    tick.add(word);
    inflightLookup.set(word, new Promise<DBDictionaryRow[]>((resolve, reject) => { tick.resolvers.set(word, { resolve, reject }); }));
  }
  const entries = await Promise.all(words.map(async word => [word, await inflightLookup.get(word)!] as const));
  return new Map(entries);
}

let courseTick: { words: Set<string>; promise: Promise<Flashcard[]> } | null = null;
export async function lookupCourseCardsApi(words: string[]): Promise<Flashcard[]> {
  if (!courseTick) {
    const queued = new Set<string>();
    const promise = new Promise<Flashcard[]>((resolve, reject) => {
      queueMicrotask(async () => {
        courseTick = null;
        try {
          const all = [...queued];
          const cards: Flashcard[] = [];
          for (let start = 0; start < all.length; start += 64) cards.push(...await request<Flashcard[]>('course', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words: all.slice(start, start + 64) }),
          }));
          resolve(cards);
        } catch (error) { reject(error); }
      });
    });
    courseTick = { words: queued, promise };
  }
  for (const word of words) courseTick.words.add(word);
  return courseTick.promise;
}
export const lookupExamplesApi = (word: string, limit: number) => request<WordExample[]>(`examples?word=${encodeURIComponent(word)}&limit=${limit}`);
