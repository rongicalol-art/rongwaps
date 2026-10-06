/**
 * The phonetic map: which pool character borrows its sound from which part
 * (媽 ← 馬), before grading. Consumed by scripts/relations/buildParts.ts.
 *
 * Raw phonetic analyses (Dong Chinese, CJKVI) live in gitignored
 * output/phonetic/sources. When present they refresh the committed,
 * pool-scoped map scripts/phonetic/phonetic-map.json; otherwise that committed
 * map is the source, so the pack always rebuilds from tracked files.
 *
 * Owner overrides (scripts/phonetic/sound-overrides.json, optional):
 *   - noSound:     characters whose recorded sound part misleads a modern learner.
 *   - blockMember: { part-or-character: [characters] } — listed characters are not
 *                  sound-alikes of that part (or of the part that character sounds like).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PoolRank } from '../lib/learnerPool';
import { gradeSound, isModernPhoneticallyPlausible, parsePinyin } from './soundGrade';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCES_DIR = resolve(ROOT, 'output/phonetic/sources');
const PHONETIC_MAP_PATH = resolve(import.meta.dirname, 'phonetic-map.json');
const OVERRIDES_PATH = resolve(import.meta.dirname, 'sound-overrides.json');

export interface BreakdownInfo {
  pinyin: string;
  /** Every listed reading (長 cháng, zhǎng); `pinyin` is the first. */
  readings?: string[];
  definition: string;
  radical: string;
  components: string[];
}

/** Breakdown shards (+ vocabulary fallback for pinyin) keyed by character. */
export function loadBreakdownInfo(root: string): Map<string, BreakdownInfo> {
  const breakdownMap = new Map<string, BreakdownInfo>();
  for (let s = 0; s < 32; s++) {
    const file = resolve(root, `public/data/breakdowns/shard-${String(s).padStart(2, '0')}.json`);
    if (!existsSync(file)) continue;
    const shard = JSON.parse(readFileSync(file, 'utf8')) as {
      items: Array<{ character: string; pinyin?: string[]; definition?: string; radical?: string | null; components_historical?: string[] }>;
    };
    for (const it of shard.items) {
      breakdownMap.set(it.character, {
        pinyin: it.pinyin && it.pinyin.length > 0 ? it.pinyin[0] : '',
        readings: it.pinyin ?? [],
        definition: it.definition || '',
        radical: it.radical || '',
        components: it.components_historical || [],
      });
    }
  }

  // Fallback from vocabulary packs for characters
  for (let b = 1; b <= 4; b++) {
    const vocabFile = resolve(root, `public/data/vocabulary/book-${b}.json`);
    if (!existsSync(vocabFile)) continue;
    const vocab = JSON.parse(readFileSync(vocabFile, 'utf8')) as {
      items: Array<{ traditional: string; pinyin: string; meaning: string }>;
    };
    for (const it of vocab.items) {
      if (it.traditional.length === 1 && (!breakdownMap.has(it.traditional) || !breakdownMap.get(it.traditional)!.pinyin)) {
        breakdownMap.set(it.traditional, { pinyin: it.pinyin, definition: it.meaning, radical: '', components: [] });
      }
    }
  }

  if (!breakdownMap.has('嚐') || !breakdownMap.get('嚐')!.pinyin) {
    breakdownMap.set('嚐', { pinyin: 'cháng', definition: 'to taste, to savor', radical: '口', components: ['口', '嘗'] });
  }
  if (!breakdownMap.has('溼') || !breakdownMap.get('溼')!.pinyin) {
    breakdownMap.set('溼', { pinyin: 'shī', definition: 'wet, damp, humid', radical: '氵', components: ['氵', '顯'] });
  }
  if (!breakdownMap.has('汙') || !breakdownMap.get('汙')!.pinyin) {
    breakdownMap.set('汙', { pinyin: 'wū', definition: 'to pollute, to contaminate', radical: '氵', components: ['氵', '于'] });
  }
  return breakdownMap;
}

