import { extractSearchVariants, sentenceMatchesForms } from '../shared/wordForms';
import type { CourseExampleRecord } from '../src/types/models';
import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDictionaryIndex } from '../shared/dictionaryIndex';
import { sanitizeDictionaryDefinitions } from '../shared/dictionaryDefinitions';
import { getDictionaryShard } from '../shared/dictionaryShard';
import { parseMembers, type PartsIndex } from '../shared/parts';
import { searchByCharacterComponents, segmentChineseQuery, segmentPinyinQuery, type CompactSearchEntry, type SearchResult } from '../shared/dictionarySearch';
import type { Flashcard } from '../src/data/flashcards';
import type { WordExample } from '../src/types/models';
import type { StudyPack, StudyPart } from '../src/utils/vocabulary/studyPack';
import type { DBDictionaryRow } from '../src/types/database';

const root = workerData.root as string;
const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(path.startsWith('/data/study/') || path === '/data/search/course-lookup.json' ? workerData.generatedRoot : root, `.${path}`), 'utf8')) as T;
const shards = new Map<number, Promise<DBDictionaryRow[]>>();
async function lookup(words: string[]) {
  const result: Record<string, DBDictionaryRow[]> = {};
  await Promise.all(words.map(async word => {
    const key = getDictionaryShard(word);
    let promise = shards.get(key);
    if (!promise) {
      promise = json<{ schemaVersion: number; items: unknown[] }>(`/data/dictionary/shard-${String(key).padStart(2, '0')}.json`).then(pack => pack.schemaVersion === 2
        ? (pack.items as [number, string, string, string, DBDictionaryRow['definitions']][]).map(([id, simplified, traditional, pinyin_accented, definitions]) => ({ id, simplified, traditional: traditional || simplified, pinyin_accented, pinyin_flat: null, definitions }))
        : pack.items as DBDictionaryRow[]).catch(error => { shards.delete(key); throw error; });
      shards.set(key, promise);
      if (shards.size > 8) shards.delete(shards.keys().next().value!);
    }
    result[word] = (await promise).filter(row => row.traditional === word || row.simplified === word);
  }));
  return result;
}

async function start() {
  const { items } = await json<{ items: CompactSearchEntry[] }>('/data/search/dictionary-search-index.json');
  const index = createDictionaryIndex(items);
  const coursePack = await json<{ cards: Flashcard[]; entries: [string, number][] }>('/data/search/course-lookup.json');
  const course = new Map(coursePack.entries.map(([key, id]) => [key, coursePack.cards[id]]));
  const { parts: studyParts } = await json<{ parts: StudyPart[] }>('/data/study/manifest.json');
  const studyCache = new Map<string, StudyPack>();
  let corpus: CourseExampleRecord[] | undefined;
  const examples = async (word: string, limit: number): Promise<WordExample[]> => {
    const card = course.get(word);
    if (card) {
      const part = studyParts.find(part => part.ids.includes(card.id));
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
    if (!corpus) {
      const manifest = await json<{ books: Array<{ path: string }> }>('/data/course-examples/manifest.json');
      corpus = (await Promise.all(manifest.books.map(book => json<{ records: CourseExampleRecord[] }>(book.path)))).flatMap(pack => pack.records);
    }
    const forms = extractSearchVariants(word);
    const sentences: WordExample[] = corpus.filter(record => sentenceMatchesForms(record.traditional, forms, card?.pos)
      || sentenceMatchesForms(record.simplified, forms, card?.pos)).map(record => ({
        chinese: record.traditional, pinyin: record.pinyin, english: record.english, audio: record.audio,
        sourceCardId: record.sourceCardId, sourceFront: record.sourceFront, sourceBookId: record.bookId, sourceLessonId: record.lessonId,
      }));
    for (const source of new Map([...course.values()].map(card => [card.id, card])).values()) for (const example of source.examples ?? []) {
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
  };
  const pack = await json<{ parents: Record<string, string>; phonetic: Record<string, string> }>('/data/relations/parts.json');
  const parts: PartsIndex = { parents: new Map(Object.entries(pack.parents).map(([key, value]) => [key, parseMembers(value)])), phonetic: new Map(Object.entries(pack.phonetic)) };
  const cache = new Map<string, SearchResult[]>();
  parentPort!.on('message', async ({ id, query, words, limit, kind }: { id: number; query?: string; words?: string[]; limit: number; kind?: string }) => {
    try {
      if (kind === 'course') {
        const selected = new Map<string, Flashcard>();
        for (const word of words ?? []) for (const [key, card] of course) {
          if (key === word || key.startsWith(word + '\u0000')) selected.set(`${card.id}:${card.pinyin}`, card);
        }
        parentPort!.postMessage({ id, result: [...selected.values()] }); return;
      }
      if (kind === 'examples') { parentPort!.postMessage({ id, result: await examples(query!, limit) }); return; }
      if (words) { parentPort!.postMessage({ id, result: await lookup(words) }); return; }
      const key = `${query}:${limit}`;
      let results = cache.get(key);
      if (!results) {
        const q = query!;
        results = searchByCharacterComponents(items, parts, q, limit);
        if (!results.length) results = index.search(q, limit);
        if (!results.length) results = /\p{Script=Han}/u.test(q) ? segmentChineseQuery(items, q, limit) : segmentPinyinQuery(items, q, limit);
        // The compact search corpus excludes rare stubs; exact dictionary entries still lead.
        const exact = !/[\s+＋*?＊？a-z]/i.test(q) && /\p{Script=Han}/u.test(q) ? (await lookup([q]))[q].map((row): SearchResult => ({
          id: row.id, simplified: row.simplified, traditional: row.traditional, pinyin_accented: row.pinyin_accented ?? '',
          ...sanitizeDictionaryDefinitions(row.definitions), match_type: 'exact', total_score: 6200 + (row.frequency_score ?? 0),
        })) : [];
        const seen = new Set(exact.flatMap(row => [row.simplified, row.traditional]));
        results = [...exact, ...results.filter(row => !seen.has(row.simplified) && !seen.has(row.traditional))].slice(0, limit);
        results = results.map(row => {
          const card = course.get(row.traditional) ?? course.get(row.simplified);
          return card ? { ...row, courseDefinition: card.back, bookId: card.bookId, lessonId: card.lessonId, pos: card.pos,
            ...(card.pinyin?.trim().toLowerCase() === row.pinyin_accented.trim().toLowerCase() ? { audio: card.audio } : {}),
          } : row;
        });
        cache.set(key, results);
        if (cache.size > 96) cache.delete(cache.keys().next().value!);
      }
      parentPort!.postMessage({ id, result: results });
    } catch { parentPort!.postMessage({ id, error: 'Dictionary unavailable. Please try again.' }); }
  });
  parentPort!.postMessage({ ready: true });
}
void start().catch(() => { parentPort!.postMessage({ fatal: 'Dictionary could not load' }); });
