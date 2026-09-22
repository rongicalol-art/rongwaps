/**
 * Builds the component ledger: one entry per Book 1 component glyph with its
 * accepted senses, readings, dictionary reference, and the characters that use
 * it. The ledger is the root-cause fix for label problems — hooks may only use
 * labels/readings listed here.
 *
 * Merge order for senses: reviewed labels (frozen) → pilot lexicon → curated
 * labels → batch proposals → approved defaults → dictionary senses → legacy
 * raw glosses (placeholders, flagged for confirmation).
 *
 * Outputs:
 *   output/memory-hooks/component-ledger-v1.json
 *   output/memory-hooks/component-ledger-gaps-v1.md
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPlanningLexicon } from './planningLexicon';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const DICTIONARY_DIR = resolve(ROOT, 'public/data/dictionary');

type SenseSource =
  | 'reviewed-labels-v1'
  | 'pilot-lexicon'
  | 'curated-labels-v1'
  | 'proposals-v1'
  | 'approved-default'
  | 'dictionary'
  | 'curated-override'
  | 'legacy-metadata';

interface LedgerSense {
  label: string;
  source: SenseSource;
  documented: boolean;
}

interface LedgerEntry {
  key: string;
  glyph: string;
  senses: LedgerSense[];
  readings: string[];
  dictionary: { pinyin: string; definitions: string[] } | null;
  usedBy: string[];
  exampleHook: string | null;
  status: 'complete' | 'needs-confirmation' | 'gap';
}

interface ProfileRecord {
  key: string;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: Array<{ id: string; label: string; sourceRefs: string[] }>;
  sourceRefs: string[];
}

interface ReviewedLabelRecord {
  glyph: string;
  label: string;
  use: string;
}

interface CuratedLabelRecord {
  glyph: string;
  label: string | null;
  use?: 'label' | 'skip';
}

interface V3Component {
  glyph: string;
  label: string;
}

interface V3Record {
  character: string;
  hook: string;
  componentsUsed: V3Component[];
  parts: Array<{ glyph: string; glosses: string[]; readings: string[] }>;
}

interface DictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin_accented: string;
  definitions: string[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function loadDictionaryIndex(): Map<string, DictionaryEntry> {
  const index = new Map<string, DictionaryEntry>();
  if (!existsSync(DICTIONARY_DIR)) return index;
  for (const file of readdirSync(DICTIONARY_DIR).filter((name) => /^shard-\d+\.json$/.test(name))) {
    const shard = readJson<{ items: DictionaryEntry[] }>(resolve(DICTIONARY_DIR, file));
    for (const item of shard.items) {
      if (item.traditional) index.set(item.traditional, item);
      if (item.simplified && !index.has(item.simplified)) index.set(item.simplified, item);
    }
  }
  return index;
}

function pushSense(senses: LedgerSense[], seen: Set<string>, label: string | null | undefined, source: SenseSource) {
  const trimmed = label?.trim();
  if (!trimmed) return;
  const dedupeKey = trimmed.toLowerCase();
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  senses.push({ label: trimmed, source, documented: source === 'dictionary' });
}

/** A label carrying tone marks is a reading, not a sense (e.g. 啚's "bǐ"). */
const PINYIN_TONE_MARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;

function isReadingLabel(label: string): boolean {
  return PINYIN_TONE_MARK.test(label);
}

interface LedgerOverrideRecord {
  glyph: string;
  senses: Array<{ label: string; sourceRef: string }>;
  readings: string[];
  note?: string;
}

