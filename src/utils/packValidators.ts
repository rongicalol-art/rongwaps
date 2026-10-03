import type { Flashcard } from '../data/flashcards';
import type { CourseExampleRecord, ReadingRecord, InteractiveGrammarPart } from '../types/models';
import { sentenceMatchesForms } from './wordForms';
import type { PackPart } from '../services/packLoader';

export interface GenericManifestPart { key: number; path: string; count: number; }

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

export interface SoundHookPhonetic { glyph: string; reading: string; shift: string; }

export interface SoundHookEntry {
  id: string;
  character: string;
  meaning: string;
  pinyin: string;
  phonetic: SoundHookPhonetic | null;
  family: Array<{ character: string; pinyin: string; reading: string }>;
  needsHuman: boolean;
}

export interface SoundHookPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: SoundHookEntry[];
}

export type ContentPackKind =
  | 'vocabulary'
  | 'breakdowns'
  | 'dictionary'
  | 'course-examples'
  | 'memory-hooks'
  | 'sound-hooks'
  | 'sound-families'
  | 'readings'
  | 'grammar'
  | 'dialogue-alignment'
  | 'strokes';

export interface SoundFamilyMember {
  character: string;
  pinyin: string;
  meaning: string;
}

export interface SoundSeriesEntry {
  glyph: string;
  reading: string;
  members: SoundFamilyMember[];
}

export interface SoundFamiliesPack {
  schemaVersion: number;
  count: number;
  series: SoundSeriesEntry[];
}

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

function isPhonetic(value: unknown): value is SoundHookPhonetic {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.glyph === 'string'
    && typeof candidate.reading === 'string'
    && typeof candidate.shift === 'string';
}

export function isValidSoundHookItem(item: unknown): item is SoundHookEntry {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.character === 'string'
    && typeof candidate.meaning === 'string'
    && typeof candidate.pinyin === 'string'
    && (candidate.phonetic === null || isPhonetic(candidate.phonetic))
    && Array.isArray(candidate.family)
    && typeof candidate.needsHuman === 'boolean';
}

export function isValidSoundHookPack(pack: unknown, bookId: number, expectedCount: number): pack is SoundHookPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<SoundHookPack>;
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every(isValidSoundHookItem);
}

export function isValidSoundFamiliesPack(pack: unknown): pack is SoundFamiliesPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<SoundFamiliesPack>;
  return candidate.schemaVersion === 1
    && Array.isArray(candidate.series)
    && typeof candidate.count === 'number'
    && candidate.series.length === candidate.count;
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
