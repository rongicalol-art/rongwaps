import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildWordEntry, readingKey } from '../../src/utils/vocabulary/wordEntry';
import { formatPosLabel } from '../../src/utils/vocabulary/posLabels';
import { posTagsKey } from '../../shared/dictionarySearch';
import { readCourseCards, readDictionaryRows, readLevelWords, readTaiwanReadings } from './learnerData';
import type { ExampleBatchEntry } from './exampleCandidates';

/**
 * `npx tsx scripts/dictionary/tatoebaCandidates.ts` — dev-only. For common learner words (book words
 * and TBCL/HSK levels 1–4) whose word types still have no book example, finds human-written
 * sentences in Tatoeba (output/tatoeba/cmn.txt from manythings.org, CC BY 2.0 FR), converted to
 * traditional characters with the dictionary's own word forms, and writes Codex batches that pick the
 * meaning, write book-style pinyin and drop unnatural sentences.
 * Output (gitignored): output/dictionary-examples/{tatoeba.json, tatoeba-batches/*.json}.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-examples');
const TATOEBA = resolve(process.cwd(), 'output/tatoeba/cmn.txt');
const TAGS = resolve(process.cwd(), 'content/dictionary/posTags.json');
const MAX_LEVEL = 4;
const PER_WORD = 10;
const BATCH_SIZE = 15;
const MAX_WORD = 6;

export interface TatoebaSentence { id: number; chinese: string; english: string; credit: string }
export interface TatoebaBatchEntry extends Omit<ExampleBatchEntry, 'pinyin'> {
  readings: string[];
  /** Word types ("hǎo · Adverb") that still have no example: the ones worth finding. */
  needed: string[];
}

const HAN = /\p{Script=Han}/u;

