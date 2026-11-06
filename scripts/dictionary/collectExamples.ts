import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildWordEntry, readingKey } from '../../src/utils/vocabulary/wordEntry';
import { formatPosLabel } from '../../src/utils/vocabulary/posLabels';
import { posTagsKey } from '../../shared/dictionarySearch';
import { readCourseCards, readDictionaryRows, readLevelWords, readTaiwanReadings } from './learnerData';
import type { ExampleBatchEntry, PoolSentence } from './exampleCandidates';
import type { TatoebaBatchEntry, TatoebaSentence } from './tatoebaCandidates';

/**
 * `npx tsx scripts/dictionary/collectExamples.ts` — dev-only. Picks one example per word type of
 * each learner reading: the book's sentences first (recordings first), then reviewed Tatoeba
 * sentences, never for a word type the book's own card example already shows. Writes the reviewed
 * source content/dictionary/senseExamples.json, which `npm run dictionary:examples:build` ships.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-examples');
const CONTENT = resolve(process.cwd(), 'content/dictionary/senseExamples.json');
const TAGS = resolve(process.cwd(), 'content/dictionary/posTags.json');

/** One example: [sense text, chinese, pinyin, english, book recording or null, Tatoeba credit or null]. */
export type SenseExampleRow = [string, string, string, string, unknown, string | null];

const PINYIN_PUNCTUATION: Record<string, string> = { '，': ', ', '、': ', ', '。': '. ', '？': '? ', '！': '! ', '：': ': ', '；': '; ', '「': ' "', '」': '" ', '『': ' "', '』': '" ', '（': ' (', '）': ') ' };

