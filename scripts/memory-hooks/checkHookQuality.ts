import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STROKE_GLYPHS } from './componentRules';
import { loadRuntimeDirectComponents, type RuntimeDirectComponent } from './runtimeIndex';
import { auditSingleHook, type AuditFinding } from './strictHookAudit';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface HookRecord {
  character: string;
  meaning: string | null;
  pinyin: string | null;
  strategy: string;
  hook: string | null;
  parts?: Array<{ glyph?: string; aliases?: string[] }>;
}

interface CuratedChild {
  glyph?: string;
  label?: string | null;
}

interface CuratedLabelRecord {
  glyph: string;
  label: string | null;
  status: string;
  use?: 'label' | 'skip';
  alternatives?: string[];
  children?: Array<string | CuratedChild>;
}

interface ComponentProfile {
  key?: string;
  glyph: string;
  approvedDefaultLabels: Array<{ label: string }>;
}

export interface QualityFinding {
  code: string;
  severity: 'error' | 'flag' | 'info';
  part: string | null;
  message: string;
}

export interface CoverageInput {
  hook: string;
  strategy: string;
  directComponents: RuntimeDirectComponent[];
  labelCandidatesByGlyph: Map<string, string[]>;
  childrenByGlyph: Map<string, string[]>;
  aliasesByGlyph: Map<string, string[]>;
}

function childGlyphOf(entry: string | CuratedChild): string | null {
  if (typeof entry === 'string') return entry.split('(')[0].trim() || null;
  return entry.glyph ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionsLabel(hook: string, label: string): boolean {
  if (!label || /\p{Script=Han}/u.test(label)) return false;
  return new RegExp(`(^|[^A-Za-z])${escapeRegExp(label)}([^A-Za-z]|$)`, 'i').test(hook);
}

const DESCRIPTION_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'with', 'for', 'from', 'into',
  'over', 'under', 'as', 'is', 'it', 'its', 'at', 'by', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
]);

/** A part is described when every meaningful word of one of its labels appears. */
function describesLabel(hook: string, label: string): boolean {
  const words = label.toLowerCase().split(/[^a-z]+/).filter((word) => word.length >= 3 && !DESCRIPTION_STOPWORDS.has(word));
  if (words.length < 2) return false;
  return words.every((word) => new RegExp(`(^|[^a-z])${escapeRegExp(word)}`, 'i').test(hook));
}

/**
 * Coverage rule: every direct visible part must surface as a token, a label, or
 * one of its inner parts — a prominent part is never silently dropped.
 */
export function analyzeCoverage(input: CoverageInput): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const component of input.directComponents) {
    if (component.kind !== 'glyph' || !component.glyph) {
      findings.push({
        code: 'unencoded-part',
        severity: 'flag',
        part: component.key,
        message: 'Unencoded or unknown direct part: confirm the hook describes its visible shape or intentionally skips it.',
      });
      continue;
    }
    const glyph = component.glyph;
    if (STROKE_GLYPHS.has(glyph)) continue;
    if (input.hook.includes(`${glyph}(`)) continue;
    const labels = input.labelCandidatesByGlyph.get(glyph) ?? [];
    if (labels.some((label) => mentionsLabel(input.hook, label))) continue;

    const aliases = input.aliasesByGlyph.get(glyph) ?? [];
    const aliasToken = aliases.find((alias) => input.hook.includes(`${alias}(`));
    if (aliasToken) {
      findings.push({
        code: 'part-alias-echo',
        severity: 'info',
        part: glyph,
        message: `Written through its sanctioned alias ${aliasToken}; confirm the alias shape matches on the page.`,
      });
      continue;
    }
    const aliasLabels = aliases.flatMap((alias) => input.labelCandidatesByGlyph.get(alias) ?? []);
    if (aliasLabels.some((label) => mentionsLabel(input.hook, label))) continue;
    if (labels.some((label) => describesLabel(input.hook, label))) {
      findings.push({
        code: 'part-described',
        severity: 'info',
        part: glyph,
        message: 'Surfaced through a plain-English shape description; confirm the wording matches the glyph.',
      });
      continue;
    }

    const children = input.childrenByGlyph.get(glyph) ?? [];
    const childToken = children.find((child) => input.hook.includes(`${child}(`));
    const childEcho = childToken ?? children.find((child) => input.hook.includes(child));
    if (childEcho) {
      findings.push({
        code: 'part-child-echo',
        severity: 'info',
        part: glyph,
        message: `Surfaced through inner ${childEcho}; confirm the whole shape is still recognizable.`,
      });
      continue;
    }

    const isShapeOnly = input.strategy === 'shape';
    const severity = labels.length > 0 && !isShapeOnly ? 'error' : 'flag';
    findings.push({
      code: 'part-missing',
      severity,
      part: glyph,
      message: children.length > 0
        ? `Direct part ${glyph} does not appear — describe its look or surface an inner part: ${children.join(' ')}.`
        : `Direct part ${glyph} does not appear — ${labels.length > 0 ? 'describe its visible shape instead of dropping it.' : 'confirm it is intentionally skipped or describe its look.'}`,
    });
  }
  return findings;
}

