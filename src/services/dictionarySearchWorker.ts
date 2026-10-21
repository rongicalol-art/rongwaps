import { fetchContent, fetchStaticJson } from './staticContentService';
import type { CompactSearchEntry, SearchResult } from '../utils/vocabulary/dictionarySearch';
import type { PartsIndex } from '../utils/characters/parts';

const INDEX_PATH = '/data/search/dictionary-search-index.json';
let worker: Worker | null = null;
let loading: Promise<void> | null = null;
let fallback: Promise<{ items: CompactSearchEntry[] }> | null = null;
let loadController: AbortController | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
let retainers = 0;
let initialized = false;
const pending = new Map<number, { resolve: (results: SearchResult[]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function scheduleRelease() {
  clearTimeout(idleTimer);
  if (retainers || pending.size) return;
  idleTimer = setTimeout(() => dispose(), typeof document !== 'undefined' && document.hidden ? 60_000 : 10 * 60_000);
  if (typeof window === 'undefined') (idleTimer as unknown as { unref?: () => void }).unref?.();
}

/** A mounted study session owns its warm index, even during pauses between words. */
export function retainDictionarySearch(): () => void {
  retainers++;
  clearTimeout(idleTimer);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    retainers--;
    if (!retainers && loading && !initialized) dispose();
    else scheduleRelease();
  };
}

function dispose(error = new Error('Dictionary search closed')) {
  clearTimeout(idleTimer);
  loadController?.abort();
  loadController = null;
  worker?.terminate();
  worker = null;
  loading = null;
  fallback = null;
  initialized = false;
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', scheduleRelease);
  for (const job of pending.values()) { clearTimeout(job.timer); job.reject(error); }
  pending.clear();
}

function callWorker(message: object, transfer: Transferable[] = []): Promise<SearchResult[]> {
  clearTimeout(idleTimer);
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => dispose(new Error('Dictionary search timed out')), 20_000);
    pending.set(id, { resolve, reject, timer });
    try { worker!.postMessage({ ...message, id }, transfer); }
    catch { dispose(new Error('Dictionary search failed')); }
  });
}

async function initialize(): Promise<void> {
  if (loading) return loading;
  clearTimeout(idleTimer);
  worker = new Worker(new URL('./dictionarySearch.worker.ts', import.meta.url), { type: 'module' });
  const instance = worker;
  worker.onerror = () => { if (worker === instance) dispose(new Error('Dictionary worker failed')); };
  worker.onmessageerror = () => { if (worker === instance) dispose(new Error('Dictionary worker failed')); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', scheduleRelease);
  worker.onmessage = ({ data }: MessageEvent<{ id: number; result: SearchResult[]; error?: string }>) => {
    const job = pending.get(data.id);
    if (!job) return;
    clearTimeout(job.timer);
    pending.delete(data.id);
    if (data.error) job.reject(new Error(data.error));
    else job.resolve(data.result);
    scheduleRelease();
  };
  loadController = new AbortController();
  const controller = loadController;
  const timeout = setTimeout(() => controller.abort(), 20_000);
  loading = (async () => {
    const response = await fetchContent(INDEX_PATH, { signal: controller.signal });
    if (!response.ok) throw new Error(`Dictionary index returned ${response.status}`);
    const buffer = await response.arrayBuffer();
    controller.signal.throwIfAborted();
    await callWorker({ buffer }, [buffer]);
    initialized = true;
  })().catch((error) => { if (worker === instance) dispose(error); throw error; }).finally(() => clearTimeout(timeout));
  return loading;
}

export async function warmDictionarySearch(): Promise<void> {
  if (typeof Worker !== 'undefined') await initialize();
}

export async function searchDictionaryIndex(query: string, limit: number, parts: PartsIndex | null): Promise<SearchResult[]> {
  if (typeof Worker !== 'undefined') {
    await initialize();
    return callWorker({ query, limit, parts });
  }
  // Older engines and Node tests keep the same ranking and segmentation.
  fallback ??= fetchStaticJson<{ items: CompactSearchEntry[] }>(INDEX_PATH, 'dictionary-search-index').catch((error) => { fallback = null; throw error; });
  const [{ items }, engine] = await Promise.all([fallback, import('../utils/vocabulary/dictionarySearch')]);
  scheduleRelease();
  const components = parts ? engine.searchByCharacterComponents(items, parts, query, limit) : [];
  if (components.length) return components;
  const matches = engine.searchInIndex(items, query, limit);
  return matches.length ? matches : /\p{Script=Han}/u.test(query)
    ? engine.segmentChineseQuery(items, query, limit) : engine.segmentPinyinQuery(items, query, limit);
}
