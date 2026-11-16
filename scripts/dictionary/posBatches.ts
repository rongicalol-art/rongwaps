import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { posTagsKey } from '../../shared/dictionarySearch';
import { linkCourseReadings, readingDictionarySenses, readingKey, senseChecksum } from '../../src/utils/vocabulary/wordEntry';
import { readCourseCards, readDictionaryRows, readLevelWords } from './learnerData';
import { HELPER_BRIEF } from './tagPos';
import type { WiktionaryEvidence } from './extractWiktionary';

/**
 * `npx tsx scripts/dictionary/posBatches.ts [--all]` — dev-only. Splits dictionary readings into
 * tagging batches with their evidence (the book's tags, Wiktionary's word types).
 *
 * Default: every learner word (book + TBCL/HSK levels), batches `single-NNN` and `multi-NNN`.
 * `--all`: every dictionary reading that content/dictionary/posTags.json doesn't cover yet, by kind:
 *   names-NNN   proper names (capitalised pinyin): tagged Name by rule
 *   nouns-NNN   words Wiktionary knows only as a noun: tagged N by rule
 *   single-NNN  single characters
 *   multi-NNN   words with Wiktionary evidence
 *   plain-NNN   2–3 character words without evidence
 *   long-NNN    longer words and idioms without evidence
 * Rule kinds get their tags file right away; a helper then scans them for exceptions.
 *
 * Output (gitignored): output/dictionary-pos/entries.json (one record per word and reading: id,
 * sense checksum, which senses are pointers), batches/<kind>-NNN.json, HELPER.md (the helper's
 * brief) and agent/<batch>.txt, the same batch as plain numbered text for a helper that answers in
 * answers/<batch>.txt (`tagPos.ts --answers` turns those into tags files).
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');
const CONTENT = resolve(process.cwd(), 'content/dictionary/posTags.json');
const BATCH_SIZE = 40;
const RULE_BATCH_SIZE = 200;
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

export type PosKind = 'names' | 'nouns' | 'single' | 'multi' | 'plain' | 'long';
export const RULE_TAG: Partial<Record<PosKind, string>> = { names: 'Name', nouns: 'N' };

const cleanReading = (reading: string) => reading.replace(/\s*\([^)]*\)/g, '').trim();
const toneless = (value: string) => value.replace(/[1-5]/g, '');
/** Senses a blanket "noun" can't be trusted for. */
const NOT_PLAIN_NOUN = /^to\s|\bmeasure word\b|\bclassifier for\b|\(bound form\)|\bsurname\b/i;

/** How a reading gets its tags in `--all` mode. `exact`: Wiktionary entries of this very reading. */
export function posKind(word: string, pinyins: readonly string[], entry: PosBatchEntry, exact: readonly WiktionaryEvidence[]): PosKind {
  if (/^\p{Script=Han}/u.test(word) && pinyins.every((pinyin) => /^\p{Lu}/u.test(pinyin))) return 'names';
  if (Array.from(word).length === 1) return 'single';
  if (exact.length > 0 && exact.every((item) => item.pos === 'noun') && !pinyins.some((pinyin) => /^\p{Lu}/u.test(pinyin)) && !entry.senses.some((sense) => NOT_PLAIN_NOUN.test(sense.text))) return 'nouns';
  if (entry.wiktionary) return 'multi';
  return Array.from(word).length <= 3 ? 'plain' : 'long';
}