/**
 * Glyphs bundled in the RW-Extras webfont (`public/fonts/rw-extras*.woff2`,
 * subset from Noto Sans CJK TC + Plangothic, both SIL OFL): radicals, rare
 * variants and CJK Ext-A/B shapes that TW-EduKai does not cover. Tokens using
 * them render deterministically, so the safety scan treats them as safe.
 * Keep in sync with the @font-face unicode-ranges in `src/index.css`.
 */
export const BUNDLED_EXTRA_GLYPHS = new Set<string>([
  '㐅', '㐬', '㐱', '㒸', '㝵', '㠯', '䏍', '䒑', '䖒', '䖝', '䧹', '丂', '丄', '丅', '丆', '业', '丩', '丷', '亠', '亲',
  '亻', '亼', '仌', '从', '关', '冂', '冃', '冋', '冖', '冫', '刂', '勹', '卂', '卩', '厶', '厷', '厽', '叚', '号', '吂',
  '吅', '咅', '啚', '囬', '夂', '夊', '宀', '巛', '帀', '幺', '开', '彐', '彡', '忄', '扌', '攴', '攵', '朩', '歺', '殸',
  '殹', '氵', '灬', '爫', '犭', '疒', '癶', '睘', '礻', '糹', '罒', '耂', '肀', '臤', '臱', '艹', '蒦', '衤', '覀', '辶',
  '阝', '隶', '飞', '飠', '龰', '龵', '龶', '龷', '龸', '𠀎', '𠂆', '𠂇', '𠂉', '𠂊', '𠂒', '𠄌', '𢆶', '𢦏', '𣥂', '𦉫',
  '𦥑', '𧘇',
]);

/** Font-safety rule: learner-facing tokens must render in the app's Chinese font stack. */
export function scanRenderSafety(hook: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const seen = new Set<string>();
  for (const glyph of Array.from(hook)) {
    if (!/\p{Script=Han}/u.test(glyph) || seen.has(glyph)) continue;
    seen.add(glyph);
    const codePoint = glyph.codePointAt(0) ?? 0;
    const hex = codePoint.toString(16).toUpperCase();
    if ((codePoint >= 0x4e00 && codePoint <= 0x9fff) || (codePoint >= 0x2e80 && codePoint <= 0x2eff)) continue;
    if (BUNDLED_EXTRA_GLYPHS.has(glyph)) continue;
    if (codePoint >= 0x3400 && codePoint <= 0x4dbf) {
      findings.push({
        code: 'risky-glyph',
        severity: 'flag',
        part: glyph,
        message: `Ext-A glyph ${glyph} (U+${hex}) may not render everywhere; prefer an alias or a shape description.`,
      });
      continue;
    }
    if (codePoint >= 0x20000) {
      findings.push({
        code: 'unrenderable-glyph',
        severity: 'error',
        part: glyph,
        message: `Rare glyph ${glyph} (U+${hex}) will likely show as tofu; use an inner part or describe its look.`,
      });
      continue;
    }
    findings.push({
      code: 'foreign-glyph',
      severity: 'flag',
      part: glyph,
      message: `Han glyph ${glyph} (U+${hex}) sits outside the common CJK block; verify it renders.`,
    });
  }
  return findings;
}

function loadRecords(): HookRecord[] {
  const artifact = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8')) as { records: HookRecord[] };
  return artifact.records;
}

