import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditSingleHook } from './strictHookAudit';
import { analyzeCoverage, scanRenderSafety } from './checkHookQuality';
import { loadRuntimeDirectComponents } from './runtimeIndex';
import { findOrderMismatches } from './checkComponentOrder';
import { findAlignmentFindings, buildTaughtSenses } from './checkComponentLabelAlignment';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PHASE4_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');

const manifest = JSON.parse(readFileSync(resolve(PHASE4_DIR, 'manifest.json'), 'utf8'));
const shardCount = manifest.recordShards.length;
const shardCache = new Map();
export const lookup = (glyph: string) => {
  const shard = (glyph.codePointAt(0) ?? 0) % shardCount;
  if (!shardCache.has(shard)) {
    shardCache.set(
      shard,
      JSON.parse(readFileSync(resolve(PHASE4_DIR, 'records', 'shard-' + String(shard).padStart(2, '0') + '.json'), 'utf8')).records,
    );
  }
  return shardCache.get(shard)?.[glyph]?.t ?? null;
};

const curated = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'), 'utf8')).records;
export const labelCandidatesByGlyph = new Map();
export const childrenByGlyph = new Map();
for (const r of curated) {
  if (r.label) labelCandidatesByGlyph.set(r.glyph, [r.label, ...(r.alternatives || [])]);
  const children = (r.children || []).map((c: string | { glyph?: string }) => typeof c === 'string' ? c : c.glyph).filter(Boolean);
  if (children.length > 0) childrenByGlyph.set(r.glyph, children);
}

const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-3-inventory.json'), 'utf8')).entries;
export const { meanings: taughtByGlyph, readings: readingsByGlyph } = buildTaughtSenses(inventory);
export const directComponents = loadRuntimeDirectComponents();

export const approvedLabels = new Map<string, string[]>();
for (const name of ['book-1-component-profiles-v2.json', 'book-3-component-profiles-v2.json']) {
  const p = resolve(OUTPUT_DIR, name);
  const profiles = JSON.parse(readFileSync(p, 'utf8')).profiles;
  for (const profile of profiles) {
    const labels = profile.approvedDefaultLabels.map((e: { label: string }) => e.label.toLowerCase()).filter(Boolean);
    if (labels.length > 0) approvedLabels.set(profile.glyph, [...new Set([...(approvedLabels.get(profile.glyph) ?? []), ...labels])]);
  }
}

export function evaluateCharHook(char: string, hook: string, meaning: string | null = null, parts: Array<{ glyph?: string; aliases?: string[] }> = []): string[] {
  const issues: string[] = [];
  const render = scanRenderSafety(hook);
  for (const f of render) issues.push('render:' + f.code + ':' + f.message);

  const cov = analyzeCoverage({
    hook,
    strategy: 'scene',
    directComponents: directComponents.get(char) ?? [],
    labelCandidatesByGlyph,
    childrenByGlyph,
    aliasesByGlyph: new Map(parts.flatMap((p) => p.glyph && p.aliases?.length ? [[p.glyph, p.aliases]] : [])),
  });
  for (const f of cov) {
    if (f.severity === 'error') issues.push('coverage:' + f.code + ':' + f.message);
  }

  const selfToken = hook.match(new RegExp(char + '\\(([^()]+)\\)', 'u'));
  const prose = auditSingleHook({
    character: char,
    meaning,
    hook,
    targetDisplayLabel: selfToken?.[1]?.trim() ?? null,
  });
  for (const f of prose) issues.push('prose:' + f.code + ':' + f.detail);

  const order = findOrderMismatches([{ character: char, hook, acceptance: 'clean' }], lookup);
  if (order.length > 0) issues.push('order:' + order[0].actual.join('') + '->' + order[0].expected.join(''));

  const align = findAlignmentFindings([{ character: char, hook, acceptance: 'clean' }], taughtByGlyph, readingsByGlyph);
  for (const a of align) {
    const app = approvedLabels.get(a.glyph) ?? [];
    if (!app.includes(a.label.toLowerCase())) {
      issues.push('label:' + a.glyph + '(' + a.label + ')');
    }
  }

  return issues;
}

export function checkHook(char: string, hook: string) {
  return evaluateCharHook(char, hook, null, []);
}

console.log('repairEngine initialized successfully with full gate evaluation');
