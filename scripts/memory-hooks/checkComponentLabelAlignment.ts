import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface HookRecord {
  character: string;
  hook: string | null;
  acceptance: string;
}

export interface InventoryEntry {
  character: string;
  meaningDecision: { selectedMeaning: string | null; selectedPinyin: string | null; dictionaryDefinition: string | null };
}

export interface TaughtSenses {
  meanings: Map<string, string>;
  readings: Map<string, string[]>;
}

export function buildTaughtSenses(entries: InventoryEntry[]): TaughtSenses {
  const meanings = new Map<string, string>();
  const readings = new Map<string, string[]>();
  for (const entry of entries) {
    const senses = [entry.meaningDecision.selectedMeaning, entry.meaningDecision.dictionaryDefinition]
      .filter((sense): sense is string => Boolean(sense && sense.trim()));
    if (senses.length > 0) meanings.set(entry.character, senses.join('; '));
    const pinyin = entry.meaningDecision.selectedPinyin;
    if (pinyin) readings.set(entry.character, pinyin.split(/[;,/]/).map((reading) => reading.trim()).filter(Boolean));
  }
  return { meanings, readings };
}

export interface AlignmentFinding {
  glyph: string;
  label: string;
  taughtMeaning: string;
  hooks: string[];
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'with', 'for', 'from',
  'into', 'over', 'under', 'as', 'its', 'is', 'it', 'at', 'by', 'one', 'two',
]);

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]+/).filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

function stripTones(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * A label aligns when it shares a meaningful word with the taught meaning,
 * carries an explicit bridge to that meaning (`hand — also 'again'`), or is
 * simply the component's reading (`且(qiě)`).
 */
export function labelAlignsWithMeaning(label: string, meaning: string, readings: string[] = []): boolean {
  const normalizedLabel = label.toLowerCase();
  const normalizedMeaning = meaning.toLowerCase();
  if (normalizedMeaning.includes(normalizedLabel) || normalizedLabel.includes(normalizedMeaning)) return true;
  if (/\b(am|is|are|was|were|been|being)\b/.test(normalizedLabel) && /\bbe\b/.test(normalizedMeaning)) return true;
  const bridge = normalizedLabel.match(/also\s+['’]?([a-z][a-z'’-]*)['’]?/i);
  if (bridge && normalizedMeaning.includes(bridge[1])) return true;
  const labelReading = stripTones(label);
  if (labelReading.length >= 2 && readings.some((reading) => stripTones(reading) === labelReading)) return true;
  const labelWords = words(label);
  const meaningWords = words(meaning);
  return labelWords.some((word) => meaningWords.some((other) => other.startsWith(word) || word.startsWith(other)));
}

export function findAlignmentFindings(
  records: HookRecord[],
  taughtByGlyph: Map<string, string>,
  readingsByGlyph: Map<string, string[]> = new Map(),
): AlignmentFinding[] {
  const tokenPattern = /([\p{Script=Han}]+)\s*\(([^()]+)\)/gu;
  const byKey = new Map<string, AlignmentFinding>();
  for (const record of records) {
    if (record.acceptance !== 'clean' || !record.hook) continue;
    for (const match of record.hook.matchAll(tokenPattern)) {
      if ([...match[1]].length > 1) continue;
      const glyph = match[1];
      const label = match[2].trim();
      const taughtMeaning = taughtByGlyph.get(glyph);
      if (!taughtMeaning || labelAlignsWithMeaning(label, taughtMeaning, readingsByGlyph.get(glyph) ?? [])) continue;
      const key = `${glyph}\u0000${label}`;
      const finding = byKey.get(key) ?? { glyph, label, taughtMeaning, hooks: [] };
      finding.hooks.push(record.character);
      byKey.set(key, finding);
    }
  }
  return [...byKey.values()].sort((left, right) => right.hooks.length - left.hooks.length);
}

function main(): void {
  const strict = process.argv.includes('--strict');
  const artifact = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'),
  ) as { records: HookRecord[] };
  const inventory = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), 'utf8'),
  ) as { entries: InventoryEntry[] };
  const { meanings: taughtByGlyph, readings: readingsByGlyph } = buildTaughtSenses(inventory.entries);

  const findings = findAlignmentFindings(artifact.records, taughtByGlyph, readingsByGlyph);
  for (const finding of findings) {
    console.log(`${finding.glyph}(${finding.label}) ↔ taught "${finding.taughtMeaning}" — ${finding.hooks.length} hooks: ${finding.hooks.join(' ')}`);
  }
  console.log(`${findings.length} component labels differ from the taught meaning (${new Set(findings.flatMap((finding) => finding.hooks)).size} hooks affected).`);
  if (strict && findings.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
