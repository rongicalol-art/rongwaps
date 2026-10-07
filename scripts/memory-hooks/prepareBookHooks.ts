import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildComponentProfile } from '../../src/data/memoryHooks/componentProfiles';
import { loadCuratedSkipGlyphs, loadPlanningLexicon, PLANNING_LEXICON_VERSION } from './planningLexicon';
import type {
  BookCharacterInventoryEntry,
  LessonMeaningOccurrence,
} from '../../src/types/memoryHooks';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';
import {
  buildCharacterPlan,
  chooseCanonicalMeaning,
  flagPossibleMetadataCollisions,
  isCharacterEntryVariant,
  type LegacyCharacterMetadata,
  type RuntimePlanRecord,
} from './pipeline';

interface VocabularyRow {
  id: string;
  traditional: string;
  pinyin: string | null;
  meaning: string | null;
}

interface BreakdownPack {
  items: LegacyCharacterMetadata[];
}

interface RuntimeRecordPack {
  records: Record<string, { r: string; s: number; t: RuntimeTreeNode }>;
}

interface RuntimeManifest {
  version: string;
  distribution: string;
  publishable: boolean;
  sources: Array<{ id: string }>;
}

interface ShippedPack {
  items: Array<{ id: string }>;
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PACK_DIR = resolve(ROOT, 'public/data/memory-hooks');
const RUNTIME_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function argumentValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : fallback;
}

function isHan(character: string): boolean {
  return /\p{Script=Han}/u.test(character);
}

/** Mirrors `cleanVocabText` in src/utils/vocabulary/vocabCleaner.ts. */
function cleanVocabText(text: string): string {
  let cleaned = text.trim().replace(/\(.*?\)/g, '').replace(/[（）]/g, '');
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) cleaned = cleaned.substring(0, slashIndex);
  return cleaned.trim();
}

function loadBreakdowns(): Map<string, LegacyCharacterMetadata> {
  const rows: LegacyCharacterMetadata[] = [];
  for (let shard = 0; shard < 32; shard += 1) {
    const name = `shard-${String(shard).padStart(2, '0')}.json`;
    rows.push(...readJson<BreakdownPack>(resolve(ROOT, 'public/data/breakdowns', name)).items);
  }
  return new Map(rows.map((row) => [row.character, row]));
}

function loadRuntimeRecords(manifest: RuntimeManifest): Map<string, RuntimePlanRecord> {
  const records = new Map<string, RuntimePlanRecord>();
  for (let shard = 0; shard < 64; shard += 1) {
    const name = `shard-${String(shard).padStart(2, '0')}.json`;
    const pack = readJson<RuntimeRecordPack>(resolve(RUNTIME_DIR, 'records', name));
    for (const [character, record] of Object.entries(pack.records)) {
      records.set(character, {
        recordId: record.r,
        sourceId: manifest.sources[record.s]?.id ?? 'unknown-source',
        tree: record.t,
      });
    }
  }
  return records;
}

function buildInventory(
  vocabulary: VocabularyRow[],
  breakdowns: Map<string, LegacyCharacterMetadata>,
  bookId: number,
): BookCharacterInventoryEntry[] {
  const firstSeen = new Map<string, string>();
  for (const row of vocabulary) {
    for (const character of Array.from(row.traditional).filter(isHan)) {
      if (!firstSeen.has(character)) firstSeen.set(character, row.id);
    }
  }

  return [...firstSeen.entries()].map(([character, firstVocabularyId]) => {
    const occurrences: LessonMeaningOccurrence[] = vocabulary
      .filter((row) => Array.from(row.traditional).includes(character))
      .map((row) => ({
        vocabularyId: row.id,
        word: row.traditional,
        pinyin: row.pinyin?.trim() || '',
        meaning: row.meaning?.trim() || '',
        standalone: isCharacterEntryVariant(row.traditional, character),
      }));
    const standaloneMeanings = occurrences.filter((occurrence) => occurrence.standalone);

    return {
      character,
      bookId,
      firstVocabularyId,
      occurrences,
      meaningDecision: chooseCanonicalMeaning(
        standaloneMeanings.length > 0 ? standaloneMeanings : occurrences,
        breakdowns.get(character) ?? null,
      ),
    };
  });
}

