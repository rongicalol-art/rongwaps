import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  chooseCanonicalMeaning,
  type LegacyCharacterMetadata,
} from './pipeline';
import type { BookCharacterInventoryEntry } from '../../src/features/character-memory-hooks/model';

interface InventoryArtifact {
  schemaVersion: number;
  bookId: number;
  script: 'traditional';
  characterCount: number;
  entries: BookCharacterInventoryEntry[];
}

interface BreakdownPack {
  items: LegacyCharacterMetadata[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const INVENTORY_PATH = resolve(OUTPUT_DIR, 'book-1-inventory.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-canonical-meaning-preview-v1.json');

function comparableDecision(decision: BookCharacterInventoryEntry['meaningDecision']): string {
  return JSON.stringify({
    selectedMeaning: decision.selectedMeaning,
    selectedPinyin: decision.selectedPinyin,
    selectedClassifier: decision.selectedClassifier ?? null,
    method: decision.method,
    confidence: decision.confidence,
    lessonSpecificMeanings: decision.lessonSpecificMeanings,
    dictionaryDefinition: decision.dictionaryDefinition,
    reviewReasons: decision.reviewReasons,
  });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function loadBreakdowns(): Map<string, LegacyCharacterMetadata> {
  const rows: LegacyCharacterMetadata[] = [];
  for (let shard = 0; shard < 32; shard += 1) {
    rows.push(...readJson<BreakdownPack>(resolve(
      ROOT,
      'public/data/breakdowns',
      `shard-${String(shard).padStart(2, '0')}.json`,
    )).items);
  }
  return new Map(rows.map((row) => [row.character, row]));
}

function main(): void {
  const inventory = readJson<InventoryArtifact>(INVENTORY_PATH);
  const breakdowns = loadBreakdowns();
  const entries = inventory.entries.map((entry) => ({
    character: entry.character,
    before: entry.meaningDecision,
    after: chooseCanonicalMeaning(
      entry.occurrences.filter((occurrence) => occurrence.standalone),
      breakdowns.get(entry.character) ?? null,
    ),
  }));
  const changed = entries.filter((entry) => comparableDecision(entry.before) !== comparableDecision(entry.after));
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schemaVersion: 1,
    distribution: 'development-only-candidate',
    publishable: false,
    sourceInventory: 'book-1-inventory.json',
    sourceBreakdowns: 'public/data/breakdowns',
    entries,
    changedCharacters: changed.map((entry) => entry.character),
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    characters: entries.length,
    changedCharacters: changed.length,
    output: 'output/memory-hooks/book-1-canonical-meaning-preview-v1.json',
    apiCallsMade: 0,
    publishable: false,
  }, null, 2));
}

main();
