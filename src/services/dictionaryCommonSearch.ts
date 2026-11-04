import { fetchContent } from './staticContentService';
import { debugLogger } from '../utils/debug/debugLogger';
import type { SearchResult } from '../../shared/dictionarySearch';

/**
 * Instant first results from the most common words, searched on the device in a worker.
 * Best effort: any failure resolves to [] and the server's full answer still arrives.
 */
const PACK_PATH = '/data/search/common-words.json';
const IDLE_MS = 5 * 60_000;
let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
const pending = new Map<number, { resolve: (rows: SearchResult[]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function dispose(error = new Error('Common words search closed')) {
  clearTimeout(idleTimer);
  worker?.terminate();
  worker = null;
  ready = null;
  for (const job of pending.values()) { clearTimeout(job.timer); job.reject(error); }
  pending.clear();
}

function call(message: object, transfer: Transferable[] = []): Promise<SearchResult[]> {
  clearTimeout(idleTimer);
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => dispose(new Error('Common words search timed out')), 15_000);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ ...message, id }, transfer);
  });
}

function start(): Promise<void> {
  if (ready) return ready;
  const instance = new Worker(new URL('./dictionaryCommon.worker.ts', import.meta.url), { type: 'module' });
  worker = instance;
  instance.onerror = () => { if (worker === instance) dispose(new Error('Common words worker failed')); };
  instance.onmessage = ({ data }: MessageEvent<{ id: number; result?: SearchResult[]; error?: string }>) => {
    const job = pending.get(data.id);
    if (!job) return;
    clearTimeout(job.timer);
    pending.delete(data.id);
    if (data.error) job.reject(new Error(data.error)); else job.resolve(data.result ?? []);
    if (!pending.size) idleTimer = setTimeout(() => dispose(), IDLE_MS);
  };
  ready = (async () => {
    const response = await fetchContent(PACK_PATH);
    if (!response.ok) throw new Error(`Common words returned ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (worker !== instance) throw new Error('Common words search closed');
    await call({ buffer }, [buffer]);
  })().catch(error => { if (worker === instance) dispose(error); throw error; });
  return ready;
}

/** Loads the pack ahead of the first keystroke (search screen open). */
export function warmCommonWords(): void {
  if (typeof Worker === 'undefined') return;
  start().catch(error => debugLogger.warn('Cache', 'Common words unavailable', error));
}

export async function searchCommonWords(query: string, limit: number): Promise<SearchResult[]> {
  // Character-part queries ("女 子") need the parts index; the server answers those.
  if (typeof Worker === 'undefined' || (/\p{Script=Han}/u.test(query) && /[\s+＋]/.test(query))) return [];
  try {
    await start();
    return await call({ query, limit });
  } catch (error) {
    debugLogger.warn('Cache', 'Common words search failed', error);
    return [];
  }
}
