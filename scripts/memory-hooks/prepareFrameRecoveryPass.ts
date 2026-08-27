import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

type RecoveryFrameKind = 'direct-scene' | 'one-level-expansion' | 'grouped-intermediate' | 'formation-candidate' | 'origin-candidate' | 'no-hook';
type RecoveryStatus = 'candidate' | 'review-required' | 'withheld';

interface FrozenPlan {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  status: string;
  frame: { kind: string; reason: string; detail?: string };
  meaningReviewReasons: string[];
  reviewReasons: string[];
  decompositionRecordId: string;
  decompositionVersion: string;
}

interface FrozenPlanArtifact {
  publishable: false;
  selectionHash: string;
  plans: FrozenPlan[];
}

interface StrictResult {
  character: string;
  canonicalMeaning: string | null;
  assessmentGate: string;
  components: Array<{
    occurrenceId: string;
    glyph: string | null;
    treePath: string;
    label: string | null;
    provisionalLabel: string | null;
    globalApproval: string;
    availableForViability: boolean;
  }>;
  parsedJson: {
    target?: string;
    targetMeaning?: string;
    componentTokens?: string[];
    decision?: string;
    reason?: string;
    issueCodes?: string[];
    directTargetConnection?: string;
  } | null;
  normalizedAssessment?: StrictResult['parsedJson'];
  deterministicValidation: { valid: boolean; status: string; issues: Array<{ code: string; message: string }> };
  finalStatus: string;
}

interface StrictArtifact {
  publishable: false;
  hooksGenerated: false;
  records: StrictResult[];
}

interface ComponentProfile {
  key: string;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: Array<{ label: string; sourceRefs: string[] }>;
  sourceRefs: string[];
}

interface ComponentProfileArtifact {
  publishable: false;
  profiles: ComponentProfile[];
}

interface ReviewedLabel {
  glyph: string;
  globalApproval: 'approved' | 'review-required';
  approvedLabel: string | null;
  proposedLabel: string;
  rawDefinitions: string[];
  readings: string[];
  metadataStatus: string;
  source: { proposalWarnings: string[] };
}

interface ReviewedLabelArtifact {
  publishable: false;
  entries: ReviewedLabel[];
}

interface RuntimeRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

interface RuntimeShard {
  records: Record<string, RuntimeRecord>;
}

interface RuntimeManifest {
  publishable: false;
  licenseGate: { publishable: false; status: string; openBlockers: string[] };
  version: string;
  recordCount: number;
  maximumTreeDepth: number;
  sources: Array<{ id: string; redistributionStatus: string; version: string }>;
}

interface DecompositionNodeView {
  path: string;
  kind: 'structure' | 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  operator?: string;
  glyph?: string;
  componentSourceId?: string;
  childCount: number;
  directVisibleGlyphs: string[];
  depth: number;
}

interface LabelAvailability {
  glyph: string;
  approvedLabel: string | null;
  rawGlosses: string[];
  readings: string[];
  sourceRefs: string[];
  status: 'approved' | 'review-required' | 'missing';
  warnings: string[];
}

interface CandidateFrame {
  kind: RecoveryFrameKind;
  status: RecoveryStatus;
  componentGlyphs: string[];
  componentTokens: string[];
  basis: string;
  safeBecause: string[];
  requiredEvidence: string[];
  blockers: string[];
}

interface RecoveryRecord {
  character: string;
  canonicalMeaning: string | null;
  canonicalPinyin: string | null;
  currentDirectFrame: {
    kind: string;
    status: string;
    componentGlyphs: string[];
    componentTokens: string[];
    failureOrBlockReason: string[];
  };
  availableAlternateDecompositionDepths: DecompositionNodeView[];
  labelAvailability: LabelAvailability[];
  candidatePedagogicalFrames: CandidateFrame[];
  additionalEvidenceOrMetadataRequired: string[];
  remainWithheldIfNoSafeFrame: boolean;
  noDeepSeekCalled: true;
  publishable: false;
}

