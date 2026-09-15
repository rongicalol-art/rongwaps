import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMPONENT_LEXICON } from '../../src/data/memoryHooks/componentLexicon';
import { FUNCTION_WORD_LABEL, STROKE_GLYPHS, TECHNICAL_LABEL, usableGlosses } from './componentRules';
import { generateJson, resolveProvider } from './provider';
import { loadRuntimeDirectIndex } from './runtimeIndex';
import { extractJsonObject } from './jsonExtract';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROMPT_VERSION = 'curated-labels-v1';

interface PlanComponent {
  kind: string;
  glyph: string | null;
}

interface PlanRecord {
  character: string;
  components: PlanComponent[];
}

interface ComponentProfile {
  key: string;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: Array<{ id: string; label: string }>;
}

interface ChildInfo {
  glyph: string;
  glosses: string[];
  label: string | null;
}

interface LabelRecord {
  glyph: string;
  status: 'seed' | 'proposed' | 'needs-review';
  label: string | null;
  alternatives: string[];
  basis: 'meaning' | 'children' | 'shape' | null;
  confidence: 'high' | 'medium' | 'low' | null;
  reason: string | null;
  frequency: number;
  children: ChildInfo[];
  rawGlosses: string[];
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function buildPrompt(component: {
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  children: ChildInfo[];
}): string {
  return JSON.stringify({
    task: 'Propose ONE learner-facing memory label for a Chinese character part (component), so beginners can recognize it inside characters.',
    glyph: component.glyph,
    rawGlosses: component.rawGlosses,
    readings: component.readings,
    smallerParts: component.children,
    rules: [
      'Return JSON only: { "glyph", "label", "alternatives", "basis", "confidence", "reason" }.',
      'label: 1-3 concrete English words a beginner knows (noun, verb, or adjective).',
      'Describe what the part means or what its shape resembles; this is a memory label, not an etymology claim.',
      'If the smallerParts give a clear meaning, base the label on them.',
      'Never use technical terms: heavenly stems, earthly branches, surnames, radicals, variants, stroke names.',
      'Never use function words (the, of, can, should, from...) as the whole label.',
      'No historical or etymology language.',
      'If no honest, helpful label exists, set label to null with a short reason and confidence "low".',
      'alternatives: up to two other acceptable labels.',
      'basis: "meaning" if from glosses, "children" if from smallerParts, "shape" if purely visual.',
    ],
  });
}

function parseProposal(content: string): {
  label: string | null;
  alternatives: string[];
  basis: LabelRecord['basis'];
  confidence: LabelRecord['confidence'];
  reason: string | null;
} {
  let unwrapped = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    JSON.parse(unwrapped);
  } catch {
    unwrapped = extractJsonObject(content);
  }
  const parsed = JSON.parse(unwrapped) as Record<string, unknown>;
  const label = typeof parsed.label === 'string' ? parsed.label.trim().normalize('NFKC') : null;
  const alternatives = Array.isArray(parsed.alternatives)
    ? parsed.alternatives.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
  const basis = parsed.basis === 'meaning' || parsed.basis === 'children' || parsed.basis === 'shape' ? parsed.basis : null;
  const confidence = parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
    ? parsed.confidence
    : null;
  const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : null;
  return { label: label || null, alternatives, basis, confidence, reason };
}

function labelIssues(label: string | null): string[] {
  const issues: string[] = [];
  if (!label) return issues;
  if (/\p{Script=Han}/u.test(label)) issues.push('contains-han');
  if (label.split(/\s+/).length > 3) issues.push('too-many-words');
  if (TECHNICAL_LABEL.test(label)) issues.push('technical-term');
  if (FUNCTION_WORD_LABEL.test(label)) issues.push('function-word');
  return issues;
}

