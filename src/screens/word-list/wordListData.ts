import type { ListWord } from './wordListTypes';

/** One chunk per level, so a word-list page downloads only its own list. */
const LOADERS: Record<number, () => Promise<{ WORDS: readonly ListWord[] }>> = {
  1: () => import('./data/level-1'),
  2: () => import('./data/level-2'),
  3: () => import('./data/level-3'),
  4: () => import('./data/level-4'),
  5: () => import('./data/level-5'),
};

const loaded = new Map<number, readonly ListWord[]>();
const pending = new Map<number, Promise<readonly ListWord[]>>();

/** The prerender and tests hand every list over up front instead of loading it. */
export function provideWordList(level: number, words: readonly ListWord[]): void {
  loaded.set(level, words);
}

export const loadedWordList = (level: number): readonly ListWord[] | undefined => loaded.get(level);

/** One promise per level, stable across renders, for React's `use`. */
export function loadWordList(level: number): Promise<readonly ListWord[]> {
  let promise = pending.get(level);
  if (!promise) {
    promise = LOADERS[level]().then(({ WORDS }) => { loaded.set(level, WORDS); return WORDS; });
    pending.set(level, promise);
  }
  return promise;
}
