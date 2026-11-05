import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT } from '../../src/utils/vocabulary/dictionaryShard';
import { stripPinyinTones } from '../../src/utils/pinyin/pinyinNormalize';
import { prepareVocabulary } from '../../src/utils/vocabulary/vocabularyMapping';
import { courseWordOf, linkCourseReadings, orderReadingKeys, readingKey } from '../../src/utils/vocabulary/wordEntry';
import { isReferenceOnlyDefinitions, REFERENCE_SENSE_RE } from '../../shared/dictionaryDefinitions';
import { parseReadings } from '../../src/utils/pinyin/pronunciation';
import type { Flashcard } from '../../src/data/flashcards';

const SHARD_DIR = resolve(process.cwd(), 'public/data/dictionary');
const SEARCH_DIR = resolve(process.cwd(), 'public/data/search');
const SEARCH_INDEX_PATH = resolve(SEARCH_DIR, 'dictionary-search-index.json');
const FREQ_MAP_PATH = resolve(process.cwd(), 'output/dictionary-frequency-map.json');
const LEVELS_PATH = resolve(process.cwd(), 'public/data/levels/levels.json');
const VOCAB_DIR = resolve(process.cwd(), 'public/data/vocabulary');
const PRONUNCIATION_PATH = resolve(process.cwd(), 'public/data/pronunciation/pronunciation.json');

type RawShardTuple = [number, string, string, string, string[]];
type CompactSearchTuple = [number, string, string, string, string, string[], number];

/** A character's secondary readings rank lower: 嗎 má "what?" below 嗎 ma, the question particle. */
const READING_RANK_FACTOR = 0.5;
/** A variant spelling of another word (閤 gé "variant of 閣", 龢 "harmonious (variant of 和)") ranks lower. */
const VARIANT_FACTOR = 0.3;
const VARIANT_SENSE_RE = /\bvariant of\b/i;
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

async function loadCourseCards(): Promise<Map<string, Flashcard[]>> {
  const items: unknown[] = [];
  for (const book of [1, 2, 3, 4]) {
    try {
      const raw = await readFile(resolve(VOCAB_DIR, `book-${book}.json`), 'utf8');
      items.push(...((JSON.parse(raw) as { items?: unknown[] }).items ?? []));
    } catch {
      // ignore missing book
    }
  }
  const byWord = new Map<string, Flashcard[]>();
  for (const card of prepareVocabulary(items)) {
    const word = courseWordOf(card);
    if (word) byWord.set(word, [...(byWord.get(word) ?? []), card]);
  }
  return byWord;
}

async function loadTaiwanReadings(): Promise<Map<string, string[]>> {
  try {
    const pack = JSON.parse(await readFile(PRONUNCIATION_PATH, 'utf8')) as { readings: Record<string, string> };
    return new Map(Object.entries(pack.readings).map(([character, value]) => [character, parseReadings(value).map((reading) => reading.pinyin)]));
  } catch {
    return new Map();
  }
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
  const courseCards = await loadCourseCards();
  const levelWords = await loadLevelWords();
  const taiwanReadings = await loadTaiwanReadings();

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

  // 3. Per word (traditional form): which reading each lesson teaches and the reading order (wordEntry rules)
  const rowsByWord = new Map<string, Array<{ id: number; traditional: string; pinyin_accented: string; definitions: string[] }>>();
  for (const [id, simplified, tradDiff, pinyinAccented, defs] of entriesById.values()) {
    const traditional = tradDiff || simplified;
    const list = rowsByWord.get(traditional) ?? [];
    list.push({ id, traditional, pinyin_accented: pinyinAccented, definitions: defs });
    rowsByWord.set(traditional, list);
  }
  const linkedRows = new Set<number>();
  const readingRank = new Map<number, number>();
  for (const [word, rows] of rowsByWord) {
    const links = linkCourseReadings(rows, courseCards.get(word) ?? []);
    const order = orderReadingKeys(rows, links, taiwanReadings.get(word));
    for (const row of rows) {
      const key = readingKey(row.pinyin_accented);
      if (links.has(key)) linkedRows.add(row.id);
      readingRank.set(row.id, Math.max(0, order.indexOf(key)));
    }
  }

  // 4. Filter and build scored entries
  const items: CompactSearchTuple[] = [];
  for (const [id, simplified, tradDiff, pinyinAccented, defs] of entriesById.values()) {
    if (!Array.isArray(defs) || defs.length === 0) continue;

    const traditional = tradDiff || simplified;
    // Course and level words are traditional forms: a variant sharing the simplified form (咊 for 和) is not one.
    const isCourseWord = courseCards.has(traditional);
    const isCourse = linkedRows.has(id);
    const tocflLevel = levelWords.get(traditional);
    const rawFreq = hasCorpusFreqMap
      ? Math.max(freqMap[simplified] ?? 0, freqMap[traditional] ?? 0)
      : (existingFreqById.get(id) ?? 0);

    // Pure cross-reference stubs ("variant of...", "used in...") stay only for course and level words.
    const nonStubDefs = defs.filter((d) => !REFERENCE_SENSE_RE.test(d));
    const isStub = isReferenceOnlyDefinitions(defs);
    if (isStub && !isCourseWord && !tocflLevel) continue;

    // Filter out obscure historical biographies / minor administrative counties if freq == 0
    if (
      rawFreq === 0 &&
      !isCourseWord &&
      !tocflLevel &&
      nonStubDefs.every((d) => OBSCURE_BIO_PLACE_RE.test(d))
    ) {
      continue;
    }

    // Filter out long (>4 char) zero-frequency capitalized proper nouns (institutions, obscure titles)
    if (
      rawFreq === 0 &&
      !isCourseWord &&
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
    // Corpus frequency belongs to the spelling, not the reading: secondary readings and variant spellings rank lower.
    const rank = readingRank.get(id) ?? 0;
    if (!isCourse && rank > 0) score *= READING_RANK_FACTOR ** rank;
    // Only a spelling of its own (traditional ≠ simplified) can be a variant: 合 mentions "variant of 盒" and stays.
    if (!isCourse && traditional !== simplified && defs.some((d) => VARIANT_SENSE_RE.test(d))) score *= VARIANT_FACTOR;
    if (isStub) score = Math.min(score, 3);
    if (isCourse) {
      // Course readings in lesson order: 得 de (Book 1) before 得 dé (Book 3).
      score = Math.max(score + 12, 45) - rank;
    }
    score = Math.min(100, Math.round(score));

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