interface SoundOverrides {
  noSound?: string[];
  blockMember?: Record<string, string[]>;
}

interface CommittedMap {
  sounds: Record<string, string>;
  readings: Record<string, string>;
}


// Critical manual curation: characters the course/tests need to match exactly.
const CURATED_SOUNDS: Record<string, string> = {
  媽: '馬',
  // 辛 survives only as the top of 亲, so it never shows as a direct component.
  新: '辛',
  親: '辛',
  島: '鳥',
  爸: '巴',
  請: '青',
  情: '青',
  睛: '青',
  清: '青',
  晴: '青',
  客: '各',
  喝: '曷',
  城: '成',
  湖: '胡',
  花: '化',
  問: '門',
  星: '生',
  姓: '生',
  海: '每',
  作: '乍',
  昨: '乍',
  課: '果',
  答: '合',
  誰: '隹',
  呢: '尼',
  店: '占',
  飯: '反',
  想: '相',
  期: '其',
  很: '艮',
  跟: '艮',
  語: '吾',
  識: '戠',
  慢: '曼',
  快: '夬',
  節: '即',
  蛇: '它',
  感: '咸',
};

// Explicit series roots (they ARE the phonetic root, not derived from anything else)
const PRIMARY_PHONETIC_ROOTS = new Set([
  '家', '青', '馬', '包', '巴', '生', '乍', '門', '方', '白', '主', '中',
  '古', '工', '各', '成', '胡', '果', '合', '反', '相', '其', '艮', '吾',
  '曼', '夬', '即', '咸', '化', '尼', '占', '它', '隹', '每', '东',
]);

export interface PhoneticParts {
  /** Character → the part it borrows its sound from (ungraded; may still grade "far"). */
  phonetic: Map<string, string>;
  /** Modern reading of a part: committed reading, then breakdown pinyin, then the component ledger. */
  reading: (glyph: string) => string;
  breakdowns: Map<string, BreakdownInfo>;
  refreshedFromSources: boolean;
}

/**
 * Builds the pool-scoped phonetic map: committed (or refreshed) analyses, the
 * manual curation above, same-syllable breakdown enrichment, and owner overrides.
 */
