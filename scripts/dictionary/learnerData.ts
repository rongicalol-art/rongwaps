import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT } from '../../src/utils/vocabulary/dictionaryShard';
import { prepareVocabulary } from '../../src/utils/vocabulary/vocabularyMapping';
import { courseWordOf, type DictionaryRowLike } from '../../src/utils/vocabulary/wordEntry';
import { parseReadings } from '../../src/utils/pinyin/pronunciation';
import type { Flashcard } from '../../src/data/flashcards';

/** Dev-only loaders shared by the dictionary scripts (search index, word types). */

const DATA = resolve(process.cwd(), 'public/data');

export type ShardTuple = [number, string, string, string, string[]];

/** Every dictionary row, by id (shard order), and by traditional form. */
export async function readDictionaryRows(): Promise<{ byId: Map<number, ShardTuple>; byWord: Map<string, Array<DictionaryRowLike & { id: number; pinyin_accented: string; definitions: string[] }>> }> {
  const byId = new Map<number, ShardTuple>();
  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard += 1) {
    const pack = JSON.parse(await readFile(resolve(DATA, `dictionary/shard-${String(shard).padStart(2, '0')}.json`), 'utf8')) as { items: ShardTuple[] };
    for (const item of pack.items) if (!byId.has(item[0])) byId.set(item[0], item);
  }
  const byWord = new Map<string, Array<DictionaryRowLike & { id: number; pinyin_accented: string; definitions: string[] }>>();
  for (const [id, simplified, tradDiff, pinyin, definitions] of byId.values()) {
    const traditional = tradDiff || simplified;
    const list = byWord.get(traditional) ?? [];
    list.push({ id, traditional, simplified, pinyin_accented: pinyin, definitions });
    byWord.set(traditional, list);
  }
  return { byId, byWord };
}

/** Course cards of all four books, by the traditional word they teach. */
export async function readCourseCards(): Promise<Map<string, Flashcard[]>> {
  const items: unknown[] = [];
  for (const book of [1, 2, 3, 4]) {
    try {
      items.push(...((JSON.parse(await readFile(resolve(DATA, `vocabulary/book-${book}.json`), 'utf8')) as { items?: unknown[] }).items ?? []));
    } catch {
      // A missing book is skipped.
    }
  }
  const byWord = new Map<string, Flashcard[]>();
  for (const card of prepareVocabulary(items)) {
    const word = courseWordOf(card);
    if (word) byWord.set(word, [...(byWord.get(word) ?? []), card]);
  }
  return byWord;
}

/** TBCL word levels (1–7), New HSK gap fill on the same scale, from the shipped levels pack. */
export async function readLevelWords(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const pack = JSON.parse(await readFile(resolve(DATA, 'levels/levels.json'), 'utf8')) as Record<string, { words?: Record<string, string> } | unknown>;
    for (const source of ['tbcl', 'hsk']) {
      const words = (pack[source] as { words?: Record<string, string> } | undefined)?.words ?? {};
      for (const [level, list] of Object.entries(words)) {
        for (const word of list.split('|')) if (word && !map.has(word)) map.set(word, Number(level));
      }
    }
  } catch {
    // No levels pack: no level floors.
  }
  return map;
}

/** Each character's readings in the app's Taiwan-first order. */
export async function readTaiwanReadings(): Promise<Map<string, string[]>> {
  try {
    const pack = JSON.parse(await readFile(resolve(DATA, 'pronunciation/pronunciation.json'), 'utf8')) as { readings: Record<string, string> };
    return new Map(Object.entries(pack.readings).map(([character, value]) => [character, parseReadings(value).map((reading) => reading.pinyin)]));
  } catch {
    return new Map();
  }
}

/** A course-book example sentence (deduped by text), with its recording and lesson. */
export interface BookSentence {
  id: number;
  source: 'book';
  chinese: string;
  pinyin: string;
  english: string;
  audio?: unknown;
  bookId: number;
  lessonId: number;
}

/** Every course-book example sentence, from the flashcard-extras packs. */
export async function readBookSentences(): Promise<BookSentence[]> {
  const dir = resolve(DATA, 'flashcard-extras');
  const byText = new Map<string, BookSentence>();
  for (const file of (await readdir(dir)).filter((name) => /^shard-\d+\.json$/.test(name))) {
    const shard = JSON.parse(await readFile(resolve(dir, file), 'utf8')) as { items: Array<{ examples: Array<{ chinese?: string; pinyin?: string; english?: string; audio?: unknown; sourceBookId?: string | number; sourceLessonId?: string | number }> }> };
    for (const row of shard.items) for (const example of row.examples) {
      if (!example.chinese || !example.pinyin || !example.english || byText.has(example.chinese)) continue;
      byText.set(example.chinese, {
        id: byText.size, source: 'book', chinese: example.chinese, pinyin: example.pinyin, english: example.english,
        ...(example.audio ? { audio: example.audio } : {}), bookId: Number(example.sourceBookId ?? 0), lessonId: Number(example.sourceLessonId ?? 0),
      });
    }
  }
  return [...byText.values()];
}
