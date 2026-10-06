import { debugLogger } from '../utils/debugLogger';
import type { CharacterJson } from 'hanzi-writer';
import type { DBDictionaryRow, DBCharacterBreakdown, DBVocabularyRow } from '../types/database';
import type { Flashcard } from '../data/flashcards';
import type { CourseExampleRecord, ReadingRecord, InteractiveGrammarPart, DialogueAlignment } from '../types/models';
import { getDictionaryShard } from '../utils/dictionaryShard';
import { createPackLoader, type PackLoader } from './packLoader';
import {
  type ContentPackKind,
  type GenericContentManifest,
  getBreakdownShard,
  recordsToExampleCards,
  resolveMnemonicFromMap,
  type LevelIndex,
} from '../utils/packValidators';
import type { PartsIndex } from '../utils/parts';
import type { ReadingsIndex } from '../utils/pronunciation';
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

export async function fetchVocabularyPack(bookId: number): Promise<DBVocabularyRow[] | null> {
  try {
    return await loadPack<DBVocabularyRow[]>('vocabulary', bookId);
  } catch (error) {
    debugLogger.warn('Cache', `Static vocabulary pack unavailable for book ${bookId}; using Supabase.`, error);
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
      debugLogger.warn('Cache', 'Complete static vocabulary dataset unavailable; using Supabase.', error);
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

export async function fetchDictionaryRowsFromPacks(words: string[]): Promise<Map<string, DBDictionaryRow[]>> {
  const results = new Map<string, DBDictionaryRow[]>();
  try {
    const uniqueWords = [...new Set(words.map((word) => word.trim()).filter(Boolean))];
    const wordsByShard = new Map<number, Set<string>>();

    for (const word of uniqueWords) {
      const shard = getDictionaryShard(word);
      const shardWords = wordsByShard.get(shard) || new Set<string>();
      shardWords.add(word);
      wordsByShard.set(shard, shardWords);
    }

    await Promise.all([...wordsByShard.entries()].map(async ([shard, shardWords]) => {
      const rows = await loadPack<DBDictionaryRow[]>('dictionary', shard);
      if (!rows) return;
      for (const word of shardWords) {
        const matches = rows.filter((row) => row.traditional === word || row.simplified === word);
        if (matches.length > 0) results.set(word, matches);
      }
    }));
  } catch (error) {
    debugLogger.warn('Cache', 'Static dictionary packs unavailable; using Supabase.', error);
  }
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

export async function lookupStrokeData(character: string): Promise<CharacterJson | null> {
  try {
    const manifest = await getPackManifest('strokes');
    const shardCount = manifest.shardCount ?? 32;
    const shard = getBreakdownShard(character, shardCount);
    if (shard < 0) return null;
    const map = await loadPack<Map<string, CharacterJson>>('strokes', shard);
    return map?.get(character) ?? null;
  } catch (error) {
    debugLogger.warn('Cache', `Static strokes pack unavailable for ${character}.`, error);
    return null;
  }
}
