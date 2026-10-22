import { studyPartKey, type LoadedStudyPack } from '../utils/vocabulary/studyPack';
import { lookupDictionaryApi } from './dictionaryApi';
import { flashcardExtrasKey, flashcardExtrasShard, lessonExtras, type FlashcardExtras } from '../utils/vocabulary/flashcardExtrasPack';
import { debugLogger } from '../utils/debug/debugLogger';
import type { DBDictionaryRow, DBCharacterBreakdown, DBVocabularyRow } from '../types/database';
import type { Flashcard } from '../data/flashcards';
import type { CourseExampleRecord, ReadingRecord, InteractiveGrammarPart, DialogueAlignment } from '../types/models';
import { createPackLoader, type PackLoader } from './packLoader';
import { fetchContent, fetchStaticJson } from './staticContentService';
import {
  type ContentPackKind,
  type GenericContentManifest,
  getBreakdownShard,
  recordsToExampleCards,
  resolveMnemonicFromMap,
  type LevelIndex,
} from '../utils/packValidators';
import type { PartsIndex } from '../utils/characters/parts';
import type { ReadingsIndex } from '../utils/pinyin/pronunciation';
import { PACK_CONFIGS } from './contentPackConfigs';

export * from '../utils/packValidators';

const loaders = new Map<ContentPackKind, PackLoader<GenericContentManifest, unknown>>();

function getLoader<TLoaded = unknown>(kind: ContentPackKind): PackLoader<GenericContentManifest, TLoaded> {
  let loader = loaders.get(kind);
  if (!loader) {
    loader = createPackLoader<GenericContentManifest, unknown, TLoaded>(
      PACK_CONFIGS[kind] as unknown as Parameters<typeof createPackLoader<GenericContentManifest, unknown, TLoaded>>[0],
    );
    loaders.set(kind, loader);
  }
  return loader as PackLoader<GenericContentManifest, TLoaded>;
}

export async function loadPack<TLoaded = unknown>(kind: ContentPackKind, key: number): Promise<TLoaded | null> {
  return getLoader<TLoaded>(kind).loadPart(key);
}

export async function loadAllParts<TLoaded = unknown>(kind: ContentPackKind): Promise<TLoaded[]> {
  return getLoader<TLoaded>(kind).loadAllParts();
}

export async function getPackManifest(kind: ContentPackKind): Promise<GenericContentManifest> {
  return getLoader(kind).manifest();
}

/** Decoded bundles are bounded when idle and pinned only by mounted study sessions. */
export function retainStudyPacks(cards: readonly Flashcard[]): () => void {
  return getLoader('study').retainParts(cards.map(card => studyPartKey(card.bookId, card.lessonId, card.partId ?? 1)));
}
export function getLoadedStudyCards(): Flashcard[] {
  return [...getLoader<LoadedStudyPack>('study').loadedParts()].flatMap(pack => pack.cards);
}
export function getLoadedStudyExtras(card: Flashcard): FlashcardExtras | undefined {
  for (const pack of getLoader<LoadedStudyPack>('study').loadedParts()) {
    const extras = pack.extras.get(flashcardExtrasKey(card));
    if (extras) return extras;
  }
}
export async function loadStudyCards(keys: number[], signal?: AbortSignal): Promise<Flashcard[]> {
  const packs: LoadedStudyPack[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, keys.length) }, async () => {
    while (next < keys.length) {
      signal?.throwIfAborted();
      const pack = await loadPack<LoadedStudyPack>('study', keys[next++]);
      signal?.throwIfAborted();
      if (!pack) throw new Error('Study part missing. Refresh and try again.');
      packs.push(pack);
    }
  }));
  return packs.flatMap(pack => pack.cards).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
}
export async function prepareStudyPacks(cards: readonly Flashcard[], signal?: AbortSignal): Promise<void> {
  const course = cards.filter(card => /^b\d+[-_]?l\d+/i.test(card.id));
  await loadStudyCards([...new Set(course.map(card => studyPartKey(card.bookId, card.lessonId, card.partId ?? 1)))], signal);
}

const warmedStudyPaths = new Set<string>();
/**
 * After a session is ready, download the next lesson part into the browser's HTTP
 * cache only (no parse, no memory), so moving on opens instantly. Skipped on Data Saver.
 */
export async function prefetchNextStudyPart(cards: readonly Flashcard[]): Promise<void> {
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const keys = cards.map(card => studyPartKey(card.bookId, card.lessonId, card.partId ?? 1));
  if (!keys.length) return;
  const last = Math.max(...keys);
  const next = (await getPackManifest('study')).parts
    ?.filter(part => part.key > last).sort((a, b) => a.key - b.key)[0];
  if (!next?.path || warmedStudyPaths.has(next.path)) return;
  warmedStudyPaths.add(next.path);
  try {
    const response = await fetchContent(next.path, { priority: 'low' } as RequestInit);
    await response.arrayBuffer();
  } catch { warmedStudyPaths.delete(next.path); }
}

