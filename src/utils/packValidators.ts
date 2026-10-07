import type { Flashcard } from '../data/flashcards';
import type { CourseExampleRecord, ReadingRecord, InteractiveGrammarPart } from '../types/models';
import { sentenceMatchesForms } from './vocabulary/wordForms';
import type { PackPart } from '../services/packLoader';
import { parseMembers, type PartMember, type PartsIndex } from './characters/parts';
import { parseReadings, type ReadingsIndex } from './pinyin/pronunciation';

export interface GenericContentManifest {
  schemaVersion: number;
  version: string;
  totalCount?: number;
  shardCount?: number;
  shardStrategy?: string;
  books?: Array<{ bookId: number; count: number; path: string; sha256?: string; bytes?: number }>;
  shards?: Array<{ shard: number; count: number; path: string; sha256?: string; bytes?: number }>;
}

export interface MemoryHookPackItem {
  id: string;
  character: string;
  mnemonic: string;
  content_type: string;
}

export interface MemoryHookPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: MemoryHookPackItem[];
}

export type ContentPackKind =
  | 'vocabulary'
  | 'breakdowns'
  | 'dictionary'
  | 'course-examples'
  | 'memory-hooks'
  | 'readings'
  | 'grammar'
  | 'dialogue-alignment'
  | 'strokes'
  | 'levels'
  | 'parts'
  | 'pronunciation';

const VALID_CONTENT_TYPES = new Set(['character', 'word', 'story']);

export function isValidMemoryHookItem(item: unknown): item is MemoryHookPackItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.character === 'string'
    && typeof candidate.mnemonic === 'string'
    && candidate.mnemonic.length > 0
    && typeof candidate.content_type === 'string'
    && VALID_CONTENT_TYPES.has(candidate.content_type);
}

export function isValidMemoryHookPack(pack: unknown, bookId: number, expectedCount: number): pack is MemoryHookPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<MemoryHookPack>;
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every(isValidMemoryHookItem);
}

export function packItemsToMnemonicMap(items: MemoryHookPackItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) map.set(item.id, item.mnemonic);
  return map;
}

export function resolveMnemonicFromMap(map: Map<string, string>, cacheKey: string): string | null {
  const direct = map.get(cacheKey);
  if (direct) return direct;
  if (cacheKey.startsWith('word_')) {
    const stripped = cacheKey.slice(5);
    if ([...stripped].length === 1) return map.get(stripped) ?? null;
  } else if ([...cacheKey].length === 1) {
    return map.get(`word_${cacheKey}`) ?? null;
  }
  return null;
}

export function isValidReadingRecord(item: unknown): item is ReadingRecord {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.bookId === 'number'
    && typeof candidate.lessonId === 'number'
    && typeof candidate.title === 'string'
    && (Array.isArray(candidate.dialogueLines) || Array.isArray(candidate.paragraphs));
}

export function isValidReadingsPack(pack: unknown, bookId: number, expectedCount: number): boolean {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as { schemaVersion?: number; bookId?: number; count?: number; items?: unknown[] };
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every(isValidReadingRecord);
}

export function isValidGrammarPack(pack: unknown, bookId: number, expectedCount: number): boolean {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as { schemaVersion?: number; bookId?: number; count?: number; items?: InteractiveGrammarPart[] };
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every((part) => (
      typeof part?.id === 'string'
      && part.bookId === bookId
      && Array.isArray(part.grammarPages)
    ));
}

export function isValidDialogueAlignmentPack(pack: unknown, bookId: number, expectedCount: number): boolean {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as { schemaVersion?: number; bookId?: number; count?: number; items?: Record<string, unknown> };
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Boolean(candidate.items)
    && typeof candidate.items === 'object';
}

export interface StrokePackItem {
  character: string;
  strokes: string[];
  medians: number[][][];
  radStrokes?: number[];
}

export interface StrokePack {
  schemaVersion: number;
  shard: number;
  count: number;
  items: StrokePackItem[];
}

export function isValidStrokeItem(item: unknown): item is StrokePackItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<StrokePackItem>;
  return typeof candidate.character === 'string'
    && Array.isArray(candidate.strokes)
    && Array.isArray(candidate.medians);
}

/**
 * TOCFL levels on the TBCL 1–7 scale. `tbcl` is the official list; `hsk` holds
 * only forms TBCL lacks (New HSK 2025, converted to the TBCL scale). Chars are
 * one string per level, words a "|"-joined string per level.
 */
export interface LevelPackSection {
  chars: Record<string, string>;
  words: Record<string, string>;
}

export interface LevelPack {
  schemaVersion: number;
  shard: number;
  count: number;
  sources: { tbcl: string; hsk: string };
  tbcl: LevelPackSection;
  hsk: LevelPackSection;
}

export interface LevelIndexSection {
  /** Character → level 1–7, in list order (most frequent first per level). */
  chars: Map<string, number>;
  words: Map<string, number>;
}

export interface LevelIndex {
  tbcl: LevelIndexSection;
  hsk: LevelIndexSection;
}

function isValidLevelSection(section: unknown): section is LevelPackSection {
  if (!section || typeof section !== 'object') return false;
  const candidate = section as Partial<LevelPackSection>;
  return typeof candidate.chars === 'object' && candidate.chars !== null
    && typeof candidate.words === 'object' && candidate.words !== null
    && Object.values(candidate.chars).every((list) => typeof list === 'string')
    && Object.values(candidate.words).every((list) => typeof list === 'string');
}