/** A batch as plain numbered text: what a helper reads. */
export function agentView(entries: readonly PosBatchEntry[]): string {
  const short = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
  return `${entries.map((entry, index) => [
    `#${index + 1} ${entry.word} ${entry.pinyin}`,
    ...entry.senses.map((sense, senseIndex) => `  ${senseIndex + 1}. ${sense.text}`),
    ...(entry.book ?? []).map((book) => `  book: ${book.pos || '?'} — ${short(book.meaning, 80)}`),
    ...(entry.wiktionary ?? []).map((item) => `  wiktionary: ${item.pos} — ${short(item.glosses.slice(0, 4).join(' | '), 160)}`),
  ].join('\n')).join('\n')}\n`;
}

export interface PosReading { record: PosEntryRecord; entry: PosBatchEntry; kind: PosKind; pinyins: string[] }

/** Every reading with senses to tag: learner words by default, the whole dictionary with `all`. */
export async function buildReadings(all: boolean): Promise<PosReading[]> {
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const words = all
    ? [...byWord.keys()].sort()
    : [...new Set([...cards.keys(), ...(await readLevelWords()).keys()])].filter((word) => byWord.has(word)).sort();
  const evidence = JSON.parse(await readFile(resolve(process.cwd(), `output/wiktionary/${all ? 'all' : 'learner'}.json`), 'utf8')) as Record<string, WiktionaryEvidence[]>;

  const readings: PosReading[] = [];
  for (const word of words) {
    const rows = byWord.get(word)!;
    const links = linkCourseReadings(rows, cards.get(word) ?? []);
    for (const key of [...new Set(rows.map((row) => readingKey(row.pinyin_accented)).filter(Boolean))]) {
      const readingRows = rows.filter((row) => readingKey(row.pinyin_accented) === key);
      const { senses } = readingDictionarySenses(readingRows);
      const pointers = senses.flatMap((sense, index) => (sense.ref ? [index] : []));
      if (senses.length === pointers.length) continue;
      const id = `${word}\u0000${key}`;
      const book = (links.get(key) ?? []).map((card) => ({ pos: card.pos ?? '', meaning: card.back, lesson: `B${card.bookId}L${card.lessonId}` }));
      const record: PosEntryRecord = { id, word, key, checksum: senseChecksum(senses), senses: senses.map((sense) => sense.text), pointers, book };

      const exact = (evidence[word] ?? []).filter((item) => item.readings.some((reading) => readingKey(cleanReading(reading)) === key));
      const loose = exact.length ? exact : (evidence[word] ?? []).filter((item) => item.readings.some((reading) => toneless(readingKey(cleanReading(reading))) === toneless(key)));
      const entry: PosBatchEntry = {
        id,
        word,
        pinyin: readingRows[0].pinyin_accented,
        senses: senses.flatMap((sense, index) => (sense.ref ? [] : [{ n: index + 1, text: sense.text }])),
        ...(book.length ? { book: book.map(({ pos, meaning }) => ({ pos, meaning })) } : {}),
        ...(loose.length ? { wiktionary: loose.map((item) => ({ pos: item.pos, glosses: item.senses.slice(0, MAX_GLOSSES).map((sense) => sense.gloss) })) } : {}),
      };
      const pinyins = [...new Set(readingRows.map((row) => row.pinyin_accented))];
      const kind = all ? posKind(word, pinyins, entry, exact) : Array.from(word).length === 1 ? 'single' : 'multi';
      readings.push({ record, entry, kind, pinyins });
    }
  }
  return readings;
}

async function main() {
  const all = process.argv.includes('--all');
  const covered = all && existsSync(CONTENT) ? (JSON.parse(await readFile(CONTENT, 'utf8')) as { entries: Record<string, string> }).entries : {};
  const readings = (await buildReadings(all)).filter(({ record, pinyins }) => !pinyins.every((pinyin) => covered[posTagsKey(record.word, pinyin)]?.startsWith(`${record.checksum}|`)));

  for (const dir of ['batches', 'agent']) {
    await rm(resolve(OUT, dir), { recursive: true, force: true });
    await mkdir(resolve(OUT, dir), { recursive: true });
  }
  await mkdir(resolve(OUT, 'tags'), { recursive: true });
  console.log(`Word types: ${readings.length} readings to tag${all ? ' (not in posTags.json yet)' : ''}.`);
  for (const kind of ['names', 'nouns', 'single', 'multi', 'plain', 'long'] as const) {
    const entries = readings.filter((reading) => reading.kind === kind).map((reading) => reading.entry);
    if (entries.length === 0) continue;
    const rule = RULE_TAG[kind];
    const size = rule ? RULE_BATCH_SIZE : BATCH_SIZE;
    for (let start = 0, index = 0; start < entries.length; start += size, index += 1) {
      const name = `${kind}-${String(index).padStart(3, '0')}`;
      const batch = entries.slice(start, start + size);
      await writeFile(resolve(OUT, 'batches', `${name}.json`), JSON.stringify(batch), 'utf8');
      if (rule) await writeFile(resolve(OUT, 'tags', `${name}.json`), JSON.stringify({ model: 'rule', tags: Object.fromEntries(batch.map((entry) => [entry.id, entry.senses.map(() => rule)])) }), 'utf8');
      await writeFile(resolve(OUT, 'agent', `${name}.txt`), `${rule ? `Every sense below is tagged ${rule}.\n` : ''}${agentView(batch)}`, 'utf8');
    }
    const senses = entries.reduce((sum, entry) => sum + entry.senses.length, 0);
    console.log(`  ${kind}: ${entries.length} readings, ${senses} senses, ${Math.ceil(entries.length / size)} batches${rule ? ` (rule: ${rule})` : ` (${entries.filter((entry) => entry.wiktionary).length} with Wiktionary)`}`);
  }
  await mkdir(resolve(OUT, 'answers'), { recursive: true });
  await writeFile(resolve(OUT, 'HELPER.md'), `${HELPER_BRIEF}\n`, 'utf8');
  await writeFile(resolve(OUT, 'entries.json'), JSON.stringify(readings.map((reading) => reading.record)), 'utf8');
}

if (process.argv[1]?.endsWith('posBatches.ts')) {
  main().catch((error) => {
    console.error('Word-type batches failed:', error);
    process.exit(1);
  });
}