function loadShippedIds(): { characters: Set<string>; words: Set<string> } {
  const characters = new Set<string>();
  const words = new Set<string>();
  const manifestPath = resolve(PACK_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) return { characters, words };
  const manifest = readJson<{ books: Array<{ path: string }> }>(manifestPath);
  for (const book of manifest.books) {
    const packPath = resolve(ROOT, 'public/data', book.path.replace(/^\/data\//, ''));
    if (!existsSync(packPath)) continue;
    for (const item of readJson<ShippedPack>(packPath).items) {
      if (item.id.startsWith('word_')) words.add(item.id.slice(5));
      else characters.add(item.id);
    }
  }
  return { characters, words };
}

function main(): void {
  const bookId = Number(argumentValue('--book', '3'));
  if (!Number.isInteger(bookId) || bookId < 1) throw new Error('--book requires a positive integer.');
  const stem = `book-${bookId}`;

  const vocabulary = readJson<{ items: VocabularyRow[] }>(
    resolve(ROOT, `public/data/vocabulary/${stem}.json`),
  ).items;
  const breakdowns = loadBreakdowns();
  const manifest = readJson<RuntimeManifest>(resolve(RUNTIME_DIR, 'manifest.json'));
  if (manifest.publishable || manifest.distribution !== 'development-only-candidate') {
    throw new Error('Memory-hook generation requires the explicitly development-only V3 candidate.');
  }

  const runtimeRecords = loadRuntimeRecords(manifest);
  const inventory = flagPossibleMetadataCollisions(buildInventory(vocabulary, breakdowns, bookId));
  const planningLexicon = loadPlanningLexicon();
  const skipGlyphs = loadCuratedSkipGlyphs();
  const plans = inventory.map((entry) => buildCharacterPlan({
    inventory: entry,
    runtimeRecord: runtimeRecords.get(entry.character) ?? null,
    decompositionVersion: manifest.version,
    lexicon: planningLexicon,
    skipGlyphs,
  }));

  const directGlyphs = new Set(plans.flatMap((plan) => plan.components.flatMap((component) => (
    component.kind === 'glyph' && component.glyph ? [component.glyph] : []
  ))));
  const componentProfiles = [...directGlyphs].sort().map((glyph) => buildComponentProfile(
    breakdowns.get(glyph) ?? { character: glyph, definition: null, pinyin: null },
  ));

  const shipped = loadShippedIds();
  const inventoryByCharacter = new Map(inventory.map((entry) => [entry.character, entry]));
  const newCharacters = inventory
    .map((entry) => entry.character)
    .filter((character) => !shipped.characters.has(character));
  const wordSet = new Set<string>();
  for (const entry of inventoryByCharacter.values()) {
    for (const occurrence of entry.occurrences) {
      const word = cleanVocabText(occurrence.word);
      if ([...word].length > 1 && /^\p{Script=Han}+$/u.test(word) && !shipped.words.has(word)) {
        wordSet.add(word);
      }
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-inventory.json`), `${JSON.stringify({
    schemaVersion: 1,
    bookId,
    script: 'traditional',
    characterCount: inventory.length,
    entries: inventory,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-plans.json`), `${JSON.stringify({
    schemaVersion: 1,
    componentLexiconVersion: PLANNING_LEXICON_VERSION,
    decompositionVersion: manifest.version,
    distribution: 'development-only-candidate',
    publishable: false,
    plans,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-component-profiles-v2.json`), `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    profiles: componentProfiles,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-scope.json`), `${JSON.stringify({
    schemaVersion: 1,
    bookId,
    generatedAt: new Date().toISOString(),
    shippedCounts: {
      characters: shipped.characters.size,
      words: shipped.words.size,
    },
    characters: newCharacters,
    words: [...wordSet].sort((left, right) => left.localeCompare(right, 'zh-Hant')),
  }, null, 2)}\n`);

  const statusCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.status] = (counts[plan.status] ?? 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({
    bookId,
    vocabularyRows: vocabulary.length,
    uniqueCharacters: inventory.length,
    newCharacters: newCharacters.length,
    newWords: wordSet.size,
    componentProfiles: componentProfiles.length,
    planStatusCounts: statusCounts,
    outputDirectory: 'output/memory-hooks',
  }, null, 2));
}

main();