let courseCharRanks: Promise<Map<string, { bookId: number; lessonId: number }>> | null = null;
/** Earliest course lesson per character, from one small derived file. */
export function fetchCourseCharRanks() {
  courseCharRanks ??= fetchStaticJson<Record<string, [number, number]>>('/data/search/course-chars.json', 'Course character ranks')
    .then(ranks => new Map(Object.entries(ranks).map(([character, [bookId, lessonId]]) => [character, { bookId, lessonId }])))
    .catch(error => { courseCharRanks = null; throw error; });
  return courseCharRanks;
}

/** One small shard replaces whole-corpus indexing for unchanged course cards. */
export async function fetchPackedFlashcardExtras(card: Flashcard): Promise<FlashcardExtras | null | undefined> {
  const warm = getLoadedStudyExtras(card);
  if (warm) return warm;
  const key = flashcardExtrasKey(card);
  try {
    const row = (await loadPack<Map<string, FlashcardExtras>>('flashcard-extras', flashcardExtrasShard(key)))?.get(key);
    return row ? lessonExtras(row) : null;
  } catch (error) {
    debugLogger.warn('Cache', 'Flashcard extras unavailable; using live lookup.', error);
    return undefined;
  }
}

/** Every example for a word, including other lessons ("Show more"). */
export async function fetchAllFlashcardExamples(card: Flashcard): Promise<FlashcardExtras['examples']> {
  const key = flashcardExtrasKey(card);
  const pack = await loadPack<Map<string, FlashcardExtras>>('flashcard-extras', flashcardExtrasShard(key));
  return pack?.get(key)?.examples ?? [];
}

export async function fetchVocabularyPack(bookId: number): Promise<DBVocabularyRow[] | null> {
  try {
    return await loadPack<DBVocabularyRow[]>('vocabulary', bookId);
  } catch (error) {
    debugLogger.warn('Cache', `Static vocabulary pack unavailable for book ${bookId}.`, error);
    return null;
  }
}

let allVocabRowsCache: DBVocabularyRow[] | null = null;
let allVocabRowsPromise: Promise<DBVocabularyRow[] | null> | null = null;

export function fetchAllVocabularyPacks(): Promise<DBVocabularyRow[] | null> {
  if (allVocabRowsCache) return Promise.resolve(allVocabRowsCache);
  if (allVocabRowsPromise) return allVocabRowsPromise;

  allVocabRowsPromise = (async () => {
    try {
      const manifest = await getPackManifest('vocabulary');
      const packs = await Promise.all(
        [...(manifest.books || [])]
          .sort((a, b) => a.bookId - b.bookId)
          .map((book) => fetchVocabularyPack(book.bookId)),
      );
      if (packs.some((pack) => pack === null)) return null;
      const rows = packs.flatMap((pack) => pack || []);
      if (rows.length !== manifest.totalCount) {
        throw new Error('Combined vocabulary packs failed count validation');
      }
      allVocabRowsCache = rows;
      return rows;
    } catch (error) {
      debugLogger.warn('Cache', 'Complete static vocabulary dataset unavailable.', error);
      return null;
    } finally {
      allVocabRowsPromise = null;
    }
  })();

  return allVocabRowsPromise;
}

export async function fetchBreakdownsFromPacks(characters: string[]): Promise<Record<string, DBCharacterBreakdown>> {
  const results: Record<string, DBCharacterBreakdown> = {};
  try {
    const manifest = await getPackManifest('breakdowns');
    const shardCount = manifest.shardCount || 1;
    const charactersByShard = new Map<number, Set<string>>();
    const uniqueCharacters = [...new Set(characters.filter(Boolean))];

    for (const character of uniqueCharacters) {
      const shard = getBreakdownShard(character, shardCount);
      const shardCharacters = charactersByShard.get(shard) || new Set<string>();
      shardCharacters.add(character);
      charactersByShard.set(shard, shardCharacters);
    }

    const shardEntries = [...charactersByShard.entries()].slice(0, 6);

    await Promise.all(shardEntries.map(async ([shard, shardCharacters]) => {
      const indexed = await loadPack<Map<string, DBCharacterBreakdown>>('breakdowns', shard);
      if (!indexed) return;
      for (const character of shardCharacters) {
        const breakdown = indexed.get(character);
        if (breakdown) results[character] = breakdown;
      }
    }));
  } catch (error) {
    debugLogger.warn('Cache', 'Static breakdown packs unavailable; using Supabase.', error);
  }
  return results;
}

