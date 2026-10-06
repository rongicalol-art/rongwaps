import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { numberToToneMarks } from '../../src/utils/pinyin';
import { formatReadings, type Reading } from '../../src/utils/pronunciation';

/**
 * `npm run pronunciation:build` — every reading of every character the app shows,
 * Taiwan-first, into public/data/pronunciation/pronunciation.json.
 *
 * Input: CC-CEDICT (CC BY-SA 4.0, https://www.mdbg.net/chinese/dictionary?page=cedict)
 * unpacked to gitignored output/pronunciation/cedict.txt.
 *
 * Per character:
 *   - readings come from its single-character CC-CEDICT entries; surname and
 *     place-name readings (capitalised pinyin) are dropped unless they are all
 *     there is.
 *   - a standalone "Taiwan pr. [qi2]" sense makes that reading lead and marks
 *     the mainland one as a same-meaning variant (期 qí, also qī).
 *   - a standalone "also pr. [shui2]" sense adds a same-meaning variant (誰 shéi, also shuí).
 *   - order: readings the course books teach first (single-character entries),
 *     then by how many words use each reading (CC-CEDICT pinyin is
 *     syllable-aligned), weighting course and TBCL/HSK words.
 *   - each other (different-meaning) reading carries its most common example word.
 * Scope: characters in the breakdown shards, the level lists or the course.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const CEDICT = resolve(ROOT, 'output/pronunciation/cedict.txt');
const OUT_DIR = resolve(ROOT, 'public/data/pronunciation');

if (!existsSync(CEDICT)) {
  throw new Error(`Missing ${CEDICT}. Download cedict_1_0_ts_utf-8_mdbg.txt.gz from MDBG and gunzip it there.`);
}

const chars = (text: string) => Array.from(text);
const isHan = (char: string) => /\p{Script=Han}/u.test(char);
const marks = (numbered: string) => numberToToneMarks(numbered.trim().toLowerCase());

// ── Scope and weights ─────────────────────────────────────────────────────
const scope = new Set<string>();
for (const file of readdirSync(resolve(ROOT, 'public/data/breakdowns')).filter((name) => name.startsWith('shard-'))) {
  const shard = JSON.parse(readFileSync(resolve(ROOT, 'public/data/breakdowns', file), 'utf8')) as { items: Array<{ character: string }> };
  for (const item of shard.items) scope.add(item.character);
}
const levels = JSON.parse(readFileSync(resolve(ROOT, 'public/data/levels/levels.json'), 'utf8')) as {
  tbcl: { chars: Record<string, string>; words: Record<string, string> };
  hsk: { chars: Record<string, string>; words: Record<string, string> };
};
/** Listed word → its lowest level (1–7); examples prefer the most basic word. */
const listedWords = new Map<string, number>();
for (const section of [levels.tbcl, levels.hsk]) {
  for (const list of Object.values(section.chars)) for (const char of chars(list)) scope.add(char);
  for (const [level, list] of Object.entries(section.words)) {
    for (const word of list.split('|')) listedWords.set(word, Math.min(listedWords.get(word) ?? 9, Number(level)));
  }
}

const courseWords = new Set<string>();
const courseReadings = new Map<string, Map<string, number>>();
for (let book = 1; book <= 4; book++) {
  const path = resolve(ROOT, `public/data/vocabulary/book-${book}.json`);
  if (!existsSync(path)) continue;
  const vocab = JSON.parse(readFileSync(path, 'utf8')) as { items: Array<{ traditional: string; pinyin: string }> };
  for (const item of vocab.items) {
    const forms = item.traditional.split('/').map((form) => form.trim());
    const readings = item.pinyin.split('/').map((reading) => reading.trim());
    forms.forEach((form, index) => {
      for (const variant of [form.replace(/[（(][^）)]*[）)]/g, ''), form.replace(/[（()）]/g, '')]) if (variant) courseWords.add(variant);
      for (const char of chars(form)) if (isHan(char)) scope.add(char);
      const reading = readings[index]?.toLowerCase();
      if (chars(form).length === 1 && reading) {
        const counts = courseReadings.get(form) ?? new Map<string, number>();
        counts.set(reading, (counts.get(reading) ?? 0) + 1);
        courseReadings.set(form, counts);
      }
    });
  }
}

// ── CC-CEDICT ─────────────────────────────────────────────────────────────
interface CharEntry { reading: string; proper: boolean; pointer: boolean; taiwan?: string; also: string[] }
const entries = new Map<string, CharEntry[]>();
/** char → reading → { weighted word count, best example word } */
const usage = new Map<string, Map<string, { score: number; example?: string; exampleScore: number }>>();
const LINE_RE = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/;