/** Pinyin is romanized text: Chinese full-width punctuation becomes plain ", . ? !". */
export function plainPunctuation(pinyin: string): string {
  return pinyin
    .replace(/[，、。？！：；「」『』（）]/g, (mark) => PINYIN_PUNCTUATION[mark])
    .replace(/\s+([,.?!:;)"](?:\s|$))/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * A book entry can hold two sentences on separate lines; keep the one line that uses the word.
 * Its recording covers both lines, so it goes. Null when no single line can be told apart.
 */
function oneLine(word: string, chinese: string, pinyin: string, english: string, audio: unknown): [string, string, string, unknown] | null {
  if (!chinese.includes('\n')) return [chinese, pinyin, english, audio];
  const zh = chinese.split('\n');
  const py = pinyin.split('\n');
  const en = english.split('\n');
  const hits = zh.flatMap((line, index) => (line.includes(word) ? [index] : []));
  if (zh.length !== py.length || zh.length !== en.length || hits.length !== 1) return null;
  return [zh[hits[0]].trim(), py[hits[0]].trim(), en[hits[0]].trim(), null];
}

/**
 * A single character must stand alone somewhere in the sentence, not only inside a common word.
 * Greedy segmentation can split 跑過客廳 as 跑 / 過客 / 廳, which is no example of 廳 "living room".
 */
function standsAlone(word: string, chinese: string, common: ReadonlySet<string>): boolean {
  if (Array.from(word).length > 1) return true;
  const chars = Array.from(chinese);
  return chars.some((char, index) => char === word
    && !(index > 0 && common.has(chars[index - 1] + char))
    && !(index < chars.length - 1 && common.has(char + chars[index + 1])));
}

async function readPicks<T extends { key: string }>(batchDir: string, pickDir: string): Promise<Array<{ entry: T; picks: Array<{ s: number; n: number; pinyin?: string }> }>> {
  const out: Array<{ entry: T; picks: Array<{ s: number; n: number; pinyin?: string }> }> = [];
  if (!existsSync(pickDir)) return out;
  for (const file of (await readdir(pickDir)).filter((name) => name.endsWith('.json'))) {
    const entries = JSON.parse(await readFile(resolve(batchDir, file), 'utf8')) as T[];
    const answers = JSON.parse(await readFile(resolve(pickDir, file), 'utf8')) as Array<{ key: string; picks: Array<{ s: number; n: number; pinyin?: string }> }>;
    for (const answer of answers) {
      const entry = entries.find((item) => item.key === answer.key);
      if (entry) out.push({ entry, picks: answer.picks });
    }
  }
  return out;
}

async function main() {
  const tags = (JSON.parse(await readFile(TAGS, 'utf8')) as { entries: Record<string, string> }).entries;
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const taiwan = await readTaiwanReadings();
  const book = JSON.parse(await readFile(resolve(OUT, 'sentences.json'), 'utf8')) as PoolSentence[];
  const tatoeba = existsSync(resolve(OUT, 'tatoeba.json')) ? JSON.parse(await readFile(resolve(OUT, 'tatoeba.json'), 'utf8')) as TatoebaSentence[] : [];
  const levels = await readLevelWords();
  const common = new Set([...cards.keys(), ...[...levels].filter(([, level]) => level <= 4).map(([word]) => word)]);

  /** Candidate examples per reading key and word type, best first. */
  const chosen = new Map<string, Map<string, SenseExampleRow[]>>();
  const add = (key: string, type: string, row: SenseExampleRow) => {
    const types = chosen.get(key) ?? new Map<string, SenseExampleRow[]>();
    types.set(type, [...(types.get(type) ?? []), row]);
    chosen.set(key, types);
  };

  // 1. Book sentences (batches are already ranked: recordings first, readable length).
  for (const { entry, picks } of await readPicks<ExampleBatchEntry>(resolve(OUT, 'batches'), resolve(OUT, 'senses'))) {
    for (const sentence of entry.sentences) {
      const n = picks.find((pick) => pick.s === sentence.s)?.n ?? 0;
      if (n === 0) continue;
      const sense = entry.senses[n - 1];
      const source = book[sentence.s];
      const word = entry.key.slice(0, entry.key.indexOf('|'));
      const line = oneLine(word, source.chinese, source.pinyin, source.english, source.audio ?? null);
      if (!line || !standsAlone(word, line[0], common)) continue;
      add(entry.key, sense.type, [sense.text, line[0], plainPunctuation(line[1]), line[2], line[3], null]);
    }
  }

  // 2. Tatoeba: meanings are numbered across the word's readings; map each back to its reading.
  for (const { entry, picks } of await readPicks<TatoebaBatchEntry>(resolve(OUT, 'tatoeba-batches'), resolve(OUT, 'tatoeba-senses'))) {
    const word = entry.word;
    const built = buildWordEntry(word, byWord.get(word) ?? [], cards.get(word) ?? [], taiwan.get(word) ?? [], { posTags: (key) => tags[key] });
    const flat: Array<{ key: string; type: string; text: string }> = [];
    for (const reading of built?.readings.filter((item) => !item.reference) ?? []) {
      const key = posTagsKey(word, byWord.get(word)?.find((row) => readingKey(row.pinyin_accented) === reading.key)?.pinyin_accented);
      for (const group of reading.groups) for (const sense of group.senses) if (!sense.ref) flat.push({ key, type: formatPosLabel(group.pos) ?? 'Other', text: sense.text });
    }
    for (const pick of picks) {
      if (pick.n === 0 || !pick.pinyin) continue;
      const target = flat[pick.n - 1];
      const sentence = tatoeba[pick.s];
      if (!target || !sentence || !standsAlone(word, sentence.chinese, common)) continue;
      // Credit as Tatoeba gives it: "#<English id> (author) & #<Chinese id> (author)".
      add(target.key, target.type, [target.text, sentence.chinese, plainPunctuation(pick.pinyin), sentence.english, null, sentence.credit]);
    }
  }

  // One per word type; a type whose book card already shows an example gets none.
  const entries: Record<string, SenseExampleRow[]> = {};
  let fromBook = 0;
  let fromTatoeba = 0;
  for (const [key, types] of chosen) {
    const word = key.slice(0, key.indexOf('|'));
    const built = buildWordEntry(word, byWord.get(word) ?? [], cards.get(word) ?? [], taiwan.get(word) ?? [], { posTags: (tagKey) => tags[tagKey] });
    const reading = built?.readings.find((item) => posTagsKey(word, byWord.get(word)?.find((row) => readingKey(row.pinyin_accented) === item.key)?.pinyin_accented) === key);
    const rows: SenseExampleRow[] = [];
    for (const [type, candidates] of types) {
      const group = reading?.groups.find((item) => (formatPosLabel(item.pos) ?? 'Other') === type);
      if (!group || group.senses.some((sense) => sense.example)) continue;
      // Book before Tatoeba, recordings first; otherwise the batches' readable-length order.
      const bookFirst = [...candidates].sort((a, b) => Number(Boolean(a[5])) - Number(Boolean(b[5])) || Number(!a[4]) - Number(!b[4]));
      const pick = bookFirst.find((row) => group.senses.some((sense) => sense.text === row[0]));
      if (!pick) continue;
      rows.push(pick);
      if (pick[5]) fromTatoeba += 1; else fromBook += 1;
    }
    if (rows.length) entries[key] = rows;
  }

  await mkdir(resolve(CONTENT, '..'), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  await writeFile(CONTENT, `${JSON.stringify({
    schemaVersion: 1,
    source: 'One example per word type: sentences from the course books, else from Tatoeba (tatoeba.org, CC BY 2.0 FR; credit = sentence ids and authors), matched to meanings with Codex; Tatoeba pinyin written by Codex and checked against the dictionary readings.',
    format: '"<word>|<reading>": [[sense text, chinese, pinyin, english, book recording or null, Tatoeba credit "#<id> (author) & #<id> (author)" or null], …]',
    count: Object.keys(sorted).length,
    entries: sorted,
  }, null, 1)}\n`, 'utf8');
  console.log(`Examples: ${Object.keys(sorted).length} readings, ${fromBook} from the books, ${fromTatoeba} from Tatoeba.`);

  // Coverage of common words (book words, TBCL/HSK levels 1–4): every word type with an example?
  let words = 0;
  let complete = 0;
  let types = 0;
  let withExample = 0;
  for (const word of new Set([...cards.keys(), ...[...levels].filter(([, level]) => level <= 4).map(([item]) => item)])) {
    const built = buildWordEntry(word, byWord.get(word) ?? [], cards.get(word) ?? [], taiwan.get(word) ?? [], { posTags: (key) => tags[key], senseExamples: (key) => sorted[key] });
    const main = built?.readings[0];
    if (!main || main.reference) continue;
    const groups = main.groups.filter((group) => group.pos);
    if (groups.length === 0) continue;
    words += 1;
    const shown = groups.filter((group) => group.senses.some((sense) => sense.example)).length;
    types += groups.length;
    withExample += shown;
    if (shown === groups.length) complete += 1;
  }
  console.log(`Common words: ${complete} of ${words} (${Math.round((complete / words) * 100)}%) have an example for every word type of their main reading; ${withExample} of ${types} word types (${Math.round((withExample / types) * 100)}%) have one.`);
}

main().catch((error) => {
  console.error('Collecting examples failed:', error);
  process.exit(1);
});