export function isValidLevelPack(pack: unknown, expectedCount: number): pack is LevelPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<LevelPack>;
  return candidate.schemaVersion === 2
    && candidate.count === expectedCount
    && isValidLevelSection(candidate.tbcl)
    && isValidLevelSection(candidate.hsk);
}

function sectionToIndex(section: LevelPackSection): LevelIndexSection {
  const chars = new Map<string, number>();
  const words = new Map<string, number>();
  for (const [level, list] of Object.entries(section.chars).sort(([a], [b]) => Number(a) - Number(b))) {
    for (const char of Array.from(list)) if (!chars.has(char)) chars.set(char, Number(level));
  }
  for (const [level, list] of Object.entries(section.words).sort(([a], [b]) => Number(a) - Number(b))) {
    for (const word of list.split('|')) if (word && !words.has(word)) words.set(word, Number(level));
  }
  return { chars, words };
}

export function levelPackToIndex(pack: LevelPack): LevelIndex {
  return { tbcl: sectionToIndex(pack.tbcl), hsk: sectionToIndex(pack.hsk) };
}

/**
 * Parts index (public/data/relations/parts.json): part → characters built from
 * it, and character → the part it sounds like. See src/utils/characters/parts.ts.
 */
export interface PartsPack {
  schemaVersion: number;
  shard: number;
  /** Number of `parents` keys plus `phonetic` entries. */
  count: number;
  parents: Record<string, string>;
  phonetic: Record<string, string>;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.values(value).every((entry) => typeof entry === 'string' && entry.length > 0);
}

export function isValidPartsPack(pack: unknown, expectedCount: number): pack is PartsPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<PartsPack>;
  return candidate.schemaVersion === 1
    && isStringRecord(candidate.parents)
    && isStringRecord(candidate.phonetic)
    && candidate.count === expectedCount
    && Object.keys(candidate.parents).length + Object.keys(candidate.phonetic).length === candidate.count;
}

export function partsPackToIndex(pack: PartsPack): PartsIndex {
  const parents = new Map<string, PartMember[]>();
  for (const [part, value] of Object.entries(pack.parents)) parents.set(part, parseMembers(value));
  return { parents, phonetic: new Map(Object.entries(pack.phonetic)) };
}

export function isValidStrokePack(pack: unknown, shard: number, expectedCount: number): pack is StrokePack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<StrokePack>;
  return candidate.schemaVersion === 1
    && candidate.shard === shard
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every(isValidStrokeItem);
}

export function getBreakdownShard(character: string, shardCount: number): number {
  const codePoint = character.codePointAt(0);
  return codePoint === undefined ? -1 : codePoint % shardCount;
}

export const getBookParts = (m: GenericContentManifest): PackPart[] => (m.books || []).map((b) => ({
  key: b.bookId,
  path: b.path,
  count: b.count,
}));

export const getShardParts = (m: GenericContentManifest): PackPart[] => (m.shards || []).map((s) => ({
  key: s.shard,
  path: s.path,
  count: s.count,
}));

export interface PackConfig<TPack, TLoaded> {
  namespace: string;
  manifestPath: string;
  manifestLabel: string;
  partPathPrefix: string;
  partCacheKeyKind: string;
  partLabel: (key: number) => string;
  validateManifest: (manifest: GenericContentManifest) => boolean;
  getParts: (manifest: GenericContentManifest) => PackPart[];
  validatePack: (pack: TPack, part: PackPart, manifest: GenericContentManifest) => boolean;
  transform?: (pack: TPack) => TLoaded;
}

export function recordsToExampleCards(
  records: CourseExampleRecord[],
  searchTerms: string[],
  pos?: string,
): Flashcard[] {
  const terms = Array.from(new Set(searchTerms.map((term) => term.trim()).filter(Boolean)));
  if (terms.length === 0) return [];

  const matching = records.filter((r) => (
    sentenceMatchesForms(r.traditional, terms, pos) || sentenceMatchesForms(r.simplified, terms, pos)
  ));
  const cards = new Map<string, Flashcard>();

  matching.forEach((r) => {
    const existing = cards.get(r.sourceCardId);
    const example = { chinese: r.traditional, pinyin: r.pinyin, english: r.english };
    if (existing) {
      if (!existing.examples?.some((item) => item.chinese === example.chinese)) {
        existing.examples?.push(example);
      }
      return;
    }
    cards.set(r.sourceCardId, {
      id: r.sourceCardId,
      bookId: r.bookId,
      lessonId: r.lessonId,
      partId: r.partId,
      front: r.sourceFront,
      back: r.sourceMeaning,
      examples: [example],
    });
  });

  return [...cards.values()];
}

/**
 * Pronunciation pack (public/data/pronunciation/pronunciation.json): character →
 * its readings, Taiwan-first. See src/utils/pinyin/pronunciation.ts.
 */
export interface PronunciationPack {
  schemaVersion: number;
  shard: number;
  count: number;
  readings: Record<string, string>;
}

export function isValidPronunciationPack(pack: unknown, expectedCount: number): pack is PronunciationPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<PronunciationPack>;
  return candidate.schemaVersion === 1
    && candidate.count === expectedCount
    && typeof candidate.readings === 'object' && candidate.readings !== null
    && Object.keys(candidate.readings).length === expectedCount;
}

export function pronunciationPackToIndex(pack: PronunciationPack): ReadingsIndex {
  const index: ReadingsIndex = new Map();
  for (const [char, value] of Object.entries(pack.readings)) index.set(char, parseReadings(value));
  return index;
}
