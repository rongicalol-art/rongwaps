import { extractSearchVariants, sentenceMatchesForms } from '../../shared/wordForms';
import { createDictionaryIndex } from '../../shared/dictionaryIndex';
import { sanitizeDictionaryDefinitions } from '../../shared/dictionaryDefinitions';
import { getDictionaryShard } from '../../shared/dictionaryShard';
import { parseMembers, type PartsIndex } from '../../shared/parts';
import { courseFields, firstPosTag, posTagsKey, rankExactRows, searchByCharacterComponents, searchEntryKey, segmentChineseQuery, segmentPinyinQuery, type CompactSearchEntry, type SearchResult } from '../../shared/dictionarySearch';
import type { Flashcard } from '../data/flashcards';
import type { CourseExampleRecord, WordExample } from '../types/models';
import type { StudyPack, StudyPart } from '../utils/vocabulary/studyPack';
import type { DBDictionaryRow } from '../types/database';

/**
 * The whole dictionary (search, exact rows, lesson cards, example sentences) over the content packs.
 * It runs on the learner's device in a worker (dictionary.worker.ts), so searching costs the host nothing
 * and keeps working offline once the packs are in the browser cache. Each part loads on first use:
 * tapping a word never waits for the search index.
 */
export type DictionaryLoader = <T>(path: string) => Promise<T>;
export interface DictionaryEngine {
  search(query: string, limit: number): Promise<SearchResult[]>;
  lookup(words: string[]): Promise<Record<string, DBDictionaryRow[]>>;
  course(words: string[]): Promise<Flashcard[]>;
  examples(word: string, limit: number): Promise<WordExample[]>;
}

type ShardManifest = { shards: Array<{ shard: number; path: string; sha256?: string }> };
type DictionaryShard = { schemaVersion: number; items: unknown[] };