function renderMarkdown(records: LabelRecord[]): string {
  const proposed = records.filter((record) => record.status !== 'seed');
  const seeds = records.filter((record) => record.status === 'seed');
  const lines = [
    '# Book 1 curated component labels — review packet',
    '',
    `> ${proposed.length} components need a label. Seeds (${seeds.length}) are already approved.`,
    '> Reply in chat with edits (`g:𦥯 = schoolhouse`); unmentioned proposals are accepted as-is.',
    '',
    '## Needs your label',
    '',
    '| Component | Proposal | Basis | Conf | Seen in | Smaller parts | Raw glosses |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const record of proposed) {
    const children = record.children.map((child) => `${child.glyph}${child.label ? `(${child.label})` : child.glosses.length > 0 ? `(${child.glosses[0]})` : ''}`).join(', ');
    const glosses = usableGlosses(record.rawGlosses).slice(0, 3).join(', ') || record.rawGlosses.slice(0, 2).join(', ');
    lines.push(
      `| ${record.glyph} | ${record.label ?? ''} | ${record.basis ?? ''} | ${record.confidence ?? ''} | ${record.frequency} chars | ${children} | ${glosses} |`,
    );
  }
  lines.push('', '## Already seeded', '', seeds.map((record) => `${record.glyph}(${record.label})`).join(' '), '');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  const execute = flags.has('--execute');
  const limitFlagIndex = process.argv.indexOf('--limit');
  const limit = limitFlagIndex > -1 ? Number(process.argv[limitFlagIndex + 1]) : Infinity;

  const plans = loadJson<{ plans: PlanRecord[] }>(resolve(OUTPUT_DIR, 'book-1-plans.json')).plans;
  const profilesArtifact = loadJson<ComponentProfile[] | { profiles: ComponentProfile[] }>(
    resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'),
  );
  const profiles = Array.isArray(profilesArtifact) ? profilesArtifact : profilesArtifact.profiles;
  const profileByGlyph = new Map(profiles.map((profile) => [profile.glyph, profile]));

  const seedByGlyph = new Map<string, string>();
  for (const entry of COMPONENT_LEXICON) {
    if (entry.senses[0]?.label) seedByGlyph.set(entry.glyph, entry.senses[0].label);
  }
  for (const profile of profiles) {
    const label = profile.approvedDefaultLabels[0]?.label;
    if (label) seedByGlyph.set(profile.glyph, label);
  }

  const frequency = new Map<string, number>();
  const universe = new Set<string>();
  for (const plan of plans) {
    for (const component of plan.components) {
      if (component.kind !== 'glyph' || !component.glyph) continue;
      universe.add(component.glyph);
      frequency.set(component.glyph, (frequency.get(component.glyph) ?? 0) + 1);
    }
  }

  const direct = loadRuntimeDirectIndex();
  const childrenOf = (glyph: string): ChildInfo[] => {
    const children: ChildInfo[] = [];
    for (const child of direct.get(glyph) ?? []) {
      if (child === glyph || STROKE_GLYPHS.has(child) || /\p{Script=Han}{2}/u.test(child)) continue;
      const profile = profileByGlyph.get(child);
      const glosses = usableGlosses(profile?.rawGlosses ?? []).slice(0, 3);
      const label = seedByGlyph.get(child) ?? null;
      if (glosses.length === 0 && !label) continue;
      children.push({ glyph: child, glosses, label });
    }
    return children.slice(0, 5);
  };

  const records: LabelRecord[] = [];
  for (const glyph of universe) {
    const profile = profileByGlyph.get(glyph);
    const glosses = usableGlosses(profile?.rawGlosses ?? []);
    const seed = seedByGlyph.get(glyph);
    if (seed) {
      records.push({
        glyph, status: 'seed', label: seed, alternatives: [], basis: null, confidence: null,
        reason: null, frequency: frequency.get(glyph) ?? 0, children: childrenOf(glyph), rawGlosses: profile?.rawGlosses ?? [],
      });
      continue;
    }
    if (glosses.length > 0) continue;
    records.push({
      glyph,
      status: 'needs-review',
      label: null,
      alternatives: [],
      basis: null,
      confidence: null,
      reason: null,
      frequency: frequency.get(glyph) ?? 0,
      children: childrenOf(glyph),
      rawGlosses: profile?.rawGlosses ?? [],
    });
  }

  const targets = records.filter((record) => record.status === 'needs-review').sort((a, b) => b.frequency - a.frequency);
  const selected = targets.slice(0, limit);

  if (!execute) {
    console.log(JSON.stringify({
      dryRun: true,
      universe: universe.size,
      seeded: records.filter((record) => record.status === 'seed').length,
      needsLabel: targets.length,
      selectedForRun: selected.length,
      sampleGlyphs: selected.slice(0, 12).map((record) => `${record.glyph}(${record.frequency})`),
      samplePrompt: JSON.parse(buildPrompt({
        glyph: selected[0]?.glyph ?? '', rawGlosses: selected[0]?.rawGlosses ?? [],
        readings: profileByGlyph.get(selected[0]?.glyph ?? '')?.readings ?? [], children: selected[0]?.children ?? [],
      })),
    }, null, 2));
    return;
  }

  const provider = resolveProvider();
  let apiCalls = 0;
  for (const record of selected) {
    apiCalls += 1;
    const proposal = await generateJson(
      provider,
      'You propose short, honest memory labels for Chinese character parts. Return valid JSON only.',
      buildPrompt({
        glyph: record.glyph,
        rawGlosses: record.rawGlosses,
        readings: profileByGlyph.get(record.glyph)?.readings ?? [],
        children: record.children,
      }),
      400,
    );
    if (!proposal) throw new Error(`Empty label proposal for ${record.glyph}.`);
    const parsed = parseProposal(proposal);
    record.label = parsed.label;
    record.alternatives = parsed.alternatives;
    record.basis = parsed.basis;
    record.confidence = parsed.confidence;
    record.reason = parsed.reason;
    record.status = labelIssues(parsed.label).length > 0 ? 'needs-review' : 'proposed';
    if (labelIssues(parsed.label).length > 0) {
      record.reason = `${record.reason ?? ''} [issues: ${labelIssues(parsed.label).join(', ')}]`.trim();
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.proposed.json'), `${JSON.stringify({
    schemaVersion: 1,
    distribution: 'development-only-candidate',
    publishable: false,
    model: provider.model,
    promptVersion: PROMPT_VERSION,
    records,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.proposed.md'), renderMarkdown(records));
  console.log(JSON.stringify({
    model: provider.model,
    apiCalls,
    seeded: records.filter((record) => record.status === 'seed').length,
    proposed: records.filter((record) => record.status === 'proposed').length,
    stillNeedsReview: records.filter((record) => record.status === 'needs-review').length,
    jsonPath: resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.proposed.json'),
    mdPath: resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.proposed.md'),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