function loadCuratedData(): {
  labelCandidatesByGlyph: Map<string, string[]>;
  childrenByGlyph: Map<string, string[]>;
} {
  const artifact = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'), 'utf8'),
  ) as { records: CuratedLabelRecord[] };
  const labelCandidatesByGlyph = new Map<string, string[]>();
  const childrenByGlyph = new Map<string, string[]>();
  for (const record of artifact.records) {
    if (record.use === 'skip') continue;
    const candidates = [record.label, ...(record.alternatives ?? [])].filter((label): label is string => Boolean(label));
    if (candidates.length > 0) labelCandidatesByGlyph.set(record.glyph, candidates);
    const children = [...new Set((record.children ?? []).map(childGlyphOf).filter((glyph): glyph is string => Boolean(glyph)))];
    if (children.length > 0) childrenByGlyph.set(record.glyph, children);
  }
  const profiles = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'), 'utf8'),
  ) as ComponentProfile[] | { profiles: ComponentProfile[] };
  for (const profile of Array.isArray(profiles) ? profiles : profiles.profiles) {
    const approved = profile.approvedDefaultLabels.map((entry) => entry.label).filter(Boolean);
    if (approved.length === 0) continue;
    labelCandidatesByGlyph.set(profile.glyph, [...new Set([...(labelCandidatesByGlyph.get(profile.glyph) ?? []), ...approved])]);
  }
  return { labelCandidatesByGlyph, childrenByGlyph };
}

function buildAliasesByGlyph(record: HookRecord): Map<string, string[]> {
  const aliasesByGlyph = new Map<string, string[]>();
  const relate = (left: string, right: string) => {
    aliasesByGlyph.set(left, [...new Set([...(aliasesByGlyph.get(left) ?? []), right])]);
  };
  for (const part of record.parts ?? []) {
    if (!part.glyph) continue;
    for (const alias of part.aliases ?? []) {
      if (alias === part.glyph) continue;
      relate(part.glyph, alias);
      relate(alias, part.glyph);
    }
  }
  return aliasesByGlyph;
}

interface CharacterReport {
  character: string;
  meaning: string | null;
  hook: string;
  findings: QualityFinding[];
  prose: AuditFinding[];
}

function checkCharacter(options: {
  record: HookRecord;
  direct: RuntimeDirectComponent[];
  labelCandidatesByGlyph: Map<string, string[]>;
  childrenByGlyph: Map<string, string[]>;
}): CharacterReport {
  const { record, direct, labelCandidatesByGlyph, childrenByGlyph } = options;
  const hook = record.hook ?? '';
  const findings = [
    ...scanRenderSafety(hook),
    ...analyzeCoverage({
      hook,
      strategy: record.strategy,
      directComponents: direct,
      labelCandidatesByGlyph,
      childrenByGlyph,
      aliasesByGlyph: buildAliasesByGlyph(record),
    }),
  ];
  const prose = auditSingleHook(record);
  return { character: record.character, meaning: record.meaning, hook, findings, prose };
}

function formatReport(report: CharacterReport): string {
  const lines = [`${report.character} — ${report.meaning ?? '(no meaning)'}`, `  hook: ${report.hook || '(none)'}`];
  if (report.findings.length === 0) {
    lines.push('  parts: all direct parts surfaced');
  } else {
    for (const finding of report.findings) {
      lines.push(`  [${finding.severity}] ${finding.part ?? ''} ${finding.message}`.trimEnd());
    }
  }
  if (report.prose.length > 0) {
    for (const finding of report.prose) lines.push(`  [prose] ${finding.code} ${finding.category}: ${finding.detail}`);
  }
  const errors = report.findings.filter((finding) => finding.severity === 'error').length;
  lines.push(errors === 0 ? '  verdict: pass' : `  verdict: FAIL (${errors} error${errors === 1 ? '' : 's'})`);
  return lines.join('\n');
}

function main(): void {
  const args = process.argv.slice(2);
  const characterFlag = args.indexOf('--character');
  const requested = characterFlag > -1 ? args[characterFlag + 1] : args.find((arg) => !arg.startsWith('--'));
  const scanAll = args.includes('--all');
  if (!requested && !scanAll) throw new Error('Usage: tsx scripts/memory-hooks/checkHookQuality.ts <character> | --all');

  const records = loadRecords();
  const directComponents = loadRuntimeDirectComponents();
  const { labelCandidatesByGlyph, childrenByGlyph } = loadCuratedData();
  const targets = scanAll
    ? records.filter((record) => record.strategy !== 'none' && record.hook)
    : records.filter((record) => record.character === requested);
  if (targets.length === 0) throw new Error(`No hook record found for ${requested}.`);

  const reports = targets.map((record) => checkCharacter({
    record,
    direct: directComponents.get(record.character) ?? [],
    labelCandidatesByGlyph,
    childrenByGlyph,
  }));

  if (scanAll) {
    const failed = reports.filter((report) => report.findings.some((finding) => finding.severity === 'error'));
    for (const report of failed) console.log(formatReport(report));
    console.log(`${reports.length} hooks checked, ${failed.length} with errors.`);
  } else {
    for (const report of reports) console.log(formatReport(report));
  }

  if (reports.some((report) => report.findings.some((finding) => finding.severity === 'error'))) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
