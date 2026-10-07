import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveLevel } from '../../src/utils/lesson/levels';
import type { LevelIndex } from '../../src/utils/packValidators';

/**
 * `npm run levels:build` — builds public/data/levels/levels.json (schema v2).
 *
 * `tbcl`: the Taiwan Benchmarks for the Chinese Language (TBCL, 臺灣華語文能力基準;
 * NAER), the scale TOCFL follows. Input tbcl-chars.csv + tbcl.csv from
 * github.com/ivankra/tocfl. Levels 1–7; the `*` suffix folds into its level.
 *
 * `hsk`: gap fill from the New HSK 2025 syllabus (hsk_word_list.tsv from
 * github.com/Punpuf/hsk-syllabus-vocabulary-parser, HSK_Level_*_hanzi.txt from
 * github.com/krmanik/HSK-3.0), only for forms TBCL lacks, converted to the
 * TBCL scale: HSK 1→1, 2→2, 3→3, 4→4, 5→5, 6→5, 7-9→6. Simplified forms map
 * to traditional via the dictionary packs.
 *
 * All inputs live in gitignored output/levels/. Estimates are never stored;
 * src/utils/lesson/levels.ts computes them at runtime.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const INPUT_DIR = resolve(ROOT, 'output/levels');
const OUT_DIR = resolve(ROOT, 'public/data/levels');

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

function readCsv(name: string): Array<Record<string, string>> {
  const path = resolve(INPUT_DIR, name);
  if (!existsSync(path)) throw new Error(`Missing ${path}. See the header of scripts/levels/buildLevels.ts for sources.`);
  return parseCsv(readFileSync(path, 'utf8'));
}

function levelOf(raw: string): number {
  const level = Number.parseInt(raw, 10);
  if (!(level >= 1 && level <= 7)) throw new Error(`Bad TBCL level "${raw}"`);
  return level;
}

const HSK_TO_TBCL: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 5, '7-9': 6 };

function readLines(name: string): string[] {
  const path = resolve(INPUT_DIR, name);
  if (!existsSync(path)) throw new Error(`Missing ${path}. See the header of scripts/levels/buildLevels.ts for sources.`);
  return readFileSync(path, 'utf8').split('\n').map((line) => line.replace(/\r$/, ''));
}

// Simplified → traditional variants from the dictionary packs.
const s2t = new Map<string, Set<string>>();
// Characters seen in a headword whose traditional spelling differs from the
// simplified one: real traditional text. A simplified-only form (从, 听) never is.
const tradTextChars = new Set<string>();
const dictDir = resolve(ROOT, 'public/data/dictionary');
for (const file of readdirSync(dictDir).filter((name) => /^shard-\d+\.json$/.test(name))) {
  const pack = JSON.parse(readFileSync(resolve(dictDir, file), 'utf8')) as { items: Array<[number, string, string]> };
  // An empty traditional column means the form is identical in both scripts.
  for (const [, simplified, traditional] of pack.items) {
    if (traditional) for (const char of traditional) tradTextChars.add(char);
    let set = s2t.get(simplified);
    if (!set) s2t.set(simplified, (set = new Set()));
    set.add(traditional || simplified);
  }
}

// ── TBCL ──────────────────────────────────────────────────────────────
// Characters keep file order (frequency within the list) inside each level.
const tbclChars = new Map<string, number>();
for (const row of readCsv('tbcl-chars.csv')) {
  const char = row.Traditional.trim();
  if (Array.from(char).length !== 1 || tbclChars.has(char)) continue;
  tbclChars.set(char, levelOf(row.Level));
}

// Words: every listed form (爸爸/爸) and variant gets the entry's level; the
// lowest level wins when a form appears twice.
const tbclWords = new Map<string, number>();
for (const row of readCsv('tbcl.csv')) {
  const level = levelOf(row.Level);
  const forms = new Set(row.Traditional.split('/').map((form) => form.trim()).filter(Boolean));
  if (row.Variants) {
    for (const variant of JSON.parse(row.Variants) as Array<{ Traditional: string }>) forms.add(variant.Traditional.trim());
  }
  for (const form of forms) {
    const current = tbclWords.get(form);
    if (current === undefined || level < current) tbclWords.set(form, level);
  }
}

// ── HSK gap fill ──────────────────────────────────────────────────────
/**
 * The Taiwan-standard traditional form(s) of a simplified HSK word. CC-CEDICT
 * lists every variant (家 → 傢/家, 干 → 乹/乾/亁/干); a variant must not inherit
 * the common word's level. If the simplified form is itself traditional, only
 * it counts; otherwise keep forms made of TBCL characters, else the first.
 * Characters keep every traditional split (面 → 麵, 里 → 裡) instead: they only
 * fill characters TBCL lacks, so a variant never overrides an official level.
 */
function standardTraditional(simplified: string, candidates: string[]): string[] {
  if (candidates.length === 0 || candidates.includes(simplified)) return [simplified];
  if (candidates.length === 1) return candidates;
  const standard = candidates.filter((form) => Array.from(form).every((char) => tbclChars.has(char)));
  return standard.length > 0 ? standard : [candidates[0]];
}

