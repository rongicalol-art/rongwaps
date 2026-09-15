import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface Decision {
  word: string;
  action: 'approve' | 'edit' | 'reject' | null;
  hook: string | null;
  strategy?: string;
  note: string | null;
}

interface WordRecord {
  word: string;
  pinyin: string;
  meaning: string;
  characters: Array<{ char: string; meaning: string | null }>;
  strategy: string;
  hook: string | null;
  acceptance: string;
  reviewed?: boolean;
  review?: { action: string; note: string | null };
  issues: Array<{ code: string; severity: string; message: string }>;
  attempts: number;
  model: string;
  promptVersion: string;
}

interface InventoryEntry {
  character: string;
  occurrences: Array<{ word: string; meaning: string }>;
}

/** Mirrors `cleanVocabText` in src/utils/vocabCleaner.ts. */
function cleanVocabText(text: string): string {
  let cleaned = text.trim().replace(/\(.*?\)/g, '').replace(/[（）]/g, '');
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) cleaned = cleaned.substring(0, slashIndex);
  return cleaned.trim();
}

/** Recompute word meanings from the inventory, matching generateWordHooks.loadWords dedup. */
function refreshMeanings(records: WordRecord[]): number {
  const inventoryPath = resolve(OUTPUT_DIR, 'book-1-inventory.json');
  if (!existsSync(inventoryPath)) return 0;
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as { entries: InventoryEntry[] };
  const meaningsByWord = new Map<string, string[]>();
  for (const entry of inventory.entries) {
    for (const occurrence of entry.occurrences) {
      const word = cleanVocabText(occurrence.word);
      if (!/^\p{Script=Han}+$/u.test(word)) continue;
      const existing = meaningsByWord.get(word) ?? [];
      if (!existing.includes(occurrence.meaning)) existing.push(occurrence.meaning);
      meaningsByWord.set(word, existing);
    }
  }
  let changed = 0;
  for (const record of records) {
    const meanings = meaningsByWord.get(record.word);
    if (!meanings || meanings.length === 0) continue;
    const joined = meanings.join('; ');
    if (record.meaning !== joined) {
      record.meaning = joined;
      changed += 1;
    }
  }
  return changed;
}

function main(): void {
  const args = process.argv.slice(2);
  const value = (flag: string, fallback: string): string => {
    const index = args.indexOf(flag);
    return index > -1 ? args[index + 1] : fallback;
  };
  const artifactPath = resolve(OUTPUT_DIR, value('--artifact', 'book-1-word-hooks-v1.json'));
  const decisionsPath = resolve(OUTPUT_DIR, value('--decisions', 'book-1-word-review-decisions.json'));
  const additionsPath = resolve(OUTPUT_DIR, value('--additions', 'book-1-word-hooks-additions-v1.json'));
  if (!existsSync(decisionsPath)) throw new Error(`No decisions file at ${decisionsPath}`);

  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { records: WordRecord[] };
  const decisions = (JSON.parse(readFileSync(decisionsPath, 'utf8')) as { decisions: Decision[] }).decisions
    .filter((decision) => decision.action);
  const byWord = new Map(artifact.records.map((record) => [record.word, record]));

  const summary = { approved: 0, edited: 0, rejected: 0, missing: 0, added: 0, meaningsRefreshed: 0 };
  for (const decision of decisions) {
    const record = byWord.get(decision.word);
    if (!record) {
      summary.missing += 1;
      continue;
    }
    record.reviewed = true;
    record.review = { action: decision.action ?? 'approve', note: decision.note ?? null };
    if (decision.action === 'reject') {
      record.hook = null;
      record.acceptance = 'none';
      summary.rejected += 1;
      continue;
    }
    if (decision.action === 'edit' && decision.hook) {
      record.hook = decision.hook;
      if (decision.strategy) record.strategy = decision.strategy;
      summary.edited += 1;
    } else {
      summary.approved += 1;
    }
    record.issues = [];
    record.acceptance = 'clean';
  }

  if (args.includes('--additions')) {
    if (!existsSync(additionsPath)) throw new Error(`No additions file at ${additionsPath}`);
    const additions = (JSON.parse(readFileSync(additionsPath, 'utf8')) as { records: WordRecord[] }).records;
    for (const addition of additions) {
      const existing = byWord.get(addition.word);
      if (existing) {
        Object.assign(existing, addition);
        summary.edited += 1;
      } else {
        artifact.records.push(addition);
        byWord.set(addition.word, addition);
        summary.added += 1;
      }
    }
    artifact.records.sort((left, right) => left.word.localeCompare(right.word, 'zh-Hant'));
  }

  if (args.includes('--refresh-meanings')) {
    summary.meaningsRefreshed = refreshMeanings(artifact.records);
  }

  const backupPath = artifactPath.replace(/\.json$/, '.pre-review.json');
  if (!existsSync(backupPath)) copyFileSync(artifactPath, backupPath);
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ ...summary, applied: decisions.length, artifactPath }, null, 2));
}

main();
