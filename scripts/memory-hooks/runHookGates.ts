import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';
import { analyzeCoverage, scanRenderSafety } from './checkHookQuality';
import { auditSingleHook } from './strictHookAudit';
import { findAlignmentFindings, buildTaughtSenses, type InventoryEntry } from './checkComponentLabelAlignment';
import {
  findOrderMismatches,
  findWordOrderMismatches,
  singleGlyphTokens,
} from './checkComponentOrder';
import { loadRuntimeDirectComponents } from './runtimeIndex';
import { STANDARD_RADICAL_ALIASES } from './standardAliases';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PHASE4_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');

interface HookRecord {
  character: string;
  meaning: string | null;
  hook: string | null;
  acceptance: string;
  parts?: Array<{ glyph?: string; suggestedLabel?: string | null; aliases?: string[] }>;
  validation?: { valid: boolean; issues: Array<{ code: string }> };
}

interface WordRecord {
  word: string;
  meaning: string;
  hook: string | null;
  acceptance: string;
  strategy: string;
  characters: Array<{ char: string; meaning: string | null }>;
  issues: Array<{ code: string }>;
}

interface CuratedLabelRecord {
  glyph: string;
  label: string | null;
  status: string;
  use?: 'label' | 'skip';
  alternatives?: string[];
  children?: Array<string | { glyph?: string; label?: string | null }>;
}

interface RuntimeRecord {
  t: RuntimeTreeNode;
}

function argumentValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : fallback;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function childGlyphOf(entry: string | { glyph?: string }): string | null {
  if (typeof entry === 'string') return entry.split('(')[0].trim() || null;
  return entry.glyph ?? null;
}

function loadCuratedData(): {
  labelCandidatesByGlyph: Map<string, string[]>;
  childrenByGlyph: Map<string, string[]>;
} {
  const artifact = readJson<{ records: CuratedLabelRecord[] }>(
    resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'),
  );
  const labelCandidatesByGlyph = new Map<string, string[]>();
  const childrenByGlyph = new Map<string, string[]>();
  for (const record of artifact.records) {
    if (record.use === 'skip') continue;
    const candidates = [record.label, ...(record.alternatives ?? [])].filter((label): label is string => Boolean(label));
    if (candidates.length > 0) labelCandidatesByGlyph.set(record.glyph, candidates);
    const children = [...new Set((record.children ?? []).map(childGlyphOf).filter((glyph): glyph is string => Boolean(glyph)))];
    if (children.length > 0) childrenByGlyph.set(record.glyph, children);
  }
  const profiles = readJson<{ profiles: Array<{ glyph: string; approvedDefaultLabels: Array<{ label: string }> }> }>(
    resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'),
  );
  for (const profile of profiles.profiles) {
    const approved = profile.approvedDefaultLabels.map((entry) => entry.label).filter(Boolean);
    if (approved.length === 0) continue;
    labelCandidatesByGlyph.set(profile.glyph, [...new Set([...(labelCandidatesByGlyph.get(profile.glyph) ?? []), ...approved])]);
  }
  return { labelCandidatesByGlyph, childrenByGlyph };
}

function loadApprovedLabels(stem: string): Map<string, string[]> {
  const approved = new Map<string, string[]>();
  const files = ['book-1-component-profiles-v2.json', `${stem}-component-profiles-v2.json`];
  for (const name of files) {
    const path = resolve(OUTPUT_DIR, name);
    if (!existsSync(path)) continue;
    const profiles = readJson<{ profiles: Array<{ glyph: string; approvedDefaultLabels: Array<{ label: string }> }> }>(path);
    for (const profile of profiles.profiles) {
      const labels = profile.approvedDefaultLabels.map((entry) => entry.label.toLowerCase());
      if (labels.length === 0) continue;
      approved.set(profile.glyph, [...new Set([...(approved.get(profile.glyph) ?? []), ...labels])]);
    }
  }
  return approved;
}