/** Exact lesson definitions resolve locally; other words return only matching rows from the API. */
export async function fetchDictionaryRowsFromPacks(words: string[], signal?: AbortSignal): Promise<Map<string, DBDictionaryRow[]>> {
  signal?.throwIfAborted();
  const results = new Map<string, DBDictionaryRow[]>();
  const missing: string[] = [];
  for (const word of new Set(words.map(word => word.trim()).filter(Boolean))) {
    let found = false;
    for (const pack of getLoader<LoadedStudyPack>('study').loadedParts()) {
      const rows = pack.dictionary.get(word);
      if (rows) { results.set(word, rows); found = true; break; }
      if (pack.cards.some(card => [card.front, card.traditional, card.simplified].includes(word))) found = true;
    }
    if (!found) missing.push(word);
  }
  if (missing.length) for (const [word, rows] of await lookupDictionaryApi(missing, signal)) results.set(word, rows);
  return results;
}

export async function fetchCourseExampleRecords(): Promise<CourseExampleRecord[]> {
  try {
    const manifest = await getPackManifest('course-examples');
    const packs = await loadAllParts<CourseExampleRecord[]>('course-examples');
    const records = packs.flat();
    if (records.length !== manifest.totalCount) {
      throw new Error('Course example manifest count does not match its packs');
    }
    return records;
  } catch (error) {
    debugLogger.warn('Cache', 'Static course examples unavailable; using vocabulary examples.', error);
    return [];
  }
}

export async function fetchCourseExampleCards(searchTerms: string[], pos?: string): Promise<Flashcard[]> {
  return recordsToExampleCards(await fetchCourseExampleRecords(), searchTerms, pos);
}

let hookMapPromise: Promise<Map<string, string>> | null = null;

export async function fetchMemoryHooksMap(): Promise<Map<string, string> | null> {
  try {
    hookMapPromise ??= (async () => {
      const parts = await loadAllParts<Map<string, string>>('memory-hooks');
      const map = new Map<string, string>();
      for (const part of parts) {
        for (const [key, value] of part) map.set(key, value);
      }
      return map;
    })();
    return await hookMapPromise;
  } catch (error) {
    debugLogger.warn('Cache', 'Static memory hook pack unavailable.', error);
    hookMapPromise = null;
    return null;
  }
}

export async function lookupPackMnemonic(cacheKey: string): Promise<string | null> {
  const map = await fetchMemoryHooksMap();
  if (!map) return null;
  return resolveMnemonicFromMap(map, cacheKey);
}

let levelIndexPromise: Promise<LevelIndex | null> | null = null;

/** TOCFL character/word levels (TBCL scale, HSK gap fill); null when unavailable. */
export async function fetchLevelIndex(): Promise<LevelIndex | null> {
  levelIndexPromise ??= loadPack<LevelIndex>('levels', 0).catch((error) => {
    debugLogger.warn('Cache', 'Levels pack unavailable.', error);
    levelIndexPromise = null;
    return null;
  });
  return levelIndexPromise;
}

let partsIndexPromise: Promise<PartsIndex | null> | null = null;

/** Parts index (built-with relations + sound clues); loaded once, null when unavailable. */
export async function fetchPartsIndex(): Promise<PartsIndex | null> {
  partsIndexPromise ??= loadPack<PartsIndex>('parts', 0).catch((error) => {
    debugLogger.warn('Cache', 'Parts index unavailable.', error);
    partsIndexPromise = null;
    return null;
  });
  return partsIndexPromise;
}

let pronunciationPromise: Promise<ReadingsIndex | null> | null = null;

/** Character readings, Taiwan-first; null when unavailable (screens fall back to breakdown pinyin). */
export async function fetchPronunciationIndex(): Promise<ReadingsIndex | null> {
  pronunciationPromise ??= loadPack<ReadingsIndex>('pronunciation', 0).catch((error) => {
    debugLogger.warn('Cache', 'Pronunciation pack unavailable.', error);
    pronunciationPromise = null;
    return null;
  });
  return pronunciationPromise;
}

export async function fetchReadingsPack(bookId: number): Promise<ReadingRecord[] | null> {
  try {
    return await loadPack<ReadingRecord[]>('readings', bookId);
  } catch (error) {
    debugLogger.warn('Cache', `Static readings pack unavailable for book ${bookId}.`, error);
    return null;
  }
}

export async function fetchGrammarPack(bookId: number): Promise<InteractiveGrammarPart[] | null> {
  try {
    return await loadPack<InteractiveGrammarPart[]>('grammar', bookId);
  } catch (error) {
    debugLogger.warn('Cache', `Static grammar pack unavailable for book ${bookId}.`, error);
    return null;
  }
}

export async function fetchDialogueAlignmentPack(bookId: number): Promise<Record<string, DialogueAlignment> | null> {
  try {
    return await loadPack<Record<string, DialogueAlignment>>('dialogue-alignment', bookId);
  } catch (error) {
    debugLogger.warn('Cache', `Static dialogue alignment pack unavailable for book ${bookId}.`, error);
    return null;
  }
}