/** A failed load is forgotten, so the next request tries again. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let value: Promise<T> | undefined;
  return () => {
    value ??= load().catch(error => { value = undefined; throw error; });
    return value;
  };
}

export function createDictionaryEngine(json: DictionaryLoader): DictionaryEngine {
  /** `shard.json?v=<hash>` is content-addressed: the browser keeps it without asking again. */
  const shardPaths = (name: string) => once(async () => {
    const manifest = await json<ShardManifest>(`/data/${name}/manifest.json`);
    return new Map(manifest.shards.map(({ shard, path, sha256 }) => [shard, sha256 ? `${path}?v=${sha256.slice(0, 16)}` : path]));
  });
  const fallbackPath = (name: string, shard: number) => `/data/${name}/shard-${String(shard).padStart(2, '0')}.json`;
  const dictionaryPaths = shardPaths('dictionary');
  const posPaths = shardPaths('dictionary-pos');

  const shards = new Map<number, Promise<DictionaryShard>>();
  /** Word types of dictionary senses (all 64 shards stay cached: ~1 MB). */
  const posShards = new Map<number, Promise<Record<string, string>>>();
  async function wordTypeOf(row: Pick<SearchResult, 'traditional' | 'pinyin_accented'>): Promise<string | undefined> {
    const shard = getDictionaryShard(row.traditional);
    let pack = posShards.get(shard);
    if (!pack) {
      pack = posPaths().then(paths => json<{ items: Record<string, string> }>(paths.get(shard) ?? fallbackPath('dictionary-pos', shard)))
        .then(data => data.items).catch(() => ({}));
      posShards.set(shard, pack);
    }
    return firstPosTag((await pack)[posTagsKey(row.traditional, row.pinyin_accented)]);
  }

  async function lookup(words: string[]) {
    const result: Record<string, DBDictionaryRow[]> = {};
    const byShard = new Map<number, Set<string>>();
    for (const word of words) {
      result[word] = [];
      const key = getDictionaryShard(word);
      const group = byShard.get(key) ?? new Set<string>();
      group.add(word);
      byShard.set(key, group);
    }
    await Promise.all([...byShard].map(async ([key, group]) => {
      let promise = shards.get(key);
      if (!promise) {
        const loading = dictionaryPaths().then(paths => json<DictionaryShard>(paths.get(key) ?? fallbackPath('dictionary', key)));
        loading.catch(() => { if (shards.get(key) === loading) shards.delete(key); });
        promise = loading;
        shards.set(key, promise);
        if (shards.size > 12) shards.delete(shards.keys().next().value!);
      }
      const pack = await promise;
      if (pack.schemaVersion === 2) {
        for (const [id, simplified, rawTraditional, pinyin_accented, definitions] of pack.items as [number, string, string, string, DBDictionaryRow['definitions']][]) {
          const traditional = rawTraditional || simplified;
          const matchTrad = group.has(traditional);
          const matchSimp = simplified !== traditional && group.has(simplified);
          if (!matchTrad && !matchSimp) continue;
          const row: DBDictionaryRow = { id, simplified, traditional, pinyin_accented, pinyin_flat: null, definitions };
          if (matchTrad) result[traditional].push(row);
          if (matchSimp) result[simplified].push(row);
        }
      } else {
        for (const row of pack.items as DBDictionaryRow[]) {
          if (group.has(row.traditional)) result[row.traditional].push(row);
          if (row.simplified !== row.traditional && group.has(row.simplified)) result[row.simplified].push(row);
        }
      }
    }));
    return result;
  }

  const courseData = once(async () => {
    const pack = await json<{ cards: Flashcard[]; entries: [string, number][]; rows: [number, number][] }>('/data/search/course-lookup.json');
    const byKey = new Map(pack.entries.map(([key, id]) => [key, pack.cards[id]]));
    // The lesson card of each dictionary row's own reading (built with the wordEntry rules).
    const byRow = new Map(pack.rows.map(([rowId, id]) => [rowId, pack.cards[id]]));
    const byWord = new Map<string, Flashcard[]>();
    for (const [key, card] of byKey) {
      const word = key.split('\u0000')[0];
      const list = byWord.get(word) ?? [];
      list.push(card);
      byWord.set(word, list);
    }
    return { byKey, byRow, byWord };
  });

  async function course(words: string[]) {
    const { byWord } = await courseData();
    const selected = new Map<string, Flashcard>();
    for (const word of words) for (const card of byWord.get(word) ?? []) selected.set(`${card.id}:${card.pinyin}`, card);
    return [...selected.values()];
  }

  const studyParts = once(async () => (await json<{ parts: StudyPart[] }>('/data/study/manifest.json')).parts);
  const studyCache = new Map<string, StudyPack>();
  const corpus = once(async () => {
    const manifest = await json<{ books: Array<{ path: string }> }>('/data/course-examples/manifest.json');
    return (await Promise.all(manifest.books.map(book => json<{ records: CourseExampleRecord[] }>(book.path)))).flatMap(pack => pack.records);
  });

  async function examples(word: string, limit: number): Promise<WordExample[]> {
    const { byKey } = await courseData();
    const card = byKey.get(word);
    if (card) {
      const part = (await studyParts()).find(part => part.ids.includes(card.id));
      if (part) {
        let pack = studyCache.get(part.path);
        if (!pack) { pack = await json<StudyPack>(part.path); studyCache.set(part.path, pack); }
        if (studyCache.size > 4) studyCache.delete(studyCache.keys().next().value!);
        const extras = pack.extras.find(row => JSON.parse(row.key)[0] === card.id);
        const sentences = extras?.examples.map(([id]) => pack!.sentences[id]).filter(example => example.chinese.includes(word)) ?? [];
        // Study packs hold same-lesson examples only; a short list tops up from the full corpus below.
        if (sentences.length >= limit) return [...sentences.filter(sentence => sentence.audio), ...sentences.filter(sentence => !sentence.audio)].slice(0, limit);
      }
    }
    const records = await corpus();
    const forms = extractSearchVariants(word);
    const sentences: WordExample[] = records.filter(record => sentenceMatchesForms(record.traditional, forms, card?.pos)
      || sentenceMatchesForms(record.simplified, forms, card?.pos)).map(record => ({
        chinese: record.traditional, pinyin: record.pinyin, english: record.english, audio: record.audio,
        sourceCardId: record.sourceCardId, sourceFront: record.sourceFront, sourceBookId: record.bookId, sourceLessonId: record.lessonId,
      }));
    for (const source of new Map([...byKey.values()].map(card => [card.id, card])).values()) for (const example of source.examples ?? []) {
      if (sentenceMatchesForms(example.chinese, forms, card?.pos)) sentences.push({ ...example,
        sourceCardId: source.id, sourceFront: source.front, sourceBookId: source.bookId, sourceLessonId: source.lessonId,
      });
    }
    const seen = new Set<string>();
    return [...sentences.filter(sentence => sentence.audio), ...sentences.filter(sentence => !sentence.audio)]
      .filter(sentence => {
        if (!sentence.chinese.includes(word) || !sentence.pinyin || !sentence.english || seen.has(sentence.chinese)) return false;
        seen.add(sentence.chinese); return true;
      }).slice(0, limit);
  }

  const searchData = once(async () => {
    const [{ items }, pack] = await Promise.all([
      json<{ items: CompactSearchEntry[] }>('/data/search/dictionary-search-index.json'),
      json<{ parents: Record<string, string>; phonetic: Record<string, string> }>('/data/relations/parts.json'),
    ]);
    const parts: PartsIndex = { parents: new Map(Object.entries(pack.parents).map(([key, value]) => [key, parseMembers(value)])), phonetic: new Map(Object.entries(pack.phonetic)) };
    return { items, parts, index: createDictionaryIndex(items), scoreById: new Map(items.map(item => [item[0], item[6]])) };
  });
  const cache = new Map<string, SearchResult[]>();

  async function search(query: string, limit: number): Promise<SearchResult[]> {
    const key = `${query}:${limit}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const [{ items, parts, index, scoreById }, { byRow }] = await Promise.all([searchData(), courseData()]);
    let results = searchByCharacterComponents(items, parts, query, limit);
    if (!results.length) results = index.search(query, limit);
    if (!results.length) results = /\p{Script=Han}/u.test(query) ? segmentChineseQuery(items, query, limit) : segmentPinyinQuery(items, query, limit);
    // The compact search corpus excludes rare stubs; exact dictionary entries still lead.
    const exactRows = !/[\s+＋*?＊？a-z]/i.test(query) && /\p{Script=Han}/u.test(query) ? rankExactRows((await lookup([query]))[query], query, row => scoreById.get(row.id)) : [];
    const exact = exactRows.map((row): SearchResult => ({
      id: row.id, simplified: row.simplified, traditional: row.traditional, pinyin_accented: row.pinyin_accented ?? '',
      ...sanitizeDictionaryDefinitions(row.definitions), match_type: 'exact', total_score: 6200 + (scoreById.get(row.id) ?? 0),
    }));
    // One row per word and reading.
    const seen = new Set<string>();
    results = [...exact, ...results].filter(row => {
      const entry = searchEntryKey(row.traditional, row.pinyin_accented);
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    }).slice(0, limit);
    // The lesson's meaning and tag, else the word type of the dictionary's first sense.
    results = await Promise.all(results.map(async row => {
      const card = byRow.get(row.id);
      if (card) return { ...row, ...courseFields(row, card) };
      const pos = await wordTypeOf(row);
      return pos ? { ...row, pos } : row;
    }));
    cache.set(key, results);
    if (cache.size > 96) cache.delete(cache.keys().next().value!);
    return results;
  }

  return { search, lookup, course, examples };
}
