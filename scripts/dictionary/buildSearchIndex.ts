import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT } from '../../src/utils/vocabulary/dictionaryShard';
import { stripPinyinTones } from '../../src/utils/pinyin/pinyinNormalize';

const SHARD_DIR = resolve(process.cwd(), 'public/data/dictionary');
const SEARCH_DIR = resolve(process.cwd(), 'public/data/search');
const SEARCH_INDEX_PATH = resolve(SEARCH_DIR, 'dictionary-search-index.json');
const FREQ_MAP_PATH = resolve(process.cwd(), 'output/dictionary-frequency-map.json');
const LEVELS_PATH = resolve(process.cwd(), 'public/data/levels/levels.json');
const VOCAB_DIR = resolve(process.cwd(), 'public/data/vocabulary');

type RawShardTuple = [number, string, string, string, string[]];
type CompactSearchTuple = [number, string, string, string, string, string[], number];

const PURE_STUB_RE = /^(?:old |archaic |Japanese )?variant of\b|^surname\b|^see\b|^erhua variant of\b|^used in\b|^also written\b/i;
const OBSCURE_BIO_PLACE_RE = /\(\d{3,4}[-–]\d*\)|\b(?:county in |district in |prefecture in |township in |subdistrict in |town in )\b/i;

async function loadFrequencyMap(existingFreqs: Map<number, number>): Promise<Record<string, number>> {
  try {
    const raw = await readFile(FREQ_MAP_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    console.warn(`Note: ${FREQ_MAP_PATH} not found, falling back to existing search index frequencies (${existingFreqs.size} entries).`);
    return {};
  }
}

async function loadCourseWords(): Promise<Set<string>> {
  const words = new Set<string>();
  for (const book of [1, 2, 3, 4]) {
    try {
      const raw = await readFile(resolve(VOCAB_DIR, `book-${book}.json`), 'utf8');
      const data = JSON.parse(raw) as { items?: Array<{ front?: string; simplified?: string; traditional?: string }> };
      for (const item of data.items || []) {
        if (item.front) words.add(item.front.trim());
        if (item.simplified) words.add(item.simplified.trim());
        if (item.traditional) words.add(item.traditional.trim());
      }
    } catch {
      // ignore missing book
    }
  }
  return words;
}

async function loadLevelWords(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const raw = await readFile(LEVELS_PATH, 'utf8');
    const data = JSON.parse(raw) as { words?: Record<string, [number, number]> };
    for (const [word, [level]] of Object.entries(data.words || {})) {
      map.set(word, level);
    }
  } catch {
    // ignore
  }
  return map;
}

async function main(): Promise<void> {
  // 1. Load existing index frequencies as fallback
  const existingFreqById = new Map<number, number>();
  try {
    const raw = await readFile(SEARCH_INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { items?: CompactSearchTuple[] };
    for (const item of parsed.items || []) {
      if (item[6]) existingFreqById.set(item[0], item[6]);
    }
  } catch {
    // ignore
  }

  const freqMap = await loadFrequencyMap(existingFreqById);
  const hasCorpusFreqMap = Object.keys(freqMap).length > 0;
  const courseWords = await loadCourseWords();
  const levelWords = await loadLevelWords();

  // 2. Collect all unique dictionary entries across the 64 shards
  const entriesById = new Map<number, RawShardTuple>();
  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard += 1) {
    const filename = `shard-${String(shard).padStart(2, '0')}.json`;
    const raw = await readFile(resolve(SHARD_DIR, filename), 'utf8');
    const pack = JSON.parse(raw) as { items: RawShardTuple[] };
    for (const item of pack.items) {
      if (!entriesById.has(item[0])) {
        entriesById.set(item[0], item);
      }
    }
  }

  // 3. Filter and build scored entries
  const items: CompactSearchTuple[] = [];
  for (const [id, simplified, tradDiff, pinyinAccented, defs] of entriesById.values()) {
    if (!Array.isArray(defs) || defs.length === 0) continue;

    const traditional = tradDiff || simplified;
    const isCourse = courseWords.has(simplified) || courseWords.has(traditional);
    const tocflLevel = levelWords.get(traditional) ?? levelWords.get(simplified);
    const rawFreq = hasCorpusFreqMap
      ? Math.max(freqMap[simplified] ?? 0, freqMap[traditional] ?? 0)
      : (existingFreqById.get(id) ?? 0);

    // Filter out pure cross-reference stubs ("variant of...", "surname...", "see...")
    const nonStubDefs = defs.filter((d) => !PURE_STUB_RE.test(d));
    if (nonStubDefs.length === 0 && !isCourse && !tocflLevel && rawFreq < 15) continue;

    // Filter out obscure historical biographies / minor administrative counties if freq == 0
    if (
      rawFreq === 0 &&
      !isCourse &&
      !tocflLevel &&
      nonStubDefs.every((d) => OBSCURE_BIO_PLACE_RE.test(d))
    ) {
      continue;
    }

    // Filter out long (>4 char) zero-frequency capitalized proper nouns (institutions, obscure titles)
    if (
      rawFreq === 0 &&
      !isCourse &&
      !tocflLevel &&
      Array.from(simplified).length > 4 &&
      nonStubDefs.every((d) => /^[A-Z]/.test(d.replace(/^\([^)]+\)\s*/, '')))
    ) {
      continue;
    }

    // Compute composite learner relevance score (0-100):
    // Corpus frequency is the base; course words and TOCFL words get a floor/boost so learners
    // never see archaic words above textbook or TOCFL vocabulary.
    // Unsegmented 3-char compounds (e.g. 拖延症 from 拖延) inherit 60% of their 2-char root frequency.
    let score = rawFreq;
    if (score === 0 && Array.from(simplified).length === 3) {
      const rootFreq = Math.max(
        freqMap[simplified.slice(0, 2)] ?? 0,
        freqMap[simplified.slice(-2)] ?? 0,
        freqMap[traditional.slice(0, 2)] ?? 0,
        freqMap[traditional.slice(-2)] ?? 0,
      );
      if (rootFreq >= 15) {
        score = Math.round(rootFreq * 0.6);
      }
    }
    if (tocflLevel !== undefined) {
      // TOCFL levels 1..7 -> floor of 38 down to 14
      const tocflFloor = Math.max(14, 42 - tocflLevel * 4);
      score = Math.max(score, tocflFloor);
    }
    if (isCourse) {
      score = Math.max(score + 12, 45);
    }
    score = Math.min(100, score);

    const flat = stripPinyinTones(pinyinAccented);
    items.push([
      id,
      simplified,
      tradDiff,
      pinyinAccented,
      flat,
      nonStubDefs.length > 0 ? nonStubDefs : defs,
      score,
    ]);
  }

  // Sort by score descending, then character length ascending, then id ascending
  items.sort((a, b) => b[6] - a[6] || Array.from(a[1]).length - Array.from(b[1]).length || a[0] - b[0]);

  await mkdir(SEARCH_DIR, { recursive: true });
  const payload = {
    schemaVersion: 1,
    count: items.length,
    items,
  };
  const json = `${JSON.stringify(payload)}\n`;
  await writeFile(SEARCH_INDEX_PATH, json, 'utf8');

  console.log(
    `Built dictionary search index: ${items.length} entries (${(Buffer.byteLength(json) / (1024 * 1024)).toFixed(2)} MB raw)`,
  );
}

main().catch((err) => {
  console.error('Failed to build dictionary search index:', err);
  process.exit(1);
});