function loadOverrides(): Map<string, LedgerOverrideRecord> {
  const path = resolve(ROOT, 'scripts/memory-hooks/component-ledger-overrides-v1.json');
  if (!existsSync(path)) return new Map();
  const records = readJson<{ records: LedgerOverrideRecord[] }>(path).records;
  return new Map(records.map((record) => [record.glyph, record]));
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const profiles = readJson<{ profiles: ProfileRecord[] }>(
    resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'),
  ).profiles;
  const reviewed = readJson<{ records: ReviewedLabelRecord[] }>(
    resolve(ROOT, 'scripts/memory-hooks/book-1-reviewed-component-labels-v1.json'),
  ).records;
  const curated = readJson<{ records: CuratedLabelRecord[] }>(
    resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'),
  ).records;
  const v3 = readJson<{ records: V3Record[] }>(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json')).records;
  const lexicon = loadPlanningLexicon();
  const dictionary = loadDictionaryIndex();
  const overrides = loadOverrides();

  const reviewedByGlyph = new Map(reviewed.map((record) => [record.glyph, record]));
  const curatedByGlyph = new Map(
    curated.filter((record) => record.use === 'label' && record.label).map((record) => [record.glyph, record]),
  );

  const usedBy = new Map<string, string[]>();
  const exampleHook = new Map<string, string>();
  const partReadings = new Map<string, string[]>();
  for (const record of v3) {
    for (const component of record.componentsUsed) {
      const list = usedBy.get(component.glyph) ?? [];
      if (!list.includes(record.character)) list.push(record.character);
      usedBy.set(component.glyph, list);
      if (!exampleHook.has(component.glyph)) exampleHook.set(component.glyph, record.hook);
    }
    for (const part of record.parts) {
      const list = partReadings.get(part.glyph) ?? [];
      for (const reading of part.readings) if (!list.includes(reading)) list.push(reading);
      partReadings.set(part.glyph, list);
    }
  }

  const glyphs = new Set<string>([
    ...profiles.map((profile) => profile.glyph),
    ...usedBy.keys(),
  ]);

  const entries: LedgerEntry[] = [];
  for (const glyph of [...glyphs].sort()) {
    const profile = profiles.find((candidate) => candidate.glyph === glyph);
    const dictionaryEntry = dictionary.get(glyph) ?? null;
    const lexiconEntry = lexicon.get(`g:${glyph}`);

    const senses: LedgerSense[] = [];
    const seen = new Set<string>();
    const readings = new Set<string>();

    const addLabel = (label: string | null | undefined, source: SenseSource) => {
      if (!label) return;
      if (isReadingLabel(label)) readings.add(label.trim());
      else pushSense(senses, seen, label, source);
    };

    const override = overrides.get(glyph);
    if (override) {
      for (const sense of override.senses) pushSense(senses, seen, sense.label, 'curated-override');
      for (const reading of override.readings) readings.add(reading);
    } else {
      addLabel(reviewedByGlyph.get(glyph)?.label, 'reviewed-labels-v1');
      for (const sense of lexiconEntry?.senses ?? []) addLabel(sense.label, 'pilot-lexicon');
      addLabel(curatedByGlyph.get(glyph)?.label, 'curated-labels-v1');
      for (const entry of profile?.approvedDefaultLabels ?? []) addLabel(entry.label, 'approved-default');
      for (const definition of dictionaryEntry?.definitions ?? []) {
        addLabel(definition.split(/[;(]/)[0], 'dictionary');
      }
      for (const gloss of profile?.rawGlosses ?? []) addLabel(gloss, 'legacy-metadata');
    }

    for (const reading of profile?.readings ?? []) readings.add(reading);
    for (const sense of lexiconEntry?.senses ?? []) if (sense.pinyin) readings.add(sense.pinyin);
    if (dictionaryEntry?.pinyin_accented) readings.add(dictionaryEntry.pinyin_accented);
    for (const reading of partReadings.get(glyph) ?? []) readings.add(reading);

    const nonLegacy = senses.filter((sense) => sense.source !== 'legacy-metadata');
    const status: LedgerEntry['status'] = senses.length === 0 && readings.size === 0
      ? 'gap'
      : nonLegacy.length === 0 && senses.length > 0
        ? 'needs-confirmation'
        : 'complete';

    entries.push({
      key: `g:${glyph}`,
      glyph,
      senses,
      readings: [...readings],
      dictionary: dictionaryEntry
        ? { pinyin: dictionaryEntry.pinyin_accented, definitions: dictionaryEntry.definitions }
        : null,
      usedBy: (usedBy.get(glyph) ?? []).slice(0, 12),
      exampleHook: exampleHook.get(glyph) ?? null,
      status,
    });
  }

  const gaps = entries.filter((entry) => entry.status !== 'complete');
  const ledger = {
    schemaVersion: 1,
    rubricVersion: 'book-1-meaning-only-v1',
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      'output/memory-hooks/book-1-component-profiles-v2.json',
      'scripts/memory-hooks/book-1-reviewed-component-labels-v1.json',
      'output/memory-hooks/book-1-curated-component-labels-v1.json',
      'src/data/memoryHooks/componentLexicon.ts',
      'public/data/dictionary/shard-*.json',
      'output/memory-hooks/book-1-hooks-v3.json',
    ],
    count: entries.length,
    completeCount: entries.length - gaps.length,
    gapCount: gaps.length,
    entries,
  };
  writeFileSync(resolve(OUTPUT_DIR, 'component-ledger-v1.json'), `${JSON.stringify(ledger, null, 2)}\n`);

  const lines: string[] = [
    '# Component ledger gaps — Book 1',
    '',
    `Generated ${ledger.generatedAt} · ${ledger.count} glyphs · ${ledger.completeCount} complete · ${gaps.length} need confirmation`,
    '',
    'Confirm or correct each entry, then re-run `memory-hooks:ledger`.',
    'For archaic pieces without a dictionary entry, add a documented sense with its source (example: 啚 → 鄙, mean/low/rustic).',
    '',
  ];
  for (const entry of gaps) {
    lines.push(`## ${entry.glyph} — ${entry.status}`);
    lines.push('');
    lines.push(`- Dictionary: ${entry.dictionary ? `yes (${entry.dictionary.pinyin})` : 'no entry'}`);
    lines.push(`- Current senses: ${entry.senses.map((sense) => `"${sense.label}" (${sense.source})`).join(', ') || 'none'}`);
    lines.push(`- Readings: ${entry.readings.join(', ') || 'none'}`);
    lines.push(`- Used by: ${entry.usedBy.join(' ') || 'none'}`);
    if (entry.exampleHook) lines.push(`- Example hook: ${entry.exampleHook}`);
    lines.push('');
  }
  writeFileSync(resolve(OUTPUT_DIR, 'component-ledger-gaps-v1.md'), `${lines.join('\n')}\n`);

  console.log(`Ledger: ${entries.length} glyphs (${ledger.completeCount} complete, ${gaps.length} gaps)`);
  console.log('Wrote output/memory-hooks/component-ledger-v1.json');
  console.log('Wrote output/memory-hooks/component-ledger-gaps-v1.md');
}

main();
