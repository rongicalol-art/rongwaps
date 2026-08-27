import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMPONENT_LEXICON_BY_KEY, COMPONENT_LEXICON_VERSION } from '../../src/data/memoryHooks/componentLexicon';
import { buildComponentProfile } from '../../src/data/memoryHooks/componentProfiles';
import {
  PILOT_FRAME_REVIEWS,
  PILOT_RELATIONSHIP_EVIDENCE_SLOTS,
} from '../../src/data/memoryHooks/pilotFrameReviews';
import type {
  BookCharacterInventoryEntry,
  LessonMeaningOccurrence,
} from '../../src/features/character-memory-hooks/model';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';
import {
  BOOK_ONE_PILOT_SELECTION,
  buildCharacterPlan,
  chooseCanonicalMeaning,
  flagPossibleMetadataCollisions,
  isCharacterEntryVariant,
  type LegacyCharacterMetadata,
  type RuntimePlanRecord,
} from './pipeline';
import { buildPilotQualityPlan } from './qualityPlanner';

interface VocabularyRow {
  id: string;
  traditional: string;
  pinyin: string | null;
  meaning: string | null;
}

interface VocabularyPack {
  items: VocabularyRow[];
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

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const RUNTIME_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isHan(character: string): boolean {
  return /\p{Script=Han}/u.test(character);
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
      bookId: 1,
      firstVocabularyId,
      occurrences,
      meaningDecision: chooseCanonicalMeaning(standaloneMeanings, breakdowns.get(character) ?? null),
    };
  });
}

function main(): void {
  const vocabulary = readJson<VocabularyPack>(resolve(ROOT, 'public/data/vocabulary/book-1.json')).items;
  const breakdowns = loadBreakdowns();
  const manifest = readJson<RuntimeManifest>(resolve(RUNTIME_DIR, 'manifest.json'));
  if (manifest.publishable || manifest.distribution !== 'development-only-candidate') {
    throw new Error('Memory-hook pilot requires the explicitly development-only V3 candidate.');
  }

  const runtimeRecords = loadRuntimeRecords(manifest);
  const inventory = flagPossibleMetadataCollisions(buildInventory(vocabulary, breakdowns));
  const plans = inventory.map((entry) => buildCharacterPlan({
    inventory: entry,
    runtimeRecord: runtimeRecords.get(entry.character) ?? null,
    decompositionVersion: manifest.version,
    lexicon: COMPONENT_LEXICON_BY_KEY,
  }));

  const inventoryByCharacter = new Map(inventory.map((entry) => [entry.character, entry]));
  const planByCharacter = new Map(plans.map((plan) => [plan.character, plan]));
  const pilot = BOOK_ONE_PILOT_SELECTION.map((selection) => {
    const entry = inventoryByCharacter.get(selection.character);
    const plan = planByCharacter.get(selection.character);
    if (!entry || !plan) throw new Error(`Pilot character ${selection.character} is not in Book 1.`);
    return { ...selection, inventory: entry, plan };
  });
  const qualityPlans = PILOT_FRAME_REVIEWS.map((review) => {
    const entry = inventoryByCharacter.get(review.character);
    if (!entry) throw new Error(`Quality-plan character ${review.character} is not in Book 1.`);
    return buildPilotQualityPlan({
      inventory: entry,
      runtimeRecord: runtimeRecords.get(review.character) ?? null,
      decompositionVersion: manifest.version,
    });
  });
  const directGlyphs = new Set(plans.flatMap((plan) => plan.components.flatMap((component) => (
    component.kind === 'glyph' && component.glyph ? [component.glyph] : []
  ))));
  const componentProfiles = [...directGlyphs].sort().map((glyph) => buildComponentProfile(
    breakdowns.get(glyph) ?? { character: glyph, definition: null, pinyin: null },
  ));

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), `${JSON.stringify({
    schemaVersion: 1,
    bookId: 1,
    script: 'traditional',
    characterCount: inventory.length,
    entries: inventory,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-plans.json'), `${JSON.stringify({
    schemaVersion: 1,
    componentLexiconVersion: COMPONENT_LEXICON_VERSION,
    decompositionVersion: manifest.version,
    distribution: 'development-only-candidate',
    publishable: false,
    plans,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-pilot-selection.json'), `${JSON.stringify({
    schemaVersion: 1,
    approvedForGeneration: false,
    selectionCount: pilot.length,
    entries: pilot,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'), `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    profiles: componentProfiles,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-pilot-quality-plans-v2.json'), `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    promptChanged: false,
    hooksRegenerated: false,
    evidenceSlots: PILOT_RELATIONSHIP_EVIDENCE_SLOTS,
    plans: qualityPlans,
  }, null, 2)}\n`);

  const statusCounts = plans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.status] = (counts[plan.status] ?? 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({
    bookId: 1,
    script: 'traditional',
    vocabularyRows: vocabulary.length,
    uniqueCharacters: inventory.length,
    pilotCharacters: pilot.length,
    qualityPlanCharacters: qualityPlans.length,
    componentProfiles: componentProfiles.length,
    planStatusCounts: statusCounts,
    outputDirectory: 'output/memory-hooks',
    apiCallsMade: 0,
    publishable: false,
  }, null, 2));
}

main();
