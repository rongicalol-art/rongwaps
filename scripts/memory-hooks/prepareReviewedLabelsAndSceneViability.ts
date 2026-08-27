import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type GlobalApproval = 'approved' | 'review-required';
type AssessmentGate = 'ready' | 'pending-global-label-review' | 'blocked-missing-label-or-structure';
type LabelSource = 'existing-component-lexicon' | 'manual-global-review-layer' | 'proposal-review' | 'missing';

interface ProposalRecord {
  glyph: string;
  affectedCharacters: string[];
  apiCallMade: boolean;
  metadataStatus: 'candidate-review' | 'review-required';
  rawDefinitions: string[];
  readings: string[];
  existingCandidateLabels: Array<{
    label: string;
    basis: 'meaning' | 'reading' | 'visual';
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
  }>;
  exactImmutableInputPacket: unknown;
  packetHash: string;
  parsedJson: {
    decision: 'select' | 'withhold';
    label: string | null;
    basis: string;
    sourceText: string | null;
    warnings: string[];
  } | null;
  deterministicValidation: { valid: boolean; issues: Array<{ code: string; message: string }> };
  provider: string | null;
  model: string | null;
  finalProposalStatus: string;
}

interface ProposalArtifact {
  schemaVersion: number;
  publishable: false;
  autoApproved: false;
  records: ProposalRecord[];
}

interface GenericComponent {
  key: string;
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  glyph: string | null;
  treePath: string;
  senseId: string | null;
  label: string | null;
  role: string;
  roleEvidenceRefs: string[];
}

interface GenericPlan {
  character: string;
  status: string;
  meaningDecision: {
    selectedMeaning: string | null;
    selectedPinyin: string | null;
    reviewReasons: string[];
  };
  components: GenericComponent[];
  blockers: string[];
}

interface GenericPlanArtifact {
  publishable: false;
  plans: GenericPlan[];
}

interface FrozenQualityPlan {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  status: string;
  reviewReasons: string[];
}

interface FrozenQualityPlanArtifact {
  publishable: false;
  selectionHash: string;
  plans: FrozenQualityPlan[];
}

interface FrozenManifest {
  batchId: string;
  selectionHash: string;
  publishable: false;
  characters: string[];
}

interface ManualGlobalApproval {
  approvedLabel: string;
  approvalBasis: 'exact-proposal' | 'manual-simplification';
  approvalNote: string;
}

interface ReviewedLabelEntry {
  schemaVersion: 1;
  glyph: string;
  proposedLabel: string;
  proposedSourceText: string | null;
  proposedBasis: string;
  rawDefinitions: string[];
  readings: string[];
  metadataStatus: ProposalRecord['metadataStatus'];
  globalApproval: GlobalApproval;
  approvedLabel: string | null;
  approvalScope: 'development-only-review-layer';
  approvalBasis: ManualGlobalApproval['approvalBasis'] | null;
  approvalNote: string;
  targetSpecificUse: 'not-evaluated';
  affectedCharacters: string[];
  source: {
    proposalArtifact: string;
    packetHash: string;
    provider: string | null;
    model: string | null;
    proposalWarnings: string[];
  };
}

interface LabelInputForScene {
  occurrenceId: string;
  glyph: string | null;
  treePath: string;
  kind: GenericComponent['kind'];
  label: string | null;
  provisionalLabel: string | null;
  globalApproval: GlobalApproval | 'missing';
  labelSource: LabelSource;
  availableForViability: boolean;
  targetSpecificUse: 'not-evaluated';
}

interface SceneViabilityRequest {
  task: 'evaluate-target-scene-viability-only';
  contractVersion: 'scene-viability-v1';
  target: {
    character: string;
    canonicalMeaning: string | null;
    targetDisplayLabel: string | null;
  };
  components: LabelInputForScene[];
  assessmentGate: AssessmentGate;
  rules: string[];
  outputSchema: Record<string, unknown>;
}