const hskWords = new Map<string, number>();
const [tsvHeader, ...tsvRows] = readLines('hsk_word_list.tsv').filter(Boolean).map((line) => line.split('\t'));
const [levelCol, wordCol, tradCol] = ['level', 'word', 'traditional_cc-cedict'].map((name) => tsvHeader.indexOf(name));
for (const row of tsvRows) {
  const level = HSK_TO_TBCL[row[levelCol]];
  if (!level) throw new Error(`Bad HSK level "${row[levelCol]}"`);
  const word = row[wordCol].trim();
  const candidates = (row[tradCol] ?? '').split('/').map((form) => form.trim()).filter(Boolean);
  for (const form of standardTraditional(word, candidates.length > 0 ? candidates : [...(s2t.get(word) ?? [])])) {
    if (tbclWords.has(form)) continue;
    const current = hskWords.get(form);
    if (current === undefined || level < current) hskWords.set(form, level);
  }
}

const hskChars = new Map<string, number>();
for (const [hskLevel, level] of Object.entries(HSK_TO_TBCL)) {
  for (const simplified of readLines(`HSK_Level_${hskLevel}_hanzi.txt`).map((line) => line.trim()).filter(Boolean)) {
    const forms = [...(s2t.get(simplified) ?? [])].filter((form) => Array.from(form).length === 1);
    for (const char of forms.length > 0 ? forms : [simplified]) {
      if (tbclChars.has(char)) continue;
      if (char === simplified && forms.some((form) => form !== simplified) && !tradTextChars.has(char)) continue;
      const current = hskChars.get(char);
      if (current === undefined || level < current) hskChars.set(char, level);
    }
  }
}

// ── Pack ──────────────────────────────────────────────────────────────
function charSection(map: Map<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [char, level] of map) out[String(level)] = (out[String(level)] ?? '') + char;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => Number(a) - Number(b)));
}
function wordSection(map: Map<string, number>): Record<string, string> {
  const lists: Record<string, string[]> = {};
  for (const [word, level] of map) (lists[String(level)] ??= []).push(word);
  return Object.fromEntries(Object.entries(lists).sort(([a], [b]) => Number(a) - Number(b)).map(([level, list]) => [level, list.join('|')]));
}

const count = tbclChars.size + tbclWords.size + hskChars.size + hskWords.size;
const pack = {
  schemaVersion: 2,
  shard: 0,
  count,
  sources: {
    tbcl: 'TBCL (NAER) via github.com/ivankra/tocfl',
    hsk: 'New HSK syllabus 2025 via github.com/Punpuf/hsk-syllabus-vocabulary-parser + github.com/krmanik/HSK-3.0; levels converted to TBCL scale',
  },
  tbcl: { chars: charSection(tbclChars), words: wordSection(tbclWords) },
  hsk: { chars: charSection(hskChars), words: wordSection(hskWords) },
};

mkdirSync(OUT_DIR, { recursive: true });
rmSync(resolve(OUT_DIR, 'tbcl.json'), { force: true });
const text = `${JSON.stringify(pack)}\n`;
writeFileSync(resolve(OUT_DIR, 'levels.json'), text);
const sha256 = createHash('sha256').update(text).digest('hex');
const manifest = {
  schemaVersion: 1,
  version: sha256.slice(0, 16),
  generatedAt: new Date().toISOString(),
  totalCount: count,
  shardCount: 1,
  shards: [{ shard: 0, count, path: '/data/levels/levels.json', sha256, bytes: Buffer.byteLength(text) }],
};
writeFileSync(resolve(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`tbcl: ${tbclChars.size} chars, ${tbclWords.size} words`);
console.log(`hsk (not in TBCL): ${hskChars.size} chars, ${hskWords.size} words`);
console.log(`→ public/data/levels/levels.json (${Buffer.byteLength(text)} bytes, ${count} entries)`);

// Coverage of course vocabulary, using the runtime resolver.
const index: LevelIndex = {
  tbcl: { chars: tbclChars, words: tbclWords },
  hsk: { chars: hskChars, words: hskWords },
};
const coverage = { tbcl: 0, hsk: 0, estimate: 0, rare: 0, none: 0 };
let total = 0;
const unresolved: string[] = [];
const vocabDir = resolve(ROOT, 'public/data/vocabulary');
for (const file of readdirSync(vocabDir).filter((name) => /^book-\d+\.json$/.test(name))) {
  const vocab = JSON.parse(readFileSync(resolve(vocabDir, file), 'utf8')) as { items: Array<{ traditional: string }> };
  for (const item of vocab.items) {
    total++;
    const resolved = resolveLevel(item.traditional, index);
    coverage[resolved?.source ?? 'none']++;
    if (!resolved && unresolved.length < 40) unresolved.push(item.traditional);
  }
}
console.log(`course vocab (${total}): tbcl ${coverage.tbcl}, hsk ${coverage.hsk}, estimate ${coverage.estimate}, rare ${coverage.rare}, none ${coverage.none}`);
if (unresolved.length) console.log(`unresolved sample: ${unresolved.join(' ')}`);
