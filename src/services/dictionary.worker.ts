import { createDictionaryEngine } from './dictionaryEngine';

/**
 * Runs the dictionary off the main thread. Packs need the learner's session, which lives on the page:
 * the worker asks for a file (`load`), the page fetches it and hands the bytes back (`loaded`).
 */
export type DictionaryJob =
  | { kind: 'search'; query: string; limit: number }
  | { kind: 'lookup'; words: string[] }
  | { kind: 'course'; words: string[] }
  | { kind: 'examples'; query: string; limit: number };
type Incoming = ({ id: number } & DictionaryJob) | { loaded: number; buffer?: ArrayBuffer; error?: string };

const loads = new Map<number, { resolve: (buffer: ArrayBuffer) => void; reject: (error: Error) => void }>();
let loadSequence = 0;
const engine = createDictionaryEngine(async <T>(path: string) => {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const id = ++loadSequence;
    loads.set(id, { resolve, reject });
    self.postMessage({ load: id, path });
  });
  return JSON.parse(new TextDecoder().decode(buffer)) as T;
});

self.onmessage = ({ data }: MessageEvent<Incoming>) => {
  if ('loaded' in data) {
    const load = loads.get(data.loaded);
    loads.delete(data.loaded);
    if (data.buffer) load?.resolve(data.buffer); else load?.reject(new Error(data.error ?? 'Dictionary file unavailable'));
    return;
  }
  const job = data.kind === 'search' ? engine.search(data.query, data.limit)
    : data.kind === 'lookup' ? engine.lookup(data.words)
    : data.kind === 'course' ? engine.course(data.words)
    : engine.examples(data.query, data.limit);
  job.then(
    result => self.postMessage({ id: data.id, result }),
    () => self.postMessage({ id: data.id, error: 'Dictionary unavailable. Please try again.' }),
  );
};
