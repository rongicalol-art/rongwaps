import type { Flashcard } from '../src/data/flashcards';
import type { WordExample } from '../src/types/models';
import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import type { SearchResult } from '../shared/dictionarySearch';
import type { DBDictionaryRow } from '../src/types/database';

let worker: Worker | undefined;
let starting: Promise<void> | undefined;
let sequence = 0;
let queued = 0;
const pending = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
export function closeDictionary() {
  void worker?.terminate(); worker = undefined; starting = undefined;
  for (const job of pending.values()) { clearTimeout(job.timer); job.reject(new Error('Dictionary unavailable')); }
  pending.clear();
}
async function initialize() {
  if (starting) return starting;
  starting = (async () => {
    const production = process.env.NODE_ENV === 'production';
    const workerData = { root: resolve(process.cwd(), production ? 'dist' : 'public'), generatedRoot: resolve(process.cwd(), production ? 'dist' : '.vite/study') };
    // A capped heap makes V8 collect early instead of growing toward the host's memory limit (Render: 512 MB total).
    const resourceLimits = { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 8 };
    let instance: Worker;
    if (process.env.NODE_ENV === 'production') {
      instance = new Worker(new URL('./dictionary.worker.js', import.meta.url), { workerData, resourceLimits });
    } else {
      // Compile the development worker with the existing toolchain; no loader assumptions.
      const { build } = await import('esbuild');
      const bundle = await build({ entryPoints: ['server/dictionary.worker.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
      instance = new Worker(bundle.outputFiles[0].text, { eval: true, workerData, resourceLimits });
    }
    worker = instance;
    await new Promise<void>((resolveReady, reject) => {
      const deadline = setTimeout(() => { closeDictionary(); reject(new Error('Dictionary startup timed out')); }, 20_000);
      instance.on('error', error => { clearTimeout(deadline); if (worker === instance) closeDictionary(); reject(error); });
      instance.on('exit', () => { if (worker === instance) { clearTimeout(deadline); closeDictionary(); reject(new Error('Dictionary closed')); } });
      instance.on('message', ({ id, ready, fatal, result, error }) => {
        if (ready) { clearTimeout(deadline); instance.unref(); resolveReady(); return; }
        if (fatal) { clearTimeout(deadline); closeDictionary(); reject(new Error(fatal)); return; }
        const job = pending.get(id); if (!job) return;
        clearTimeout(job.timer); pending.delete(id);
        if (error) job.reject(new Error(error)); else job.resolve(result);
        if (!pending.size) instance.unref();
      });
    });
  })().catch(error => { starting = undefined; throw error; });
  return starting;
}
async function request<T>(message: object): Promise<T> {
  if (queued >= 32) throw new Error('Dictionary busy. Please try again.');
  queued++;
  try {
  await initialize();
  return await new Promise<T>((resolveResult, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { closeDictionary(); }, 15_000);
    pending.set(id, { resolve: result => resolveResult(result as T), reject, timer });
    worker!.ref(); worker!.postMessage({ ...message, id });
  });
  } finally { queued--; }
}
export const searchDictionary = (query: string, limit: number) => request<SearchResult[]>({ query, limit });
export const lookupDictionary = (words: string[]) => request<Record<string, DBDictionaryRow[]>>({ words });

export const lookupCourseCards = (words: string[]) => request<Flashcard[]>({ kind: 'course', words });
export const lookupExamples = (query: string, limit: number) => request<WordExample[]>({ kind: 'examples', query, limit });