for (const line of readFileSync(CEDICT, 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const match = LINE_RE.exec(line);
  if (!match) continue;
  const [, traditional, simplified, pinyin, defs] = match;
  const senses = defs.split('/');
  const syllables = pinyin.split(' ');
  const tradChars = chars(traditional);

  if (tradChars.length === 1) {
    const taiwan = senses.map((sense) => /^Taiwan pr\. \[([^\]]+)\]$/.exec(sense.trim())?.[1]).find(Boolean);
    const also = senses.flatMap((sense) => {
      const found = /^also pr\. \[([^\]]+)\]$/.exec(sense.trim())?.[1];
      return found && !found.includes(' ') ? [found] : [];
    });
    // Pure pointers (妳 nǎi "variant of 奶") only count when nothing else exists.
    const pointer = senses.every((sense) => !sense.trim() || /^(?:old |archaic |Japanese )?variant of /i.test(sense.trim()));
    const entry: CharEntry = { reading: syllables[0], proper: /^[A-Z]/.test(syllables[0]), pointer, taiwan, also };
    for (const key of new Set([traditional, simplified])) {
      if (key !== traditional && entries.has(key)) continue;
      entries.set(key, [...(entries.get(key) ?? []), entry]);
    }
    continue;
  }

  // Multi-character word: syllable-aligned usage of each character's reading.
  if (syllables.length !== tradChars.length || /^[A-Z]/.test(pinyin)) continue;
  const weight = courseWords.has(traditional) ? 20 : listedWords.has(traditional) ? 10 : 1;
  tradChars.forEach((char, index) => {
    if (!scope.has(char)) return;
    const reading = syllables[index].toLowerCase();
    const byReading = usage.get(char) ?? new Map();
    const current = byReading.get(reading) ?? { score: 0, exampleScore: 0 };
    current.score += weight;
    // Course word first, then the lowest level, then the shortest (行 háng → 銀行).
    const exampleScore = weight * 100 - (listedWords.get(traditional) ?? 9) * 10 - tradChars.length;
    if (weight > 1 && exampleScore > current.exampleScore) {
      current.example = traditional;
      current.exampleScore = exampleScore;
    }
    byReading.set(reading, current);
    usage.set(char, byReading);
  });
}

// ── Readings per character ───────────────────────────────────────────────
const out: Record<string, string> = {};
let multi = 0;
for (const char of [...scope].sort()) {
  const charEntries = entries.get(char);
  if (!charEntries) continue;
  const real = charEntries.filter((entry) => !entry.pointer);
  const meaningful = real.length > 0 ? real : charEntries;
  const common = meaningful.filter((entry) => !entry.proper);
  const pool = common.length > 0 ? common : meaningful;

  // numbered reading → { variant?, score }
  const scored = new Map<string, { variant: boolean; score: number }>();
  const add = (reading: string, variant: boolean, score: number) => {
    const key = reading.toLowerCase();
    const current = scored.get(key);
    if (!current) scored.set(key, { variant, score });
    else {
      current.variant &&= variant;
      current.score = Math.max(current.score, score);
    }
  };
  const course = courseReadings.get(char);
  const scoreOf = (reading: string) => {
    const key = reading.toLowerCase();
    const fromCourse = course?.get(marks(key)) ?? 0;
    return fromCourse * 1000 + (usage.get(char)?.get(key)?.score ?? 0) + 1;
  };
  // A mainland reading the Taiwan standard replaces stays a variant even when
  // another entry lists it plainly (期 qí, also qī).
  const demoted = new Set(pool.flatMap((entry) => (entry.taiwan ? [entry.reading.toLowerCase()] : [])));
  for (const entry of pool) {
    if (entry.taiwan) {
      add(entry.taiwan, false, scoreOf(entry.reading) + scoreOf(entry.taiwan) + 0.5);
      add(entry.reading, true, 0);
    } else if (demoted.has(entry.reading.toLowerCase())) {
      add(entry.reading, true, 0);
    } else {
      add(entry.reading, false, scoreOf(entry.reading));
    }
    for (const also of entry.also) add(also, true, 0);
  }
  // A course reading CC-CEDICT lacks (rare) still leads.
  for (const [reading, count] of course ?? []) {
    if (![...scored.keys()].some((key) => marks(key) === reading)) scored.set(reading, { variant: false, score: count * 1000 });
  }

  const ordered = [...scored.entries()].sort(([, a], [, b]) => Number(a.variant) - Number(b.variant) || b.score - a.score);
  const readings: Reading[] = [];
  const seen = new Set<string>();
  ordered.forEach(([key, { variant }], index) => {
    const pinyin = /\d/.test(key) ? marks(key) : key;
    if (seen.has(pinyin)) return;
    seen.add(pinyin);
    const example = index > 0 && !variant ? usage.get(char)?.get(key)?.example : undefined;
    readings.push({ pinyin, kind: index === 0 ? 'primary' : variant ? 'variant' : 'other', example });
  });
  if (readings.length === 0) continue;
  if (readings.length > 1) multi++;
  out[char] = formatReadings(readings);
}

const pack = { schemaVersion: 1, shard: 0, source: 'CC-CEDICT (CC BY-SA 4.0) via MDBG; course readings first', count: Object.keys(out).length, readings: out };
mkdirSync(OUT_DIR, { recursive: true });
const text = `${JSON.stringify(pack)}\n`;
writeFileSync(resolve(OUT_DIR, 'pronunciation.json'), text);
const sha256 = createHash('sha256').update(text).digest('hex');
const manifest = {
  schemaVersion: 1,
  version: sha256.slice(0, 16),
  generatedAt: new Date().toISOString(),
  totalCount: pack.count,
  shardCount: 1,
  shards: [{ shard: 0, count: pack.count, path: '/data/pronunciation/pronunciation.json', sha256, bytes: Buffer.byteLength(text) }],
};
writeFileSync(resolve(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`readings: ${pack.count} characters (${multi} with more than one reading) → public/data/pronunciation/pronunciation.json (${Buffer.byteLength(text)} bytes)`);
for (const char of ['誰', '行', '長', '期', '還', '了', '和', '妳', '髮', '跌', '要']) console.log(`  ${char} ${out[char] ?? '—'}`);
