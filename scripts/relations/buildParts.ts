/**
 * buildParts.ts — `npm run relations:build`
 *
 * Builds the parts index public/data/relations/parts.json (+ manifest.json):
 * the one compact per-character relation dataset behind the breakdown
 * "Built with" and "Sound clue" cards.
 *
 *   parents:  part → every learner-pool character built from it (breakdown
 *             shards' components_historical, reversed), in pool rank order but
 *             sound-alikes first (same, then tone, then close), each followed
 *             by a grade mark: "=" same sound, "~" tone change, "≈" close.
 *             Unmarked = shape/meaning only. No cap.
 *   phonetic: character → the part that gives it its sound, only when that
 *             part's grade for the character is same/tone/close.
 *
 * No pinyin, meaning, level or lesson ships: the app derives them at runtime.
 * Scope is the learner pool (scripts/lib/learnerPool.ts: course ∪ levels).
 * Sound grading: scripts/phonetic/soundGrade.ts; phonetic map + owner
 * overrides: scripts/phonetic/soundMap.ts. Format: src/utils/characters/parts.ts.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compareByPoolRank, loadLearnerPool } from '../lib/learnerPool';
import { gradeSound, type SoundMatch } from '../phonetic/soundGrade';
import { loadPhoneticParts } from '../phonetic/soundMap';
import { formatMembers, GRADE_ORDER, type PartMember, type SoundGrade } from '../../src/utils/characters/parts';
import { parseReadings } from '../../src/utils/pinyin/pronunciation';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT_DIR = resolve(ROOT, 'public/data/relations');

const pool = loadLearnerPool(ROOT);
console.log(`Learner pool: ${pool.size} characters.`);

const { phonetic: rawPhonetic, reading, breakdowns } = loadPhoneticParts(ROOT, pool);

// ---------------------------------------------------------------------------
// 1. Sound grade of each character against its part
// ---------------------------------------------------------------------------
const phonetic = new Map<string, string>();
const gradeOf = new Map<string, SoundGrade>();
const gradeCounts: Record<SoundMatch, number> = { same: 0, tone: 0, close: 0, far: 0 };
const MATCH_RANK: Record<SoundMatch, number> = { same: 0, tone: 1, close: 2, far: 3 };
// Every reading of a character (public/data/pronunciation, `npm run pronunciation:build`).
const PRONUNCIATION = resolve(ROOT, 'public/data/pronunciation/pronunciation.json');
const pronunciation: Record<string, string> = existsSync(PRONUNCIATION)
  ? (JSON.parse(readFileSync(PRONUNCIATION, 'utf8')) as { readings: Record<string, string> }).readings
  : {};
const readingsOf = (char: string) => (pronunciation[char] ? parseReadings(pronunciation[char]).map((entry) => entry.pinyin) : []);

/**
 * Best grade over every character reading × every part reading:
 * 長 cháng/zhǎng → 張 zhāng is a tone change; 誰 shéi/shuí ← 隹 zhuī is close.
 */
function bestGrade(char: string, part: string): SoundMatch {
  const charReadings = [breakdowns.get(char)?.pinyin ?? '', ...readingsOf(char)].filter(Boolean);
  const partReadings = [reading(part), ...(breakdowns.get(part)?.readings ?? []), ...readingsOf(part)].filter(Boolean);
  let best: SoundMatch = 'far';
  for (const charReading of charReadings) {
    for (const partReading of partReadings) {
      const grade = gradeSound(charReading, partReading);
      if (MATCH_RANK[grade] < MATCH_RANK[best]) best = grade;
    }
  }
  return best;
}

for (const [char, part] of rawPhonetic) {
  if (!pool.has(char) || char === part) continue;
  const grade = bestGrade(char, part);
  gradeCounts[grade]++;
  if (grade === 'far') continue;
  phonetic.set(char, part);
  gradeOf.set(char, grade);
}

// ---------------------------------------------------------------------------
// 2. Parents: component → pool characters built from it
// ---------------------------------------------------------------------------
const reverse = new Map<string, Set<string>>();
const addParent = (part: string, char: string) => {
  const set = reverse.get(part) ?? new Set<string>();
  set.add(char);
  reverse.set(part, set);
};
for (const char of pool.keys()) {
  for (const component of breakdowns.get(char)?.components ?? []) {
    if (component !== char) addParent(component, char);
  }
}
// A sound part is always a part of its character, even when the breakdown lists it differently.
let phoneticOnly = 0;
for (const [char, part] of phonetic) {
  if (!reverse.get(part)?.has(char)) phoneticOnly++;
  addParent(part, char);
}

const parents: Record<string, string> = {};
let references = 0;
for (const part of [...reverse.keys()].sort()) {
  const members: PartMember[] = [...reverse.get(part)!].map((character) => ({
    character,
    grade: phonetic.get(character) === part ? gradeOf.get(character)! : null,
  }));
  members.sort((a, b) => (
    (a.grade ? GRADE_ORDER[a.grade] : 3) - (b.grade ? GRADE_ORDER[b.grade] : 3)
    || compareByPoolRank(pool, a.character, b.character)
    || a.character.localeCompare(b.character)
  ));
  parents[part] = formatMembers(members);
  references += members.length;
}

const phoneticPack = Object.fromEntries([...phonetic.entries()].sort(([a], [b]) => a.localeCompare(b)));

// ---------------------------------------------------------------------------
// 3. Write pack + manifest
// ---------------------------------------------------------------------------
const count = Object.keys(parents).length + Object.keys(phoneticPack).length;
const pack = { schemaVersion: 1, shard: 0, count, parents, phonetic: phoneticPack };
const text = `${JSON.stringify(pack)}\n`;
const bytes = Buffer.byteLength(text);
const sha256 = createHash('sha256').update(text).digest('hex');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'parts.json'), text);
const manifest = {
  schemaVersion: 1,
  version: sha256.slice(0, 16),
  generatedAt: new Date().toISOString(),
  totalCount: count,
  shardCount: 1,
  shards: [{ shard: 0, count, path: '/data/relations/parts.json', sha256, bytes }],
};
writeFileSync(resolve(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// ---------------------------------------------------------------------------
// 4. Log
// ---------------------------------------------------------------------------
const marked = Object.values(parents).reduce((n, value) => n + (value.match(/[=~≈]/g)?.length ?? 0), 0);
console.log(`→ public/data/relations/parts.json: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB)`);
console.log(`parents keys: ${Object.keys(parents).length} · references: ${references} (${marked} sound-marked)`);
console.log(`phonetic entries: ${phonetic.size} (${phoneticOnly} not in the breakdown components)`);
console.log(`grades (before dropping far): same ${gradeCounts.same} · tone ${gradeCounts.tone} · close ${gradeCounts.close} · far ${gradeCounts.far}`);
for (const part of ['馬', '青', '包', '工', '門']) {
  const value = parents[part] ?? '';
  const length = Array.from(value.replace(/[=~≈]/g, '')).length;
  console.log(`  parents[${part}] (${length}): ${Array.from(value).slice(0, 36).join('')}${Array.from(value).length > 36 ? '…' : ''}`);
}
for (const char of ['媽', '請']) console.log(`  phonetic[${char}] = ${phonetic.get(char) ?? '(none)'} (${gradeOf.get(char) ?? '-'})`);