export function loadPhoneticParts(root: string, pool: Map<string, PoolRank>): PhoneticParts {
  const breakdownMap = loadBreakdownInfo(root);

  const ledgerPath = resolve(root, 'output/memory-hooks/component-ledger-v1.json');
  const committedMap: CommittedMap | null = existsSync(PHONETIC_MAP_PATH)
    ? JSON.parse(readFileSync(PHONETIC_MAP_PATH, 'utf8'))
    : null;
  const ledgerEntries: Array<{ glyph: string; readings: string[] }> = existsSync(ledgerPath)
    ? JSON.parse(readFileSync(ledgerPath, 'utf8')).entries
    : [];
  const ledgerMap = new Map<string, string>();
  for (const entry of ledgerEntries) {
    for (const r of entry.readings) {
      const clean = r.replace(/[[\]]/g, '').split(':')[0].trim();
      if (clean && !clean.includes(' ')) {
        ledgerMap.set(entry.glyph, clean);
        break;
      }
    }
  }

  const refreshFromSources = existsSync(resolve(SOURCES_DIR, 'dong-etymology.js')) && existsSync(resolve(SOURCES_DIR, 'cjkvi-ids-analysis.txt'));
  if (!refreshFromSources && !committedMap) {
    throw new Error('No phonetic sources in output/phonetic/sources and no committed scripts/phonetic/phonetic-map.json.');
  }

  // Modern main reading first (what a learner knows: 女 nǚ, 同 tóng); the
  // component ledger only fills parts with no breakdown pinyin (隹 zhuī).
  function getGlyphReading(glyph: string): string {
    if (!refreshFromSources && committedMap?.readings[glyph]) return committedMap.readings[glyph];
    const b = breakdownMap.get(glyph);
    if (b?.pinyin) return b.pinyin;
    return ledgerMap.get(glyph) ?? '';
  }

  const GLYPH_NORM: Record<string, string> = {
    靑: '青',
    毎: '每',
    幷: '并',
    恆: '恒',
    眞: '真',
    禮: '礼',
    爲: '為',
    戶: '户',
    艸: '艹',
    辵: '辶',
    攴: '攵',
  };

  const MAJOR_SEMANTIC_RADICALS = new Set([
    '木', '水', '氵', '口', '手', '扌', '心', '忄', '言', '讠', '火', '灬',
    '土', '日', '月', '女', '犭', '犬', '虫', '魚', '鱼', '鳥', '鸟', '貝', '贝',
    '車', '车', '足', '目', '頁', '页', '食', '饣', '糸', '纟', '刀', '刂',
    '阝', '广', '厂', '穴', '竹', '艹', '石', '禾', '米', '衣', '衤',
  ]);

  function deriveSoundsFromSources(): Map<string, string> {
    const dongText = readFileSync(resolve(SOURCES_DIR, 'dong-etymology.js'), 'utf8');
    const cjkviText = readFileSync(resolve(SOURCES_DIR, 'cjkvi-ids-analysis.txt'), 'utf8');

    const rawCharToSound = new Map<string, string>();

    // A. Parse CJKVI (Broad baseline)
    const simpToTrad = new Map<string, string>();
    for (const line of cjkviText.split('\n')) {
      const parts = line.trim().split('\t');
      if (parts.length >= 3 && parts[2].startsWith('→')) {
        const simp = parts[1];
        const trad = parts[2].slice(1).split(/[;, ]/)[0];
        if (simp && trad && simp.length === 1 && trad.length === 1) {
          simpToTrad.set(simp, trad);
        }
      }
      if (parts.length >= 4) {
        const ch = parts[1];
        const analysis = parts[3];
        const m = /([^\t\s;,]+?)(?:亦)?聲/.exec(analysis);
        if (m) {
          let sound = m[1].trim();
          sound = GLYPH_NORM[sound] ?? sound;
          if (sound.length === 1 && sound >= '\u4e00' && sound <= '\u9fff') {
            rawCharToSound.set(ch, sound);
          }
        }
      }
    }

    // B. Parse Dong Chinese (Higher priority for modern pedagogical usage)
    const semphonRegex = /semphon\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = semphonRegex.exec(dongText)) !== null) {
      const ch = match[1];
      let sound = match[3];
      sound = GLYPH_NORM[sound] ?? sound;
      if (sound.length === 1 && sound >= '\u4e00' && sound <= '\u9fff') {
        rawCharToSound.set(ch, sound);
      }
    }

    const phonsemRegex = /phonsem\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
    while ((match = phonsemRegex.exec(dongText)) !== null) {
      const ch = match[1];
      let sound = match[2];
      sound = GLYPH_NORM[sound] ?? sound;
      if (sound.length === 1 && sound >= '\u4e00' && sound <= '\u9fff') {
        rawCharToSound.set(ch, sound);
      }
    }

    // C. Inherit simplified characters from traditional CJKVI mappings
    for (const [simp, trad] of simpToTrad.entries()) {
      if (rawCharToSound.has(trad) && !rawCharToSound.has(simp)) {
        let sound = rawCharToSound.get(trad)!;
        sound = GLYPH_NORM[sound] ?? sound;
        rawCharToSound.set(simp, sound);
      }
    }

    // D. Filter automated sources by modern Mandarin phonetic plausibility

    const filtered = new Map<string, string>();
    let automatedFiltered = 0;
    for (const [ch, sound] of rawCharToSound.entries()) {
      const charReading = breakdownMap.get(ch)?.pinyin;
      const soundReading = getGlyphReading(sound);
      if (MAJOR_SEMANTIC_RADICALS.has(sound)) {
        const c = parsePinyin(charReading || '');
        const s = parsePinyin(soundReading);
        if (c.raw && s.raw && c.raw === s.raw) {
          filtered.set(ch, sound);
        } else {
          automatedFiltered++;
        }
        continue;
      }
      if (charReading && soundReading) {
        if (isModernPhoneticallyPlausible(charReading, soundReading)) {
          filtered.set(ch, sound);
        } else {
          automatedFiltered++;
        }
      } else {
        filtered.set(ch, sound);
      }
    }
    console.log(`Filtered out ${automatedFiltered} modern-implausible archaic sound mappings.`);
    return filtered;
  }

  // Raw source map, scoped to the learner pool and committed so rebuilds never
  // depend on gitignored scratch.
  const charToSound = new Map<string, string>();
  if (refreshFromSources) {
    // A character recorded as its own sound part is a series root, not a member.
    for (const [ch, sound] of deriveSoundsFromSources()) if (pool.has(ch) && ch !== sound) charToSound.set(ch, sound);
  } else {
    for (const [ch, sound] of Object.entries(committedMap!.sounds)) charToSound.set(ch, sound);
  }
  for (const [ch, sound] of Object.entries(CURATED_SOUNDS)) charToSound.set(ch, sound);
  for (const root of PRIMARY_PHONETIC_ROOTS) charToSound.delete(root);
  console.log(`Total characters mapped to sound component: ${charToSound.size}`);

  const overrides: SoundOverrides = existsSync(OVERRIDES_PATH)
    ? JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'))
    : {};
  for (const ch of overrides.noSound ?? []) charToSound.delete(ch);

  if (refreshFromSources) {
    const sounds = Object.fromEntries([...charToSound.entries()].sort(([a], [b]) => a.localeCompare(b)));
    const readings: Record<string, string> = {};
    for (const glyph of [...new Set(charToSound.values())].sort()) {
      const reading = getGlyphReading(glyph);
      if (reading) readings[glyph] = reading;
    }
    writeFileSync(PHONETIC_MAP_PATH, `${JSON.stringify({ sounds, readings }, null, 1)}\n`);
    console.log(`Refreshed ${PHONETIC_MAP_PATH} from output/phonetic/sources.`);
  }
  console.log(`Pool characters mapped to a sound part: ${charToSound.size}`);

  // Enrich series from breakdown components, but only with pool characters that
  // read exactly like the part (same syllable). Looser matches produced
  // shape-only "families" (人 → 參 傘 珍) that teach the wrong lesson.
  const roots = new Set(charToSound.values());
  const enriched = new Map<string, { root: string; exact: boolean }>();
  for (const root of roots) {
    if (MAJOR_SEMANTIC_RADICALS.has(root)) continue;
    const rootReading = getGlyphReading(root);
    if (!rootReading) continue;
    for (const char of pool.keys()) {
      const info = breakdownMap.get(char);
      if (!info || char === root || PRIMARY_PHONETIC_ROOTS.has(char) || charToSound.has(char)) continue;
      if (info.radical === root || !info.components.includes(root)) continue;
      const grade = gradeSound(info.pinyin, rootReading);
      if (grade !== 'same' && grade !== 'tone') continue;
      const exact = grade === 'same';
      const current = enriched.get(char);
      // Several roots can match; a same-syllable root beats a tone change, then first wins.
      if (!current || (exact && !current.exact)) enriched.set(char, { root, exact });
    }
  }
  for (const [char, { root }] of enriched) charToSound.set(char, root);
  console.log(`Enriched sound series with ${enriched.size} same-syllable pool characters.`);

  // Owner blocks: a listed character is no sound-alike of that part, nor of the
  // part the key character sounds like.
  for (const [key, blocked] of Object.entries(overrides.blockMember ?? {})) {
    const parts = new Set([key, charToSound.get(key)].filter((part): part is string => Boolean(part)));
    for (const member of blocked) {
      const part = charToSound.get(member);
      if (part && parts.has(part)) charToSound.delete(member);
    }
  }

  return { phonetic: charToSound, reading: getGlyphReading, breakdowns: breakdownMap, refreshedFromSources: refreshFromSources };
}
