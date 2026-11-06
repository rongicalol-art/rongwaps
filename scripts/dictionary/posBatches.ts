import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { linkCourseReadings, readingDictionarySenses, readingKey, senseChecksum } from '../../src/utils/vocabulary/wordEntry';
import { readCourseCards, readDictionaryRows, readLevelWords } from './learnerData';
import type { WiktionaryEvidence } from './extractWiktionary';

/**
 * `npx tsx scripts/dictionary/posBatches.ts` — dev-only. Splits every learner word's dictionary
 * readings into tagging batches with their evidence (the book's tags, Wiktionary's word types).
 *
 * Output (gitignored): output/dictionary-pos/entries.json (one record per word and reading: id,
 * sense checksum, which senses are pointers) and output/dictionary-pos/batches/{single,multi}-NNN.json.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');
const EVIDENCE = resolve(process.cwd(), 'output/wiktionary/learner.json');
const BATCH_SIZE = 40;
const MAX_GLOSSES = 8;

export interface PosEntryRecord {
  id: string;
  word: string;
  key: string;
  checksum: string;
  senses: string[];
  /** Indices of pointer senses ("variant of 和"): no word type. */
  pointers: number[];
  book: Array<{ pos: string; meaning: string; lesson: string }>;
}

export interface PosBatchEntry {
  id: string;
  word: string;
  pinyin: string;
  /** Numbered senses to tag (pointer senses left out). */
  senses: Array<{ n: number; text: string }>;
  book?: Array<{ pos: string; meaning: string }>;
  wiktionary?: Array<{ pos: string; glosses: string[] }>;
}

const cleanReading = (reading: string) => reading.replace(/\s*\([^)]*\)/g, '').trim();

async function main() {
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const learner = [...new Set([...cards.keys(), ...(await readLevelWords()).keys()])].filter((word) => byWord.has(word)).sort();
  const evidence = JSON.parse(await readFile(EVIDENCE, 'utf8')) as Record<string, WiktionaryEvidence[]>;

  const records: PosEntryRecord[] = [];
  const single: PosBatchEntry[] = [];
  const multi: PosBatchEntry[] = [];
  for (const word of learner) {
    const rows = byWord.get(word)!;
    const links = linkCourseReadings(rows, cards.get(word) ?? []);
    for (const key of [...new Set(rows.map((row) => readingKey(row.pinyin_accented)).filter(Boolean))]) {
      const readingRows = rows.filter((row) => readingKey(row.pinyin_accented) === key);
      const { senses } = readingDictionarySenses(readingRows);
      const pointers = senses.flatMap((sense, index) => (sense.ref ? [index] : []));
      if (senses.length === pointers.length) continue;
      const id = `${word}\u0000${key}`;
      const book = (links.get(key) ?? []).map((card) => ({ pos: card.pos ?? '', meaning: card.back, lesson: `B${card.bookId}L${card.lessonId}` }));
      records.push({ id, word, key, checksum: senseChecksum(senses), senses: senses.map((sense) => sense.text), pointers, book });

      const wiki = (evidence[word] ?? []).filter((item) => item.readings.some((reading) => readingKey(cleanReading(reading)) === key));
      const toneless = (value: string) => value.replace(/[1-5]/g, '');
      const loose = wiki.length ? wiki : (evidence[word] ?? []).filter((item) => item.readings.some((reading) => toneless(readingKey(cleanReading(reading))) === toneless(key)));
      const entry: PosBatchEntry = {
        id,
        word,
        pinyin: readingRows[0].pinyin_accented,
        senses: senses.flatMap((sense, index) => (sense.ref ? [] : [{ n: index + 1, text: sense.text }])),
        ...(book.length ? { book: book.map(({ pos, meaning }) => ({ pos, meaning })) } : {}),
        ...(loose.length ? { wiktionary: loose.map((item) => ({ pos: item.pos, glosses: item.senses.slice(0, MAX_GLOSSES).map((sense) => sense.gloss) })) } : {}),
      };
      (Array.from(word).length === 1 ? single : multi).push(entry);
    }
  }

  await rm(resolve(OUT, 'batches'), { recursive: true, force: true });
  await mkdir(resolve(OUT, 'batches'), { recursive: true });
  const write = async (name: string, entries: PosBatchEntry[]) => {
    for (let start = 0, index = 0; start < entries.length; start += BATCH_SIZE, index += 1) {
      await writeFile(resolve(OUT, 'batches', `${name}-${String(index).padStart(3, '0')}.json`), JSON.stringify(entries.slice(start, start + BATCH_SIZE)), 'utf8');
    }
  };
  await write('single', single);
  await write('multi', multi);
  await writeFile(resolve(OUT, 'entries.json'), JSON.stringify(records), 'utf8');
  const senseCount = (entries: PosBatchEntry[]) => entries.reduce((sum, entry) => sum + entry.senses.length, 0);
  console.log(`Word types: ${learner.length} learner words, ${records.length} readings to tag.`);
  console.log(`  single characters: ${single.length} readings, ${senseCount(single)} senses, ${Math.ceil(single.length / BATCH_SIZE)} batches`);
  console.log(`  words: ${multi.length} readings, ${senseCount(multi)} senses, ${Math.ceil(multi.length / BATCH_SIZE)} batches (${multi.filter((entry) => entry.wiktionary).length} with Wiktionary)`);
}

main().catch((error) => {
  console.error('Word-type batches failed:', error);
  process.exit(1);
});
