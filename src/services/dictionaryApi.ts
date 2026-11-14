import type { Flashcard } from '../data/flashcards';
import type { WordExample } from '../types/models';
import { fetchContent } from './staticContentService';
import { createDictionaryEngine, type DictionaryEngine } from './dictionaryEngine';
import type { DictionaryJob } from './dictionary.worker';
import type { SearchResult } from '../utils/vocabulary/dictionarySearch';
import type { DBDictionaryRow } from '../types/database';

/**
 * The dictionary runs on this device (dictionaryEngine.ts in a worker): no server answers these calls.
 * The worker asks the page for each content pack it needs, because the page holds the session.
 */
const REQUEST_MS = 45_000; // The first search downloads the search index (about 4 MB).
const IDLE_MS = 5 * 60_000;
type Pending = { resolve: (result: unknown) => void; reject: (error: Error) => void };
let worker: Worker | null = null;
let local: DictionaryEngine | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
const pending = new Map<number, Pending>();

/** Stops the worker and frees its memory; the next request starts a fresh one. */
export function closeDictionary(error = new Error('Dictionary closed')) {
  clearTimeout(idleTimer);
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) job.reject(error);
  pending.clear();
}

async function loadPack(path: string): Promise<Response> {
  const response = await fetchContent(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

function startWorker(): Worker {
  const instance = new Worker(new URL('./dictionary.worker.ts', import.meta.url), { type: 'module' });
  instance.onerror = () => { if (worker === instance) closeDictionary(new Error('Dictionary worker failed')); };
  instance.onmessage = ({ data }: MessageEvent<{ id?: number; result?: unknown; error?: string; load?: number; path?: string }>) => {
    if (worker !== instance) return;
    if (data.load !== undefined) {
      const loaded = data.load;
      loadPack(data.path!).then(response => response.arrayBuffer()).then(
        buffer => instance.postMessage({ loaded, buffer }, [buffer]),
        (error: unknown) => instance.postMessage({ loaded, error: error instanceof Error ? error.message : 'Dictionary file unavailable' }),
      );
      return;
    }
    const job = pending.get(data.id!);
    if (!job) return;
    pending.delete(data.id!);
    if (data.error) job.reject(new Error(data.error)); else job.resolve(data.result);
    if (!pending.size) idleTimer = setTimeout(() => closeDictionary(), IDLE_MS);
  };
  return instance;
}

async function runLocally<T>(job: DictionaryJob): Promise<T> {
  // No worker support (tests, prerender): the same engine on this thread.
  local ??= createDictionaryEngine(async <P>(path: string) => await (await loadPack(path)).json() as P);
  const result = job.kind === 'search' ? local.search(job.query, job.limit)
    : job.kind === 'lookup' ? local.lookup(job.words)
    : job.kind === 'course' ? local.course(job.words)
    : local.examples(job.query, job.limit);
  return await result as T;
}

async function request<T>(job: DictionaryJob, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    let id = 0;
    const finish = () => { clearTimeout(deadline); signal?.removeEventListener('abort', abort); pending.delete(id); };
    const fail = (error: Error) => { finish(); reject(error); };
    const abort = () => fail(new DOMException('Aborted', 'AbortError'));
    const deadline = setTimeout(() => fail(new Error('Dictionary request timed out')), REQUEST_MS);
    signal?.addEventListener('abort', abort, { once: true });
    if (typeof Worker === 'undefined') {
      runLocally<T>(job).then(result => { finish(); resolve(result); }, fail);
      return;
    }
    clearTimeout(idleTimer);
    worker ??= startWorker();
    id = ++sequence;
    pending.set(id, { resolve: result => { finish(); resolve(result as T); }, reject: fail });
    worker.postMessage({ ...job, id });
  });
}
export const searchDictionaryApi = (query: string, limit = 30) => request<SearchResult[]>({ kind: 'search', query, limit });
async function fetchLookupBatches(words: string[], signal?: AbortSignal): Promise<Map<string, DBDictionaryRow[]>> {
  const result = new Map<string, DBDictionaryRow[]>();
  for (let start = 0; start < words.length; start += 64) {
    signal?.throwIfAborted();
    const batch = await request<Record<string, DBDictionaryRow[]>>({ kind: 'lookup', words: words.slice(start, start + 64) }, signal);
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
          for (let start = 0; start < all.length; start += 64) cards.push(...await request<Flashcard[]>({ kind: 'course', words: all.slice(start, start + 64) }));
          resolve(cards);
        } catch (error) { reject(error); }
      });
    });
    courseTick = { words: queued, promise };
  }
  for (const word of words) courseTick.words.add(word);
  return courseTick.promise;
}
export const lookupExamplesApi = (word: string, limit: number) => request<WordExample[]>({ kind: 'examples', query: word, limit });