async function main() {
  const tags = (JSON.parse(await readFile(TAGS, 'utf8')) as { entries: Record<string, string> }).entries;
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const levels = await readLevelWords();
  const taiwan = await readTaiwanReadings();

  // Word types already shown with an example: the book's own (card) examples and step 1's picks.
  const covered = new Set<string>();
  const batchDir = resolve(OUT, 'batches');
  const senseDir = resolve(OUT, 'senses');
  if (existsSync(senseDir)) {
    for (const file of await readdir(senseDir)) {
      const entries = JSON.parse(await readFile(resolve(batchDir, file), 'utf8')) as ExampleBatchEntry[];
      const picks = JSON.parse(await readFile(resolve(senseDir, file), 'utf8')) as Array<{ key: string; picks: Array<{ n: number }> }>;
      for (const answer of picks) {
        const entry = entries.find((item) => item.key === answer.key);
        for (const pick of answer.picks) if (entry && pick.n > 0) covered.add(`${answer.key}#${entry.senses[pick.n - 1].type}`);
      }
    }
  }

  // Simplified → traditional by whole dictionary words, preferring learner words (头发 → 頭髮, 后来 → 後來).
  const toTraditional = new Map<string, string>();
  for (const [traditional, rows] of byWord) for (const row of rows) {
    const simplified = row.simplified ?? traditional;
    const current = toTraditional.get(simplified);
    if (!current || (!levels.has(current) && !cards.has(current) && (levels.has(traditional) || cards.has(traditional)))) toTraditional.set(simplified, traditional);
  }
  const convert = (text: string) => {
    const chars = Array.from(text);
    let out = '';
    for (let start = 0; start < chars.length;) {
      let length = Math.min(MAX_WORD, chars.length - start);
      while (length > 1 && !toTraditional.has(chars.slice(start, start + length).join('')) && !byWord.has(chars.slice(start, start + length).join(''))) length -= 1;
      const piece = chars.slice(start, start + length).join('');
      out += byWord.has(piece) ? piece : toTraditional.get(piece) ?? piece;
      start += length;
    }
    return out;
  };

  const sentences: TatoebaSentence[] = [];
  const seen = new Set<string>();
  for (const line of (await readFile(TATOEBA, 'utf8')).split('\n')) {
    const [english, chinese, credit] = line.split('\t');
    if (!english || !chinese || !credit) continue;
    const length = Array.from(chinese).length;
    if (length < 5 || length > 24 || /[A-Za-z0-9]/.test(chinese)) continue;
    const traditional = convert(chinese.trim());
    if (seen.has(traditional)) continue;
    seen.add(traditional);
    sentences.push({ id: sentences.length, chinese: traditional, english: english.trim(), credit: credit.replace(/^CC-BY 2\.0 \(France\) Attribution: /, '').trim() });
  }

  // Candidates: whole-word occurrences of common learner words that still lack an example for some word type.
  const wordLevel = (word: string) => (cards.has(word) ? 0 : levels.get(word) ?? 99);
  const byWordCandidates = new Map<string, number[]>();
  for (const sentence of sentences) {
    const chars = Array.from(sentence.chinese);
    for (let start = 0; start < chars.length;) {
      let length = Math.min(MAX_WORD, chars.length - start);
      while (length > 1 && !byWord.has(chars.slice(start, start + length).join(''))) length -= 1;
      const word = chars.slice(start, start + length).join('');
      start += length;
      if (!HAN.test(word) || wordLevel(word) > MAX_LEVEL) continue;
      byWordCandidates.set(word, [...(byWordCandidates.get(word) ?? []), sentence.id]);
    }
  }
  // Easy first: every other word in the sentence at most the word's own level, then length near 12.
  const difficulty = (sentence: TatoebaSentence) => {
    const chars = Array.from(sentence.chinese);
    let hardest = 0;
    for (let start = 0; start < chars.length;) {
      let length = Math.min(MAX_WORD, chars.length - start);
      while (length > 1 && !byWord.has(chars.slice(start, start + length).join(''))) length -= 1;
      const word = chars.slice(start, start + length).join('');
      if (HAN.test(word)) hardest = Math.max(hardest, wordLevel(word) === 99 ? 8 : wordLevel(word));
      start += length;
    }
    return hardest * 10 + Math.abs(chars.length - 12);
  };

  const batches: TatoebaBatchEntry[] = [];
  for (const [word, ids] of byWordCandidates) {
    const entry = buildWordEntry(word, byWord.get(word) ?? [], cards.get(word) ?? [], taiwan.get(word) ?? [], { posTags: (key) => tags[key] });
    if (!entry) continue;
    let n = 0;
    const senses: TatoebaBatchEntry['senses'] = [];
    const readings: string[] = [];
    const needed: string[] = [];
    for (const reading of entry.readings.filter((item) => !item.reference)) {
      const key = posTagsKey(word, byWord.get(word)?.find((row) => readingKey(row.pinyin_accented) === reading.key)?.pinyin_accented);
      readings.push(reading.pinyin);
      for (const group of reading.groups) {
        const type = formatPosLabel(group.pos) ?? 'Other';
        const hasBookExample = group.senses.some((sense) => sense.example);
        if (!hasBookExample && !covered.has(`${key}#${type}`) && group.pos) needed.push(`${reading.pinyin} · ${type}`);
        for (const sense of group.senses) if (!sense.ref) senses.push({ n: ++n, type: `${reading.pinyin} · ${type}`, text: sense.text });
      }
    }
    if (needed.length === 0) continue;
    const picked = [...new Set(ids)].map((id) => sentences[id]).sort((a, b) => difficulty(a) - difficulty(b)).slice(0, PER_WORD);
    batches.push({ key: word, word, readings, needed, senses, sentences: picked.map((sentence) => ({ s: sentence.id, chinese: sentence.chinese, english: sentence.english })) });
  }

  await rm(resolve(OUT, 'tatoeba-batches'), { recursive: true, force: true });
  await mkdir(resolve(OUT, 'tatoeba-batches'), { recursive: true });
  for (let start = 0, index = 0; start < batches.length; start += BATCH_SIZE, index += 1) {
    await writeFile(resolve(OUT, 'tatoeba-batches', `tatoeba-${String(index).padStart(3, '0')}.json`), JSON.stringify(batches.slice(start, start + BATCH_SIZE)), 'utf8');
  }
  await writeFile(resolve(OUT, 'tatoeba.json'), JSON.stringify(sentences), 'utf8');
  console.log(`Tatoeba: ${sentences.length} usable sentences; ${batches.length} common words still missing an example for some word type have candidates (${Math.ceil(batches.length / BATCH_SIZE)} batches).`);
}

main().catch((error) => {
  console.error('Tatoeba candidates failed:', error);
  process.exit(1);
});
