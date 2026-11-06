import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { alignSentenceSyllables } from '../../src/utils/pinyin/pinyinTones';
import { buildWordEntry, readingKey } from '../../src/utils/vocabulary/wordEntry';
import { posTagsKey } from '../../shared/dictionarySearch';
import { formatPosLabel } from '../../src/utils/vocabulary/posLabels';
import { readBookSentences, readCourseCards, readDictionaryRows, readTaiwanReadings, type BookSentence } from './learnerData';

/**
 * `npx tsx scripts/dictionary/exampleCandidates.ts` — dev-only. Matches the book's example
 * sentences to the word readings they contain (by the sentence's own pinyin, so 長高了 is zhǎng),
 * keeps the best few per reading, and writes Codex batches that ask which meaning each sentence shows.
 * Output (gitignored): output/dictionary-examples/{sentences.json, batches/*.json}.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-examples');
const TAGS = resolve(process.cwd(), 'content/dictionary/posTags.json');
const PER_READING = 6;
const MAX_WORD = 6;
/** Sentences around this length read best as dictionary examples ("好。" says nothing). */
const IDEAL_LENGTH = 12;
const BATCH_SIZE = 30;

export type PoolSentence = BookSentence;

export interface ExampleBatchEntry {
  /** posTagsKey of the reading. */
  key: string;
  word: string;
  pinyin: string;
  senses: Array<{ n: number; type: string; text: string }>;
  sentences: Array<{ s: number; chinese: string; english: string }>;
}

const toneless = (key: string) => key.replace(/[1-5]/g, '');

async function main() {
  const tags = (JSON.parse(await readFile(TAGS, 'utf8')) as { entries: Record<string, string> }).entries;
  const learner = [...new Set(Object.keys(tags).map((key) => key.slice(0, key.indexOf('|'))))].sort((a, b) => Array.from(b).length - Array.from(a).length);
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const taiwan = await readTaiwanReadings();
  const sentences = await readBookSentences();
  const learnerSet = new Set(learner);

  // Which reading of which learner word each sentence uses, by its own aligned pinyin.
  const candidates = new Map<string, Set<number>>();
  let aligned = 0;
  for (const sentence of sentences) {
    const syllables = alignSentenceSyllables(sentence.chinese, sentence.pinyin);
    if (!syllables) continue;
    aligned += 1;
    const chars = Array.from(sentence.chinese);
    // Whole words only (longest dictionary match): 家長 "parent" is no example of 長 zhǎng.
    const tokens: Array<{ word: string; start: number }> = [];
    for (let start = 0; start < chars.length;) {
      let length = Math.min(MAX_WORD, chars.length - start);
      while (length > 1 && !byWord.has(chars.slice(start, start + length).join(''))) length -= 1;
      tokens.push({ word: chars.slice(start, start + length).join(''), start });
      start += length;
    }
    for (const { word, start } of tokens) {
      if (!learnerSet.has(word)) continue;
      {
        const length = Array.from(word).length;
        const spoken = syllables.slice(start, start + length);
        if (spoken.some((syllable) => !syllable)) continue;
        const key = readingKey(spoken.map((syllable) => syllable!.text).join(' '));
        const rows = byWord.get(word) ?? [];
        const keys = [...new Set(rows.map((row) => readingKey(row.pinyin_accented)))];
        const match = keys.find((candidate) => candidate === key) ?? (keys.filter((candidate) => toneless(candidate) === toneless(key)).length === 1 ? keys.find((candidate) => toneless(candidate) === toneless(key)) : undefined);
        const row = match ? rows.find((item) => readingKey(item.pinyin_accented) === match) : undefined;
        if (!row) continue;
        const entryKey = posTagsKey(word, row.pinyin_accented);
        if (!tags[entryKey]) continue;
        candidates.set(entryKey, (candidates.get(entryKey) ?? new Set()).add(sentence.id));
      }
    }
  }

  // Best few per reading: book audio first, then close to a readable length, then earlier lessons.
  const rank = (sentence: PoolSentence) => (sentence.audio ? 0 : 1000) + Math.abs(Array.from(sentence.chinese).length - IDEAL_LENGTH) + (Array.from(sentence.chinese).length < 5 ? 50 : 0) + sentence.bookId * 0.1;
  const batches: ExampleBatchEntry[] = [];
  for (const [key, ids] of candidates) {
    const word = key.slice(0, key.indexOf('|'));
    const entry = buildWordEntry(word, byWord.get(word) ?? [], cards.get(word) ?? [], taiwan.get(word) ?? [], { posTags: (tagKey) => tags[tagKey] });
    const reading = entry?.readings.find((item) => posTagsKey(word, byWord.get(word)?.find((row) => readingKey(row.pinyin_accented) === item.key)?.pinyin_accented) === key);
    if (!reading) continue;
    let n = 0;
    const senses = reading.groups.flatMap((group) => group.senses.filter((sense) => !sense.ref).map((sense) => ({ n: ++n, type: formatPosLabel(group.pos) ?? 'Other', text: sense.text })));
    const picked = [...ids].map((id) => sentences[id]).sort((a, b) => rank(a) - rank(b)).slice(0, PER_READING);
    batches.push({ key, word, pinyin: reading.pinyin, senses, sentences: picked.map((sentence) => ({ s: sentence.id, chinese: sentence.chinese, english: sentence.english })) });
  }

  await rm(resolve(OUT, 'batches'), { recursive: true, force: true });
  await mkdir(resolve(OUT, 'batches'), { recursive: true });
  for (let start = 0, index = 0; start < batches.length; start += BATCH_SIZE, index += 1) {
    await writeFile(resolve(OUT, 'batches', `book-${String(index).padStart(3, '0')}.json`), JSON.stringify(batches.slice(start, start + BATCH_SIZE)), 'utf8');
  }
  await writeFile(resolve(OUT, 'sentences.json'), JSON.stringify(sentences), 'utf8');
  console.log(`Book sentences: ${sentences.length} (${aligned} with aligned pinyin); ${batches.length} readings have candidates; ${Math.ceil(batches.length / BATCH_SIZE)} batches.`);
}

main().catch((error) => {
  console.error('Example candidates failed:', error);
  process.exit(1);
});