interface SceneViabilityEntry {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  frozenPlanStatus: string;
  frozenPlanReviewReasons: string[];
  genericPlanBlockers: string[];
  components: LabelInputForScene[];
  assessmentGate: AssessmentGate;
  executionEligible: false;
  exactRequest: {
    model: 'deepseek-v4-flash';
    temperature: 0;
    max_tokens: 220;
    thinking: { type: 'disabled' };
    response_format: { type: 'json_object' };
    messages: Array<{ role: 'system' | 'user'; content: string }>;
  };
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROPOSAL_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposals-v1.json');
const GENERIC_PLAN_PATH = resolve(OUTPUT_DIR, 'book-1-plans.json');
const FROZEN_PLAN_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');
const MANIFEST_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-manifest.json');
const REVIEW_OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-review-v1.json');
const REVIEW_REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-review-v1.md');
const VIABILITY_OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-packet-v1.json');
const VIABILITY_REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-packet-v1.md');

const MANUAL_GLOBAL_APPROVALS: Record<string, ManualGlobalApproval> = {
  '亼': { approvedLabel: 'assemble', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '力': { approvedLabel: 'strength', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '勺': { approvedLabel: 'spoon', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '可': { approvedLabel: 'can', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '宀': { approvedLabel: 'roof', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '开': { approvedLabel: 'open', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '彳': { approvedLabel: 'step', approvalBasis: 'manual-simplification', approvalNote: 'User-approved “step” as a concise simplification of supplied “step with the left foot”.' },
  '果': { approvedLabel: 'fruit', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '田': { approvedLabel: 'field', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '白': { approvedLabel: 'white', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '目': { approvedLabel: 'eye', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '罒': { approvedLabel: 'net', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '豕': { approvedLabel: 'pig', approvalBasis: 'exact-proposal', approvalNote: 'User-approved as a globally safe learner label.' },
  '貝': { approvedLabel: 'shell', approvalBasis: 'manual-simplification', approvalNote: 'User-approved “shell” as a concise simplification of supplied “sea shell”.' },
};

const KEEP_UNDER_REVIEW = new Set(['㝵', '匕', '吾', '广', '飞']);

const VIABILITY_RULES = [
  'Return JSON only with character, decision, reason, labelCoverage, and unsupportedInference.',
  'decision must be exactly scene-viable, scene-weak, or scene-not-useful.',
  'Decide only whether the supplied component labels could support a short, natural, memorable invented scene for the supplied target meaning.',
  'Do not write or propose a hook, scene sentence, story, dialogue, or target token.',
  'Use only the supplied glyph labels exactly as provided; do not simplify, expand, reinterpret, or invent meanings.',
  'Do not infer semantic roles, phonetic roles, sound relationships, historical relationships, etymology, origins, or decomposition changes.',
  'Do not use affected target characters as evidence for a component meaning or relationship.',
  'Do not approve or reject a global label. The globalApproval field is metadata only.',
  'If a required component is missing a label, or its label is only review-required, reflect that in labelCoverage and do not call the scene fully viable.',
  'A reason must be short and pedagogical, explain the scene potential or limitation, and must not contain a proposed hook.',
  'Set unsupportedInference true if the supplied labels would require inventing or stretching a component meaning; otherwise false.',
];

const SYSTEM_PROMPT = 'You are a constrained target-specific scene-viability evaluator. Return valid JSON only. Do not write a mnemonic hook.';

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function codePointSort(left: string, right: string): number {
  const l = [...left].map((character) => character.codePointAt(0) ?? 0);
  const r = [...right].map((character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.max(l.length, r.length); index += 1) {
    const difference = (l[index] ?? -1) - (r[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
}

function occurrenceId(character: string, treePath: string): string {
  return `${character}:${treePath}`;
}

function labelInputForComponent(
  character: string,
  component: GenericComponent,
  reviewByGlyph: Map<string, ReviewedLabelEntry>,
): LabelInputForScene {
  const occurrence = occurrenceId(character, component.treePath);
  const reviewed = component.glyph ? reviewByGlyph.get(component.glyph) : undefined;
  if (reviewed?.globalApproval === 'approved') {
    return {
      occurrenceId: occurrence,
      glyph: component.glyph,
      treePath: component.treePath,
      kind: component.kind,
      label: reviewed.approvedLabel,
      provisionalLabel: null,
      globalApproval: 'approved',
      labelSource: 'manual-global-review-layer',
      availableForViability: true,
      targetSpecificUse: 'not-evaluated',
    };
  }
  if (reviewed?.globalApproval === 'review-required') {
    return {
      occurrenceId: occurrence,
      glyph: component.glyph,
      treePath: component.treePath,
      kind: component.kind,
      label: null,
      provisionalLabel: reviewed.proposedLabel,
      globalApproval: 'review-required',
      labelSource: 'proposal-review',
      availableForViability: false,
      targetSpecificUse: 'not-evaluated',
    };
  }
  if (component.glyph && component.label) {
    return {
      occurrenceId: occurrence,
      glyph: component.glyph,
      treePath: component.treePath,
      kind: component.kind,
      label: component.label,
      provisionalLabel: null,
      globalApproval: 'approved',
      labelSource: 'existing-component-lexicon',
      availableForViability: true,
      targetSpecificUse: 'not-evaluated',
    };
  }
  return {
    occurrenceId: occurrence,
    glyph: component.glyph,
    treePath: component.treePath,
    kind: component.kind,
    label: null,
    provisionalLabel: null,
    globalApproval: 'missing',
    labelSource: 'missing',
    availableForViability: false,
    targetSpecificUse: 'not-evaluated',
  };
}

function deriveGate(components: LabelInputForScene[], blockers: string[]): AssessmentGate {
  if (blockers.some((blocker) => blocker === 'too-many-direct-components' || blocker === 'unresolved-direct-component')) {
    return 'blocked-missing-label-or-structure';
  }
  if (components.some((component) => component.globalApproval === 'missing')) {
    return 'blocked-missing-label-or-structure';
  }
  if (components.some((component) => component.globalApproval === 'review-required')) {
    return 'pending-global-label-review';
  }
  return 'ready';
}

function buildRequest(entry: {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  components: LabelInputForScene[];
  assessmentGate: AssessmentGate;
}): SceneViabilityEntry['exactRequest'] {
  const input: SceneViabilityRequest = {
    task: 'evaluate-target-scene-viability-only',
    contractVersion: 'scene-viability-v1',
    target: {
      character: entry.character,
      canonicalMeaning: entry.canonicalMeaning,
      targetDisplayLabel: entry.targetDisplayLabel,
    },
    components: entry.components,
    assessmentGate: entry.assessmentGate,
    rules: VIABILITY_RULES,
    outputSchema: {
      character: entry.character,
      decision: 'scene-viable | scene-weak | scene-not-useful',
      reason: 'short pedagogical reason; do not write a hook',
      labelCoverage: 'complete | pending-global-review | missing-label | unresolved-structure',
      unsupportedInference: 'boolean',
    },
  };
  return {
    model: 'deepseek-v4-flash',
    temperature: 0,
    max_tokens: 220,
    thinking: { type: 'disabled' },
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(input) },
    ],
  };
}

function markdownCell(value: string | null | undefined): string {
  return (value || '—').replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ');
}

function buildReviewReport(entries: ReviewedLabelEntry[]): string {
  const approved = entries.filter((entry) => entry.globalApproval === 'approved');
  const review = entries.filter((entry) => entry.globalApproval === 'review-required');
  const lines = [
    '# Component-label review layer',
    '',
    '> Development-only manual review artifact. These decisions do not update the canonical lexicon or production data.',
    '',
    `- Selected labels reviewed: ${entries.length}`,
    `- Globally approved in this review layer: ${approved.length}`,
    `- Still under global review: ${review.length}`,
    '- Target-specific usefulness: not evaluated here.',
    '- Publishable: false.',
    '',
    '## Global approvals',
    '',
    '| Glyph | Approved label | Basis | Supplied source | Affected targets | Note |',
    '|---|---|---|---|---|---|',
  ];
  for (const entry of approved) {
    lines.push(`| ${markdownCell(entry.glyph)} | ${markdownCell(entry.approvedLabel)} | ${markdownCell(entry.approvalBasis)} | ${markdownCell(entry.proposedSourceText)} | ${markdownCell(entry.affectedCharacters.join('、'))} | ${markdownCell(entry.approvalNote)} |`);
  }
  lines.push('', '## Still under global review', '', '| Glyph | Proposed label | Raw definitions | Affected targets | Warnings |', '|---|---|---|---|---|');
  for (const entry of review) {
    lines.push(`| ${markdownCell(entry.glyph)} | ${markdownCell(entry.proposedLabel)} | ${markdownCell(entry.rawDefinitions.join(' | '))} | ${markdownCell(entry.affectedCharacters.join('、'))} | ${markdownCell(entry.source.proposalWarnings.join('; '))} |`);
  }
  lines.push('', 'Every entry retains `targetSpecificUse: "not-evaluated"`; a global approval never asserts a role or usefulness in any target character.', '');
  return `${lines.join('\n')}\n`;
}

function buildViabilityReport(entries: SceneViabilityEntry[]): string {
  const gateCounts = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.assessmentGate] = (counts[entry.assessmentGate] ?? 0) + 1;
    return counts;
  }, {});
  const lines = [
    '# Frozen 47 target-specific Scene viability packet',
    '',
    '> Preparation only. No Scene viability calls have been made and no hooks are included.',
    '',
    `- Targets: ${entries.length}`,
    `- Gate counts: ${JSON.stringify(gateCounts)}`,
    '- Allowed decisions: `scene-viable`, `scene-weak`, `scene-not-useful`.',
    '- Global label approval and target-specific usefulness are separate fields.',
    '- Formation/Origin evidence is unchanged and is not evaluated by this packet.',
    '- Execution eligible: false for every entry.',
    '- Publishable: false.',
    '',
    '| Target | Meaning | Components supplied | Gate | Frozen blockers |',
    '|---|---|---|---|---|',
  ];
  for (const entry of entries) {
    const supplied = entry.components.map((component) => (
      component.label
        ? `${component.glyph}(${component.label})`
        : component.provisionalLabel
          ? `${component.glyph ?? '?'}[pending: ${component.provisionalLabel}]`
          : `${component.glyph ?? '?'}[missing]`
    )).join(' + ');
    lines.push(`| ${markdownCell(entry.character)} | ${markdownCell(entry.canonicalMeaning)} | ${markdownCell(supplied)} | ${markdownCell(entry.assessmentGate)} | ${markdownCell(entry.genericPlanBlockers.join('; '))} |`);
  }
  lines.push('', '## Exact request packets', '', 'Each target entry in the JSON artifact contains the immutable DeepSeek request that would be sent after the corresponding gate is cleared. The packet asks for viability only, never a hook.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const proposalArtifact = readJson<ProposalArtifact>(PROPOSAL_PATH);
  const genericPlans = readJson<GenericPlanArtifact>(GENERIC_PLAN_PATH);
  const frozenPlans = readJson<FrozenQualityPlanArtifact>(FROZEN_PLAN_PATH);
  const manifest = readJson<FrozenManifest>(MANIFEST_PATH);

  if (proposalArtifact.publishable || proposalArtifact.autoApproved) throw new Error('Proposal artifact must remain development-only and unapproved.');
  if (genericPlans.publishable || frozenPlans.publishable || manifest.publishable) throw new Error('Source artifacts must remain non-publishable.');
  if (manifest.characters.length !== 47) throw new Error(`Expected frozen 47 manifest; found ${manifest.characters.length}.`);

  const selected = proposalArtifact.records.filter((record) => (
    record.apiCallMade
    && record.finalProposalStatus === 'ambiguous-human-review'
    && record.parsedJson?.decision === 'select'
    && record.parsedJson.label
    && record.deterministicValidation.valid
  ));
  if (selected.length !== 19) throw new Error(`Expected 19 selected proposal records; found ${selected.length}.`);
  const selectedGlyphs = new Set(selected.map((record) => record.glyph));
  const approvalGlyphs = new Set(Object.keys(MANUAL_GLOBAL_APPROVALS));
  const reviewGlyphs = KEEP_UNDER_REVIEW;
  if (selectedGlyphs.size !== 19 || approvalGlyphs.size !== 14 || reviewGlyphs.size !== 5) throw new Error('Manual review lists have unexpected sizes.');
  for (const glyph of [...approvalGlyphs, ...reviewGlyphs]) if (!selectedGlyphs.has(glyph)) throw new Error(`Manual review list references non-selected glyph ${glyph}.`);
  if ([...selectedGlyphs].some((glyph) => !approvalGlyphs.has(glyph) && !reviewGlyphs.has(glyph))) throw new Error('A selected proposal is missing a global review decision.');

  const reviewedEntries: ReviewedLabelEntry[] = selected
    .sort((left, right) => codePointSort(left.glyph, right.glyph))
    .map((record) => {
      const proposal = record.parsedJson!;
      const approval = MANUAL_GLOBAL_APPROVALS[record.glyph];
      const underReview = reviewGlyphs.has(record.glyph);
      if (!approval && !underReview) throw new Error(`No manual decision for ${record.glyph}.`);
      return {
        schemaVersion: 1,
        glyph: record.glyph,
        proposedLabel: proposal.label!,
        proposedSourceText: proposal.sourceText,
        proposedBasis: proposal.basis,
        rawDefinitions: record.rawDefinitions,
        readings: record.readings,
        metadataStatus: record.metadataStatus,
        globalApproval: approval ? 'approved' : 'review-required',
        approvedLabel: approval?.approvedLabel ?? null,
        approvalScope: 'development-only-review-layer',
        approvalBasis: approval?.approvalBasis ?? null,
        approvalNote: approval?.approvalNote ?? 'User requested continued global review; no target-specific use is authorized.',
        targetSpecificUse: 'not-evaluated',
        affectedCharacters: record.affectedCharacters,
        source: {
          proposalArtifact: 'book-1-frozen-47-component-label-proposals-v1.json',
          packetHash: record.packetHash,
          provider: record.provider,
          model: record.model,
          proposalWarnings: proposal.warnings,
        },
      };
    });

  const reviewArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-component-label-review',
    distribution: 'development-only-candidate',
    publishable: false,
    autoApproved: false,
    manualReviewCompleted: true,
    targetSpecificUse: 'not-evaluated',
    sourceProposalArtifact: 'book-1-frozen-47-component-label-proposals-v1.json',
    globalApprovalCounts: reviewedEntries.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.globalApproval] = (counts[entry.globalApproval] ?? 0) + 1;
      return counts;
    }, {}),
    entries: reviewedEntries,
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(REVIEW_OUTPUT_PATH, `${JSON.stringify(reviewArtifact, null, 2)}\n`);
  writeFileSync(REVIEW_REPORT_PATH, buildReviewReport(reviewedEntries));

  const reviewByGlyph = new Map(reviewedEntries.map((entry) => [entry.glyph, entry]));
  const genericByCharacter = new Map(genericPlans.plans.map((plan) => [plan.character, plan]));
  const frozenByCharacter = new Map(frozenPlans.plans.map((plan) => [plan.character, plan]));
  const targetCharacters = [...new Set(reviewedEntries.flatMap((entry) => entry.affectedCharacters))].sort(codePointSort);
  for (const character of targetCharacters) {
    if (!manifest.characters.includes(character)) throw new Error(`Target ${character} is not in the frozen 47.`);
  }

  const viabilityEntries: SceneViabilityEntry[] = targetCharacters.map((character) => {
    const generic = genericByCharacter.get(character);
    const frozen = frozenByCharacter.get(character);
    if (!generic || !frozen) throw new Error(`Missing generic or frozen plan for ${character}.`);
    const components = generic.components.map((component) => labelInputForComponent(character, component, reviewByGlyph));
    const assessmentGate = deriveGate(components, generic.blockers);
    const entryBase = {
      character,
      canonicalMeaning: frozen.canonicalMeaning,
      targetDisplayLabel: frozen.targetDisplayLabel,
      components,
      assessmentGate,
    };
    return {
      character,
      canonicalMeaning: frozen.canonicalMeaning,
      targetDisplayLabel: frozen.targetDisplayLabel,
      canonicalPinyin: frozen.canonicalPinyin,
      frozenPlanStatus: frozen.status,
      frozenPlanReviewReasons: frozen.reviewReasons,
      genericPlanBlockers: generic.blockers,
      components,
      assessmentGate,
      executionEligible: false,
      exactRequest: buildRequest(entryBase),
    };
  });

  const viabilityArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-scene-viability-packet',
    distribution: 'development-only-candidate',
    publishable: false,
    executed: false,
    apiCallsMade: 0,
    sourceReviewedLabels: 'book-1-component-label-review-v1.json',
    sourceFrozenManifest: 'book-1-evaluation-batch-47-manifest.json',
    sourceGenericPlans: 'book-1-plans.json',
    sourceFrozenQualityPlans: 'book-1-evaluation-batch-47-quality-plans-v2.json',
    frozenSelectionHash: manifest.selectionHash,
    targetCount: viabilityEntries.length,
    allowedDecisions: ['scene-viable', 'scene-weak', 'scene-not-useful'],
    formationOriginEvidenceUnchanged: true,
    entries: viabilityEntries,
  };
  writeFileSync(VIABILITY_OUTPUT_PATH, `${JSON.stringify(viabilityArtifact, null, 2)}\n`);
  writeFileSync(VIABILITY_REPORT_PATH, buildViabilityReport(viabilityEntries));

  console.log(JSON.stringify({
    reviewedLabels: reviewedEntries.length,
    globallyApproved: reviewedEntries.filter((entry) => entry.globalApproval === 'approved').length,
    stillUnderGlobalReview: reviewedEntries.filter((entry) => entry.globalApproval === 'review-required').length,
    viabilityTargets: viabilityEntries.length,
    viabilityGateCounts: viabilityEntries.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.assessmentGate] = (counts[entry.assessmentGate] ?? 0) + 1;
      return counts;
    }, {}),
    apiCallsMade: 0,
    hooksGenerated: false,
    publishable: false,
    reviewArtifact: 'output/memory-hooks/book-1-component-label-review-v1.json',
    viabilityPacket: 'output/memory-hooks/book-1-frozen-47-scene-viability-packet-v1.json',
    viabilityReport: 'output/memory-hooks/book-1-frozen-47-scene-viability-packet-v1.md',
  }, null, 2));
}

main();