interface RecoveryArtifact {
  schemaVersion: 1;
  artifact: 'book-1-frozen-frame-recovery-pass-v1';
  distribution: 'development-only-candidate';
  publishable: false;
  hooksGenerated: false;
  deepSeekCallsMade: 0;
  sourceFrozenQualityPlans: string;
  sourceStrictViabilityResults: string;
  sourceRuntimePack: string;
  sourceMetadata: string[];
  licenseGate: { status: string; publishable: false; openBlockers: string[] };
  targetCount: number;
  records: RecoveryRecord[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const QUALITY_PLANS_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');
const STRICT_RESULTS_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v2.json');
const PROFILE_PATH = resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json');
const REVIEW_LABEL_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-review-v1.json');
const RUNTIME_ROOT = resolve(ROOT, 'output/decomposition-runtime/phase4-candidate');
const RUNTIME_MANIFEST_PATH = resolve(RUNTIME_ROOT, 'manifest.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-frame-recovery-pass-v1.json');
const REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-frame-recovery-pass-v1.md');

const TARGETS = ['哥', '男', '的', '課', '買', '開', '學', '愛', '新', '看', '語', '得', '比', '會'];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function children(node: RuntimeTreeNode): RuntimeTreeNode[] {
  if (node[0] === 's') return node[2];
  if (node[0] === 'g' && node.length === 3) return node[2];
  return [];
}

function nodeGlyph(node: RuntimeTreeNode): string | null {
  return node[0] === 'g' ? node[1] : null;
}

function nodeKind(node: RuntimeTreeNode): DecompositionNodeView['kind'] {
  if (node[0] === 's') return 'structure';
  if (node[0] === 'g') return 'glyph';
  if (node[0] === 'u') return 'unencoded-component';
  if (node[0] === '?') return 'unknown-component';
  return 'source-entity';
}

function collectDepths(root: RuntimeTreeNode, records: Map<string, RuntimeRecord>): DecompositionNodeView[] {
  const views: DecompositionNodeView[] = [];
  function directAtoms(node: RuntimeTreeNode): Array<{ node: RuntimeTreeNode; path: string }> {
    if (node[0] === 's') {
      return node[2].flatMap((child, index) => directAtoms(child).map((atom) => ({
        ...atom,
        path: `${index}${atom.path ? `.${atom.path}` : ''}`,
      })));
    }
    return [{ node, path: '' }];
  }
  function atomLabel(node: RuntimeTreeNode): string {
    if (node[0] === 'g') return node[1];
    if (node[0] === 'u') return `u:${node[1]}`;
    if (node[0] === '?') return node[1] ? `?:${node[1]}` : '?';
    if (node[0] === 'e') return `e:${node[1]}`;
    return 'structure';
  }
  function visitStructure(node: RuntimeTreeNode, path: string, depth: number, seen: Set<string>): void {
    const atoms = directAtoms(node);
    views.push({
      path,
      kind: nodeKind(node),
      ...(node[0] === 's' ? { operator: node[1] } : {}),
      ...(node[0] === 'g' ? { glyph: node[1] } : {}),
      ...(node[0] === 'u' ? { componentSourceId: node[1] } : {}),
      childCount: children(node).length,
      directVisibleGlyphs: atoms.map((atom) => atomLabel(atom.node)),
      depth,
    });
    const occurrenceCounts = new Map<string, number>();
    for (const atom of atoms) {
      if (atom.node[0] !== 'g') continue;
      const glyph = atom.node[1];
      const record = records.get(glyph);
      if (!record || children(record.t).length === 0 || seen.has(glyph)) continue;
      const occurrence = occurrenceCounts.get(glyph) ?? 0;
      occurrenceCounts.set(glyph, occurrence + 1);
      const occurrenceSuffix = atoms.filter((candidate) => candidate.node[0] === 'g' && candidate.node[1] === glyph).length > 1
        ? `[${occurrence}]`
        : '';
      visitStructure(record.t, `${path || 'root'}→${glyph}${occurrenceSuffix}`, depth + 1, new Set([...seen, glyph]));
    }
  }
  visitStructure(root, 'root', 0, new Set());
  return views;
}

function directGlyphs(root: RuntimeTreeNode): Array<{ glyph: string | null; path: string; kind: DecompositionNodeView['kind'] }> {
  const result: Array<{ glyph: string | null; path: string; kind: DecompositionNodeView['kind'] }> = [];
  function visit(node: RuntimeTreeNode, path: string): void {
    if (node[0] === 's') return node[2].forEach((child, index) => visit(child, path ? `${path}.${index}` : `${index}`));
    result.push({ glyph: nodeGlyph(node), path, kind: nodeKind(node) });
  }
  children(root).forEach((child, index) => visit(child, `${index}`));
  return result;
}

function allDirectGlyphsAtNode(node: RuntimeTreeNode): string[] {
  if (node[0] === 's') return node[2].flatMap((child) => allDirectGlyphsAtNode(child));
  return node[0] === 'g' ? [node[1]] : [];
}

function buildRuntimeMap(): { records: Map<string, RuntimeRecord>; manifest: RuntimeManifest } {
  const manifest = readJson<RuntimeManifest>(RUNTIME_MANIFEST_PATH);
  const records = new Map<string, RuntimeRecord>();
  for (let shard = 0; shard < 64; shard += 1) {
    const path = resolve(RUNTIME_ROOT, `records/shard-${String(shard).padStart(2, '0')}.json`);
    const data = readJson<RuntimeShard>(path);
    for (const [character, record] of Object.entries(data.records)) records.set(character, record);
  }
  return { records, manifest };
}

function buildMetadataMap(profiles: ComponentProfileArtifact, reviewed: ReviewedLabelArtifact): Map<string, LabelAvailability> {
  const result = new Map<string, LabelAvailability>();
  for (const profile of profiles.profiles) {
    result.set(profile.glyph, {
      glyph: profile.glyph,
      approvedLabel: profile.approvedDefaultLabels[0]?.label ?? null,
      rawGlosses: profile.rawGlosses,
      readings: profile.readings,
      sourceRefs: profile.sourceRefs,
      status: profile.approvedDefaultLabels.length > 0 ? 'approved' : profile.rawGlosses.length > 0 ? 'review-required' : 'missing',
      warnings: [],
    });
  }
  for (const entry of reviewed.entries) {
    const current = result.get(entry.glyph) ?? {
      glyph: entry.glyph,
      approvedLabel: null,
      rawGlosses: entry.rawDefinitions,
      readings: entry.readings,
      sourceRefs: ['review-layer'],
      status: 'missing' as const,
      warnings: [],
    };
    result.set(entry.glyph, {
      ...current,
      approvedLabel: entry.approvedLabel,
      rawGlosses: entry.rawDefinitions.length > 0 ? entry.rawDefinitions : current.rawGlosses,
      readings: entry.readings.length > 0 ? entry.readings : current.readings,
      status: entry.globalApproval === 'approved' && entry.approvedLabel ? 'approved' : 'review-required',
      warnings: entry.source.proposalWarnings,
    });
  }
  return result;
}

function token(glyph: string, metadata: Map<string, LabelAvailability>): string {
  const label = metadata.get(glyph)?.approvedLabel;
  return label ? `${glyph}(${label})` : glyph;
}

function describeCurrentFrame(
  target: string,
  frozen: FrozenPlan,
  strict: StrictResult | undefined,
  root: RuntimeTreeNode | null,
  metadata: Map<string, LabelAvailability>,
): RecoveryRecord['currentDirectFrame'] {
  const direct = root ? directGlyphs(root) : [];
  const glyphs = direct.map((entry) => entry.glyph).filter((glyph): glyph is string => Boolean(glyph));
  const componentTokens = glyphs.map((glyph) => token(glyph, metadata));
  const failureOrBlockReason = [...new Set([
    ...(frozen.reviewReasons || []),
    ...(frozen.frame.detail ? [frozen.frame.detail] : []),
    ...(strict?.parsedJson?.issueCodes || []).map((code) => `strict-scene:${code}`),
    ...(strict?.deterministicValidation.issues || []).map((issue) => `strict-validation:${issue.code}`),
  ])];
  return {
    kind: strict?.normalizedAssessment?.decision || frozen.frame.kind,
    status: strict?.normalizedAssessment
      ? strict.normalizedAssessment.decision === 'scene-viable' && strict.deterministicValidation.valid
        ? 'scene-viable-assessment'
        : 'review-required'
      : strict?.finalStatus || frozen.status,
    componentGlyphs: glyphs,
    componentTokens,
    failureOrBlockReason,
  };
}

function frame(
  kind: RecoveryFrameKind,
  status: RecoveryStatus,
  componentGlyphs: string[],
  metadata: Map<string, LabelAvailability>,
  basis: string,
  safeBecause: string[],
  requiredEvidence: string[],
  blockers: string[],
): CandidateFrame {
  return {
    kind,
    status,
    componentGlyphs,
    componentTokens: componentGlyphs.map((glyph) => token(glyph, metadata)),
    basis,
    safeBecause,
    requiredEvidence,
    blockers,
  };
}

function metadataRequirement(glyphs: string[], metadata: Map<string, LabelAvailability>): string[] {
  return glyphs.flatMap((glyph) => {
    const item = metadata.get(glyph);
    if (!item || item.status === 'missing') return [`approved learner label for ${glyph} from existing raw metadata or reviewed label layer`];
    if (item.status === 'review-required') return [`human approval of one supplied label for ${glyph}; raw glosses/readings are not enough`];
    return [];
  });
}

function candidateFrames(
  character: string,
  meaning: string | null,
  frozen: FrozenPlan,
  root: RuntimeTreeNode | null,
  records: Map<string, RuntimeRecord>,
  metadata: Map<string, LabelAvailability>,
  strict: StrictResult | undefined,
): CandidateFrame[] {
  if (!root) return [frame('no-hook', 'withheld', [], metadata, 'No runtime decomposition record.', [], ['reviewed decomposition or origin evidence'], ['missing runtime record'])];
  const direct = directGlyphs(root);
  const glyphs = direct.map((entry) => entry.glyph).filter((glyph): glyph is string => Boolean(glyph));
  const output: CandidateFrame[] = [];
  const strictDecision = strict?.normalizedAssessment?.decision || strict?.parsedJson?.decision;
  if (strictDecision === 'scene-not-useful' || strictDecision === 'scene-weak') {
    const labelsReady = direct.every((entry) => entry.kind === 'glyph' && entry.glyph && metadata.get(entry.glyph)?.status === 'approved');
    output.push(frame(
      'direct-scene',
      labelsReady && strictDecision === 'scene-weak' ? 'review-required' : 'withheld',
      glyphs,
      metadata,
      'Strict v2 Scene viability result on the frozen direct components.',
      strictDecision === 'scene-weak' ? ['A direct scene may still be possible, but the strict evaluator found a weak causal chain.'] : [],
      [],
      strict?.parsedJson?.issueCodes || ['strict-scene-failure'],
    ));
  } else if (frozen.status === 'blocked' || frozen.frame.kind === 'none') {
    output.push(frame(
      'direct-scene',
      'review-required',
      glyphs,
      metadata,
      'Frozen direct structure with reviewed metadata only; Scene viability has not been assessed for this target.',
      [],
      ['target-specific strict Scene viability assessment after every direct label is approved'],
      metadataRequirement(glyphs, metadata),
    ));
  }

  const directNodes = children(root);
  for (const [index, child] of directNodes.entries()) {
    const childGlyph = child[0] === 'g' ? child[1] : null;
    const childRecord = childGlyph ? records.get(childGlyph) : null;
    if (!childRecord || children(childRecord.t).length === 0) continue;
    const expandedGlyphs = allDirectGlyphsAtNode(childRecord.t).filter(Boolean);
    if (expandedGlyphs.length === 0 || expandedGlyphs.length > 4) continue;
    const requirements = metadataRequirement(expandedGlyphs, metadata);
    const allApproved = requirements.length === 0;
    output.push(frame(
      'one-level-expansion',
      allApproved ? 'review-required' : 'withheld',
      expandedGlyphs,
      metadata,
      `Expand direct component ${childGlyph || `at path ${index}`} by one existing runtime level; do not flatten further.`,
      allApproved ? ['All expanded glyphs have approved labels, but target-specific usefulness is not established.'] : [],
      ['target-specific Scene viability or reviewed target-specific relationship evidence'],
      requirements,
    ));
  }

  const grouped = direct.filter((entry) => entry.glyph).filter((entry) => {
    const record = records.get(entry.glyph as string);
    return Boolean(record && children(record.t).length > 0);
  }).map((entry) => entry.glyph as string);
  const directChildrenAreAllGlyphs = directNodes.every((node) => node[0] === 'g');
  if (grouped.length > 0 && directChildrenAreAllGlyphs) {
    output.push(frame(
      'grouped-intermediate',
      'review-required',
      grouped,
      metadata,
      'Retain an existing encoded intermediate as one pedagogical unit rather than inventing labels for its internals.',
      grouped.every((glyph) => metadata.get(glyph)?.status === 'approved') ? ['The intermediate glyph itself may be teachable if its supplied label is approved.'] : [],
      ['approved learner label for each intermediate glyph', 'target-specific usefulness review'],
      grouped.flatMap((glyph) => metadataRequirement([glyph], metadata)),
    ));
  }

  const allDirectApproved = direct.every((entry) => entry.kind === 'glyph' && entry.glyph && metadata.get(entry.glyph)?.status === 'approved');
  if (allDirectApproved && direct.length >= 2 && meaning) {
    output.push(frame(
      'formation-candidate',
      'review-required',
      glyphs,
      metadata,
      'Direct components have labels, but no target-specific semantic/phonetic role evidence is present in the frozen data.',
      [],
      ['reviewed target-specific role evidence', 'semantic bridge for a semantic component if used', 'reviewed phonetic relationship if used'],
      ['roles are currently unclassified; no bridge or phonetic evidence may be inferred'],
    ));
  }

  if (meaning && (character === '學' || character === '愛' || character === '新' || character === '看')) {
    output.push(frame(
      'origin-candidate',
      'withheld',
      glyphs,
      metadata,
      'The target may benefit from source-backed formation/origin evidence, but none is present in the frozen plan.',
      [],
      ['cleared, reviewed source claim matching this character, meaning, and exact components'],
      ['origin evidence is absent; do not infer historical claims from the tree'],
    ));
  }

  if (output.length === 0 || output.every((candidate) => candidate.status === 'withheld')) {
    output.push(frame('no-hook', 'withheld', glyphs, metadata, 'No safe candidate frame is supported by existing labels and evidence.', [], [], ['no approved evidence path']));
  } else {
    output.push(frame('no-hook', 'withheld', glyphs, metadata, 'Fallback disposition if every proposed route remains unsupported after review.', [], [], ['all alternate routes remain unapproved or unsupported']));
  }
  return output;
}

function buildReport(artifact: RecoveryArtifact): string {
  const lines = [
    '# Frozen frame-recovery pass',
    '',
    '> Development-only analysis. This pass reads frozen plans, strict Scene results, existing Phase 4 hierarchy, and existing metadata. It does not modify planner behavior, call DeepSeek, generate hooks, or publish data.',
    '',
    `- Targets: ${artifact.targetCount}`,
    `- DeepSeek calls: ${artifact.deepSeekCallsMade}`,
    `- Hooks generated: ${artifact.hooksGenerated}`,
    `- Publishable: ${artifact.publishable}`,
    `- Runtime license gate: ${artifact.licenseGate.status}`,
    '',
  ];
  for (const record of artifact.records) {
    lines.push(`## ${record.character} — ${record.canonicalMeaning || 'meaning unresolved'}`, '');
    lines.push(`- Current direct frame: ${record.currentDirectFrame.kind} (${record.currentDirectFrame.status})`);
    lines.push(`- Direct components: ${record.currentDirectFrame.componentTokens.join(' + ') || '—'}`);
    lines.push(`- Why failed/blocked: ${record.currentDirectFrame.failureOrBlockReason.join('; ') || '—'}`);
    lines.push(`- Remain withheld if no safe frame exists: ${record.remainWithheldIfNoSafeFrame ? 'yes' : 'no'}`, '');
    lines.push('### Available decomposition depths', '', '| Path | Kind | Glyph/operator | Depth | Existing visible descendants |', '|---|---|---|---:|---|');
    for (const depth of record.availableAlternateDecompositionDepths) lines.push(`| ${depth.path || 'root'} | ${depth.kind} | ${depth.glyph || depth.operator || depth.componentSourceId || '—'} | ${depth.depth} | ${depth.directVisibleGlyphs.join(' + ') || '—'} |`);
    lines.push('', '### Component metadata', '', '| Glyph | Status | Approved label | Raw glosses | Readings | Warnings |', '|---|---|---|---|---|---|');
    for (const label of record.labelAvailability) lines.push(`| ${label.glyph} | ${label.status} | ${label.approvedLabel || '—'} | ${label.rawGlosses.join('; ') || '—'} | ${label.readings.join('; ') || '—'} | ${label.warnings.join(', ') || '—'} |`);
    lines.push('', '### Candidate pedagogical frames', '', '| Kind | Status | Components | Basis | Safe because | Evidence/metadata required | Blockers |', '|---|---|---|---|---|---|---|');
    for (const candidate of record.candidatePedagogicalFrames) lines.push(`| ${candidate.kind} | ${candidate.status} | ${candidate.componentTokens.join(' + ') || '—'} | ${candidate.basis} | ${candidate.safeBecause.join('; ') || '—'} | ${candidate.requiredEvidence.join('; ') || '—'} | ${candidate.blockers.join('; ') || '—'} |`);
    lines.push('', '');
  }
  lines.push('## Interpretation boundary', '', 'A candidate frame is not an approved plan. “Review-required” means the existing structure and metadata make the route worth human review; it does not authorize a role, bridge, origin claim, or hook. “Withheld” means the current evidence is insufficient and the target should remain without a hook until safe evidence is added.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const plans = readJson<FrozenPlanArtifact>(QUALITY_PLANS_PATH);
  const strict = readJson<StrictArtifact>(STRICT_RESULTS_PATH);
  const profiles = readJson<ComponentProfileArtifact>(PROFILE_PATH);
  const reviewed = readJson<ReviewedLabelArtifact>(REVIEW_LABEL_PATH);
  const { records: runtimeRecords, manifest } = buildRuntimeMap();
  if (plans.publishable || strict.publishable || strict.hooksGenerated || profiles.publishable || reviewed.publishable) throw new Error('Refusing to analyze a publishable or hook-generating artifact.');
  const strictByCharacter = new Map(strict.records.map((record) => [record.character, record]));
  const planByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));
  const metadata = buildMetadataMap(profiles, reviewed);
  const records: RecoveryRecord[] = TARGETS.map((character) => {
    const plan = planByCharacter.get(character);
    if (!plan) throw new Error(`Missing frozen quality plan for ${character}.`);
    const runtime = runtimeRecords.get(character);
    const strictResult = strictByCharacter.get(character);
    const root = runtime?.t ?? null;
    const direct = root ? directGlyphs(root) : [];
    const glyphs = direct.map((entry) => entry.glyph).filter((glyph): glyph is string => Boolean(glyph));
    const relevantGlyphs = [...new Set(glyphs)];
    return {
      character,
      canonicalMeaning: plan.canonicalMeaning,
      canonicalPinyin: plan.canonicalPinyin,
      currentDirectFrame: describeCurrentFrame(character, plan, strictResult, root, metadata),
      availableAlternateDecompositionDepths: root ? collectDepths(root, runtimeRecords) : [],
      labelAvailability: relevantGlyphs.map((glyph) => metadata.get(glyph) ?? {
        glyph,
        approvedLabel: null,
        rawGlosses: [],
        readings: [],
        sourceRefs: [],
        status: 'missing' as const,
        warnings: ['no existing component profile'],
      }),
      candidatePedagogicalFrames: candidateFrames(character, plan.canonicalMeaning, plan, root, runtimeRecords, metadata, strictResult),
      additionalEvidenceOrMetadataRequired: [...new Set([
        ...relevantGlyphs.flatMap((glyph) => metadataRequirement([glyph], metadata)),
        ...(plan.meaningReviewReasons || []).map((reason) => `canonical meaning review: ${reason}`),
      ])],
      remainWithheldIfNoSafeFrame: true,
      noDeepSeekCalled: true,
      publishable: false,
    };
  });
  const artifact: RecoveryArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-frame-recovery-pass-v1',
    distribution: 'development-only-candidate',
    publishable: false,
    hooksGenerated: false,
    deepSeekCallsMade: 0,
    sourceFrozenQualityPlans: 'book-1-evaluation-batch-47-quality-plans-v2.json',
    sourceStrictViabilityResults: 'book-1-frozen-47-scene-viability-results-v2.json',
    sourceRuntimePack: 'output/decomposition-runtime/phase4-candidate',
    sourceMetadata: ['book-1-component-profiles-v2.json', 'book-1-component-label-review-v1.json'],
    licenseGate: {
      status: manifest.licenseGate.status,
      publishable: false,
      openBlockers: manifest.licenseGate.openBlockers,
    },
    targetCount: records.length,
    records,
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(REPORT_PATH, buildReport(artifact));
  console.log(JSON.stringify({
    targets: records.length,
    candidateFrameCounts: records.reduce<Record<string, number>>((counts, record) => {
      for (const candidate of record.candidatePedagogicalFrames) counts[candidate.kind] = (counts[candidate.kind] || 0) + 1;
      return counts;
    }, {}),
    deepSeekCallsMade: 0,
    hooksGenerated: false,
    publishable: false,
    output: 'output/memory-hooks/book-1-frozen-frame-recovery-pass-v1.json',
    report: 'output/memory-hooks/book-1-frozen-frame-recovery-pass-v1.md',
  }, null, 2));
}

main();
