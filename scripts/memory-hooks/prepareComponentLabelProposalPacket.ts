import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface FrozenQualityPlan {
  character: string;
  reviewReasons: string[];
}

interface QualityPlanArtifact {
  schemaVersion: number;
  publishable: false;
  plans: FrozenQualityPlan[];
}

interface FrozenManifest {
  batchId: string;
  selectionHash: string;
  publishable: false;
  characters: string[];
}

interface CandidateLabel {
  label: string;
  basis: 'meaning' | 'reading' | 'visual';
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

interface ComponentLabelCandidate {
  schemaVersion: number;
  key: `g:${string}`;
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  labelCandidates: CandidateLabel[];
  disposition: 'already-approved' | 'candidate-review' | 'review-required' | 'withhold';
  reasons: string[];
  sourceRefs: string[];
  targetSpecificUse: 'not-evaluated';
}

interface CandidateArtifact {
  schemaVersion: number;
  publishable: false;
  sourceProfiles: string;
  candidates: ComponentLabelCandidate[];
}

interface ProposalInput {
  task: 'select-or-withhold-component-label';
  contractVersion: 'component-label-proposal-v1';
  component: {
    glyph: string;
    affectedCharacters: string[];
    rawDefinitions: string[];
    readings: string[];
    existingCandidateLabels: CandidateLabel[];
    metadataStatus: ComponentLabelCandidate['disposition'];
    metadataReasons: string[];
    sourceRefs: string[];
    targetSpecificUse: 'not-evaluated';
  };
  allowedOperations: string[];
  prohibitedOperations: string[];
  decisionRules: string[];
  outputSchema: Record<string, unknown>;
}

interface DeepSeekRequestPayload {
  model: 'deepseek-v4-flash';
  temperature: 0;
  max_tokens: 220;
  thinking: { type: 'disabled' };
  response_format: { type: 'json_object' };
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}

interface PacketEntry {
  glyph: string;
  affectedCharacters: string[];
  rawDefinitions: string[];
  readings: string[];
  existingCandidateLabels: CandidateLabel[];
  metadataStatus: ComponentLabelCandidate['disposition'];
  metadataReasons: string[];
  sourceRefs: string[];
  targetSpecificUse: 'not-evaluated';
  deepseekInput: ProposalInput;
  deepseekRequest: DeepSeekRequestPayload;
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const QUALITY_PLAN_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');
const MANIFEST_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-manifest.json');
const CANDIDATE_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-candidates-v1.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposal-packet-v1.json');
const REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposal-packet-v1.md');

const SYSTEM_PROMPT = [
  'You are a constrained component-label selector.',
  'Return valid JSON only and follow the supplied schema exactly.',
  'Use only the supplied rawDefinitions, readings, and existingCandidateLabels.',
  'You may select or simplify a supplied learner-label candidate, or withhold.',
  'Never add a meaning, role, relationship, decomposition, history, or etymology.',
].join(' ');

const ALLOWED_OPERATIONS = [
  'select one existingCandidateLabels.label exactly',
  'simplify one supplied raw definition or candidate label only by removing grammar words while preserving the same supported concept',
  'return withhold when the supplied metadata is not safe or useful for a general learner',
];

const PROHIBITED_OPERATIONS = [
  'invent or infer a component meaning not present in rawDefinitions or existingCandidateLabels',
  'use readings as meanings or translate a reading into a semantic label',
  'infer a target-specific semantic, phonetic, visual, or other role',
  'infer a semantic bridge, phonetic relationship, decomposition change, etymology, origin, or historical claim',
  'use affectedCharacters to justify a label or relationship',
  'approve a visual label, scene prop, or target-specific label',
];

const DECISION_RULES = [
  'If rawDefinitions and existingCandidateLabels are both empty, return withhold.',
  'If the supplied metadata is technical, stroke-like, an encoding marker, a component-cluster note, unknown, or otherwise not a learner-facing concept, return withhold.',
  'If the supplied senses are materially ambiguous and no single learner label is clearly supported, return withhold.',
  'A selected or simplified label must be traceable to exactly one supplied raw definition or existing candidate label through sourceText.',
  'A simplification may remove words such as “to” or a grammatical qualifier, but may not add a new noun, action, object, or historical interpretation.',
  'Return confidence only for the metadata decision: high, medium, or low. Do not express target-specific usefulness.',
];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function codePointSort(left: string, right: string): number {
  const leftCodePoints = [...left].map((character) => character.codePointAt(0) ?? 0);
  const rightCodePoints = [...right].map((character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.max(leftCodePoints.length, rightCodePoints.length); index += 1) {
    const difference = (leftCodePoints[index] ?? -1) - (rightCodePoints[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
}

function buildInput(
  candidate: ComponentLabelCandidate,
  affectedCharacters: string[],
): ProposalInput {
  return {
    task: 'select-or-withhold-component-label',
    contractVersion: 'component-label-proposal-v1',
    component: {
      glyph: candidate.glyph,
      affectedCharacters,
      rawDefinitions: candidate.rawGlosses,
      readings: candidate.readings,
      existingCandidateLabels: candidate.labelCandidates,
      metadataStatus: candidate.disposition,
      metadataReasons: candidate.reasons,
      sourceRefs: candidate.sourceRefs,
      targetSpecificUse: candidate.targetSpecificUse,
    },
    allowedOperations: ALLOWED_OPERATIONS,
    prohibitedOperations: PROHIBITED_OPERATIONS,
    decisionRules: DECISION_RULES,
    outputSchema: {
      glyph: candidate.glyph,
      decision: 'select | withhold',
      label: 'string | null',
      basis: 'existing-candidate | simplified-supplied-label | none',
      sourceText: 'exact supplied raw definition or candidate label, or null when withheld',
      confidence: 'high | medium | low',
      warnings: 'string[]',
      reason: 'short metadata-only explanation',
    },
  };
}

function buildRequest(input: ProposalInput): DeepSeekRequestPayload {
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

function buildReport(
  manifest: FrozenManifest,
  entries: PacketEntry[],
  counts: Record<string, number>,
): string {
  const lines = [
    '# Frozen 47 component-label proposal packet',
    '',
    '> Preparation only. No DeepSeek calls have been made. Do not execute this packet yet.',
    '',
    `- Batch: ${manifest.batchId}`,
    `- Frozen selection hash: ${manifest.selectionHash}`,
    `- Components: ${entries.length}`,
    `- Metadata status counts: ${JSON.stringify(counts)}`,
    '- Structural breakdown source: Phase 4 development-only runtime referenced by the frozen plans.',
    '- Component raw definitions/readings source: the existing component-profile artifact; no new labels were added here.',
    '- Target-specific use: not evaluated.',
    '- Publishable: false.',
    '',
    '## DeepSeek contract',
    '',
    `System message: ${SYSTEM_PROMPT}`,
    '',
    'DeepSeek may select or simplify only supplied metadata, or return `withhold`. It must not infer roles, relationships, decomposition, etymology, history, or unsupported meanings.',
    '',
  ];

  for (const [index, entry] of entries.entries()) {
    lines.push(`## ${index + 1}. ${entry.glyph}`);
    lines.push('');
    lines.push(`- Blocks: ${entry.affectedCharacters.join('、')}`);
    lines.push(`- Raw definitions: ${entry.rawDefinitions.length > 0 ? entry.rawDefinitions.join(' | ') : '(none)'}`);
    lines.push(`- Readings: ${entry.readings.length > 0 ? entry.readings.join(' | ') : '(none)'}`);
    lines.push(`- Metadata status: ${entry.metadataStatus}`);
    lines.push(`- Metadata reasons: ${entry.metadataReasons.join(' | ')}`);
    lines.push(`- Existing candidate labels: ${entry.existingCandidateLabels.length > 0
      ? entry.existingCandidateLabels.map((label) => `${label.label} [${label.confidence}]`).join(' | ')
      : '(none)'}`);
    lines.push('');
    lines.push('### Exact JSON packet');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(entry.deepseekRequest, null, 2));
    lines.push('```');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const manifest = readJson<FrozenManifest>(MANIFEST_PATH);
  const qualityPlans = readJson<QualityPlanArtifact>(QUALITY_PLAN_PATH);
  const candidateArtifact = readJson<CandidateArtifact>(CANDIDATE_PATH);

  if (manifest.publishable || qualityPlans.publishable || candidateArtifact.publishable) {
    throw new Error('Refusing to prepare a proposal packet from publishable artifacts.');
  }
  if (manifest.characters.length !== 47) {
    throw new Error(`Expected the frozen 47-character manifest; found ${manifest.characters.length}.`);
  }

  const affectedCharactersByGlyph = new Map<string, Set<string>>();
  for (const plan of qualityPlans.plans) {
    for (const reason of plan.reviewReasons) {
      const match = reason.match(/^generic-planner:missing-component-sense:g:(.+)$/u);
      if (!match) continue;
      const affected = affectedCharactersByGlyph.get(match[1]) ?? new Set<string>();
      affected.add(plan.character);
      affectedCharactersByGlyph.set(match[1], affected);
    }
  }

  if (affectedCharactersByGlyph.size !== 41) {
    throw new Error(`Expected 41 missing component senses; found ${affectedCharactersByGlyph.size}.`);
  }

  const candidateByGlyph = new Map(candidateArtifact.candidates.map((candidate) => [candidate.glyph, candidate]));
  const entries = [...affectedCharactersByGlyph.keys()]
    .sort(codePointSort)
    .map((glyph): PacketEntry => {
      const candidate = candidateByGlyph.get(glyph);
      if (!candidate) throw new Error(`Missing label candidate artifact entry for ${glyph}.`);
      const affectedCharacters = [...(affectedCharactersByGlyph.get(glyph) ?? [])].sort(codePointSort);
      const deepseekInput = buildInput(candidate, affectedCharacters);
      return {
        glyph,
        affectedCharacters,
        rawDefinitions: candidate.rawGlosses,
        readings: candidate.readings,
        existingCandidateLabels: candidate.labelCandidates,
        metadataStatus: candidate.disposition,
        metadataReasons: candidate.reasons,
        sourceRefs: candidate.sourceRefs,
        targetSpecificUse: candidate.targetSpecificUse,
        deepseekInput,
        deepseekRequest: buildRequest(deepseekInput),
      };
    });

  const statusCounts = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.metadataStatus] = (counts[entry.metadataStatus] ?? 0) + 1;
    return counts;
  }, {});
  const artifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-component-label-proposal-packet',
    distribution: 'development-only-candidate',
    publishable: false,
    approvedForExecution: false,
    apiCallsMade: 0,
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    promptVersion: 'component-label-proposal-v1',
    source: {
      frozenManifest: 'book-1-evaluation-batch-47-manifest.json',
      frozenQualityPlans: 'book-1-evaluation-batch-47-quality-plans-v2.json',
      componentCandidates: 'book-1-component-label-candidates-v1.json',
      componentProfileSource: candidateArtifact.sourceProfiles,
      frozenSelectionHash: manifest.selectionHash,
    },
    contract: {
      systemPrompt: SYSTEM_PROMPT,
      allowedOperations: ALLOWED_OPERATIONS,
      prohibitedOperations: PROHIBITED_OPERATIONS,
      decisionRules: DECISION_RULES,
    },
    componentCount: entries.length,
    metadataStatusCounts: statusCounts,
    components: entries,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(REPORT_PATH, buildReport(manifest, entries, statusCounts));
  console.log(JSON.stringify({
    components: entries.length,
    metadataStatusCounts: statusCounts,
    output: 'output/memory-hooks/book-1-frozen-47-component-label-proposal-packet-v1.json',
    report: 'output/memory-hooks/book-1-frozen-47-component-label-proposal-packet-v1.md',
    apiCallsMade: 0,
    approvedForExecution: false,
    publishable: false,
  }, null, 2));
}

main();