function main(): void {
  const bookId = Number(argumentValue('--book', '3'));
  const stem = `book-${bookId}`;

  const charArtifact = readJson<{ records: HookRecord[] }>(resolve(OUTPUT_DIR, `${stem}-hooks-v3.json`));
  const wordArtifact = existsSync(resolve(OUTPUT_DIR, `${stem}-word-hooks-v1.json`))
    ? readJson<{ records: WordRecord[] }>(resolve(OUTPUT_DIR, `${stem}-word-hooks-v1.json`))
    : { records: [] as WordRecord[] };
  const inventory = readJson<{ entries: InventoryEntry[] }>(resolve(OUTPUT_DIR, `${stem}-inventory.json`));
  const manifest = readJson<{ recordShards: unknown[] }>(resolve(PHASE4_DIR, 'manifest.json'));
  const shardCount = manifest.recordShards.length;
  const shardCache = new Map<number, Record<string, RuntimeRecord>>();
  const lookup = (glyph: string): RuntimeTreeNode | null => {
    const shard = (glyph.codePointAt(0) ?? 0) % shardCount;
    if (!shardCache.has(shard)) {
      shardCache.set(
        shard,
        readJson<{ records: Record<string, RuntimeRecord> }>(
          resolve(PHASE4_DIR, 'records', `shard-${String(shard).padStart(2, '0')}.json`),
        ).records,
      );
    }
    return shardCache.get(shard)?.[glyph]?.t ?? null;
  };

  const directComponents = loadRuntimeDirectComponents();
  const { labelCandidatesByGlyph, childrenByGlyph } = loadCuratedData();
  const { meanings: taughtByGlyph, readings: readingsByGlyph } = buildTaughtSenses(inventory.entries);

  const charIssues: Record<string, string[]> = {};
  const addCharIssue = (character: string, issue: string): void => {
    charIssues[character] = [...(charIssues[character] ?? []), issue];
  };

  const cleanCharRecords = charArtifact.records.filter((record) => record.acceptance === 'clean' && record.hook);
  for (const record of cleanCharRecords) {
    const hook = record.hook!;
    for (const finding of scanRenderSafety(hook)) {
      addCharIssue(record.character, `render:${finding.code}:${finding.message}`);
    }
    for (const finding of analyzeCoverage({
      hook,
      strategy: 'scene',
      directComponents: directComponents.get(record.character) ?? [],
      labelCandidatesByGlyph,
      childrenByGlyph,
      aliasesByGlyph: (() => {
        const map = new Map<string, string[]>();
        const add = (k: string, list: string[]) => {
          map.set(k, [...new Set([...(map.get(k) ?? []), ...list])]);
        };
        for (const [k, v] of Object.entries(STANDARD_RADICAL_ALIASES)) add(k, v);
        for (const p of record.parts ?? []) {
          if (p.glyph && p.aliases?.length) add(p.glyph, p.aliases);
        }
        return map;
      })(),
    })) {
      if (finding.severity === 'error') addCharIssue(record.character, `coverage:${finding.code}:${finding.message}`);
    }
    const selfToken = hook.match(new RegExp(`${record.character}\\(([^()]+)\\)`, 'u'));
    for (const finding of auditSingleHook({
      ...record,
      targetDisplayLabel: selfToken?.[1].trim() ?? null,
    })) {
      addCharIssue(record.character, `prose:${finding.code}:${finding.detail}`);
    }
  }
  for (const record of charArtifact.records) {
    if (record.acceptance === 'clean') continue;
    const codes = [...new Set(record.validation?.issues.map((issue) => issue.code) ?? [])];
    addCharIssue(record.character, `acceptance:${record.acceptance}:${codes.join('|') || 'no-hook'}`);
  }
  for (const mismatch of findOrderMismatches(cleanCharRecords, lookup)) {
    addCharIssue(mismatch.character, `order:${mismatch.actual.join('')}->${mismatch.expected.join('')}`);
  }
  const approvedLabels = loadApprovedLabels(stem);
  for (const finding of findAlignmentFindings(cleanCharRecords, taughtByGlyph, readingsByGlyph)) {
    const approved = approvedLabels.get(finding.glyph) ?? [];
    if (approved.includes(finding.label.toLowerCase())) continue;
    for (const character of finding.hooks) {
      addCharIssue(character, `label:${finding.glyph}(${finding.label})`);
    }
  }

  const wordIssues: Record<string, string[]> = {};
  const cleanWordRecords = wordArtifact.records.filter((record) => record.acceptance === 'clean' && record.hook);
  for (const record of cleanWordRecords) {
    const hook = record.hook!;
    if (hook.length < 12 || hook.length > 220) wordIssues[record.word] = [...(wordIssues[record.word] ?? []), 'length'];
    const stray = [...new Set([...hook].filter((glyph) => /\p{Script=Han}/u.test(glyph) && !record.word.includes(glyph)))];
    if (stray.length > 0) {
      wordIssues[record.word] = [...(wordIssues[record.word] ?? []), `stray:${stray.join('')}`];
    }
    if (!/[\p{Script=Han}]\s*\(/u.test(hook) && !hook.includes('**') && !/\([\p{Script=Han}\s+]+\)/u.test(hook)) {
      wordIssues[record.word] = [...(wordIssues[record.word] ?? []), 'emphasis:none'];
    }
    for (const finding of findAlignmentFindings(
      [{ character: record.word, hook, acceptance: 'clean' }],
      taughtByGlyph,
      readingsByGlyph,
    )) {
      const approved = approvedLabels.get(finding.glyph) ?? [];
      if (approved.includes(finding.label.toLowerCase())) continue;
      wordIssues[record.word] = [...(wordIssues[record.word] ?? []), `label:${finding.glyph}(${finding.label})`];
    }
    const tokens = singleGlyphTokens(hook, '');
    const unique = [...new Set([...record.word])];
    const seen = unique.filter((char) => tokens.includes(char));
    if (seen.length >= 2) {
      const expected = [...record.word].filter((char, index) => [...record.word].indexOf(char) === index && seen.includes(char));
      if (seen.join('') !== expected.join('')) {
        wordIssues[record.word] = [...(wordIssues[record.word] ?? []), `order:${seen.join('')}->${expected.join('')}`];
      }
    }
  }
  for (const record of wordArtifact.records) {
    if (record.acceptance === 'clean') continue;
    const codes = [...new Set(record.issues.map((issue) => issue.code) ?? [])];
    wordIssues[record.word] = [...(wordIssues[record.word] ?? []), `acceptance:${record.acceptance}:${codes.join('|') || 'no-hook'}`];
  }
  for (const mismatch of findWordOrderMismatches(cleanWordRecords)) {
    wordIssues[mismatch.character] = [...(wordIssues[mismatch.character] ?? []), `order:${mismatch.actual.join('')}->${mismatch.expected.join('')}`];
  }

  const cleanCharIds = cleanCharRecords
    .map((record) => record.character)
    .filter((character) => !charIssues[character]);
  const cleanWordIds = cleanWordRecords
    .map((record) => record.word)
    .filter((word) => !wordIssues[word]);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-gate-report.json`), `${JSON.stringify({
    schemaVersion: 1,
    bookId,
    chars: { checked: cleanCharRecords.length, flagged: Object.keys(charIssues).length, issues: charIssues },
    words: { checked: cleanWordRecords.length, flagged: Object.keys(wordIssues).length, issues: wordIssues },
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-chars-repair.json`), `${JSON.stringify(charIssues, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-words-repair.json`), `${JSON.stringify(wordIssues, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, `${stem}-auto-ship-ids.json`), `${JSON.stringify({
    ids: [
      ...cleanCharIds,
      ...cleanCharIds.map((character) => `word_${character}`),
      ...cleanWordIds.map((word) => `word_${word}`),
    ],
  }, null, 2)}\n`);

  console.log(JSON.stringify({
    bookId,
    chars: { clean: cleanCharIds.length, flagged: Object.keys(charIssues).length },
    words: { clean: cleanWordIds.length, flagged: Object.keys(wordIssues).length },
    report: resolve(OUTPUT_DIR, `${stem}-gate-report.json`),
  }, null, 2));
}

main();
