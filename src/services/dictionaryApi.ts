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
export async function lookupDictionaryApi(words: string[], signal?: AbortSignal): Promise<Map<string, DBDictionaryRow[]>> {
  const result = new Map<string, DBDictionaryRow[]>();
  for (let start = 0; start < words.length; start += 64) {
    signal?.throwIfAborted();
    const batch = await request<Record<string, DBDictionaryRow[]>>('lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words: words.slice(start, start + 64) }), signal });
    for (const [word, rows] of Object.entries(batch)) result.set(word, rows);
  }
  return result;
}

export async function lookupCourseCardsApi(words: string[]): Promise<Flashcard[]> {
  const cards: Flashcard[] = [];
  for (let start = 0; start < words.length; start += 64) cards.push(...await request<Flashcard[]>('course', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words: words.slice(start, start + 64) }),
  }));
  return cards;
}
export const lookupExamplesApi = (word: string, limit: number) => request<WordExample[]>(`examples?word=${encodeURIComponent(word)}&limit=${limit}`);
