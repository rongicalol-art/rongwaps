/**
 * Mechanical scan over all Book 1 character hooks in the meaning-only era.
 *
 * Flags, per hook: sound-language snippets, template-declaration snippets, and
 * component labels that are not grounded in the component ledger. Semantic
 * quality is Jev's job; this scan only produces the mechanical worklist and
 * the gold-set candidates.
 *
 * Output: output/memory-hooks/review/char-sound-scan-v1.json
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classifyHookShape } from './reviewRubric';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface V3Record {
  character: string;
  hook: string;
  meaning: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
}

interface LedgerEntry {
  glyph: string;
  senses: Array<{ label: string }>;
  readings: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, '').replace(/\s+/g, ' ').trim();
}

function groundedInLedger(label: string, entry: LedgerEntry | undefined): boolean {
  if (!entry) return false;
  const target = normalize(label);
  if (!target) return true;
  if (entry.readings.some((reading) => normalize(reading) === target)) return true;
  return entry.senses.some((sense) => {
    const candidate = normalize(sense.label);
    if (!candidate) return false;
    if (candidate === target) return true;
    if (candidate.includes(target) || target.includes(candidate)) return true;
    return false;
  });
}

function main() {
  mkdirSync(REVIEW_DIR, { recursive: true });

  const records = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'),
  ).records as V3Record[];
  const ledger = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'component-ledger-v1.json'), 'utf8'),
  ) as { entries: LedgerEntry[] };
  const ledgerByGlyph = new Map(ledger.entries.map((entry) => [entry.glyph, entry]));

  const items = records.map((record) => {
    const shape = classifyHookShape(record.hook);
    const ungroundedLabels = record.componentsUsed
      .filter((component) => !groundedInLedger(component.label, ledgerByGlyph.get(component.glyph)))
      .map((component) => ({ glyph: component.glyph, label: component.label }));
    return {
      character: record.character,
      meaning: record.meaning,
      hook: record.hook,
      soundFree: shape.soundSnippets.length === 0,
      soundSnippets: shape.soundSnippets,
      templateSnippets: shape.templateSnippets,
      ungroundedLabels,
    };
  });

  const summary = {
    total: items.length,
    soundFree: items.filter((item) => item.soundFree).length,
    withSoundLanguage: items.filter((item) => !item.soundFree).length,
    withTemplateLanguage: items.filter((item) => item.templateSnippets.length > 0).length,
    withUngroundedLabels: items.filter((item) => item.ungroundedLabels.length > 0).length,
  };

  const artifact = {
    schemaVersion: 1,
    rubricVersion: 'book-1-meaning-only-v1',
    generatedAt: new Date().toISOString(),
    source: 'output/memory-hooks/book-1-hooks-v3.json',
    summary,
    items,
  };
  writeFileSync(resolve(REVIEW_DIR, 'char-sound-scan-v1.json'), `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`Scanned ${summary.total} character hooks`);
  console.log(`  sound-free: ${summary.soundFree}`);
  console.log(`  sound language: ${summary.withSoundLanguage}`);
  console.log(`  template language: ${summary.withTemplateLanguage}`);
  console.log(`  ungrounded labels: ${summary.withUngroundedLabels}`);
  console.log('Wrote output/memory-hooks/review/char-sound-scan-v1.json');
}

main();
