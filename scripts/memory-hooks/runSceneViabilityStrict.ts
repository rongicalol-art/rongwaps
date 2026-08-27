import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
dotenv.config({
  path: resolve(import.meta.dirname, '../../.env.memory-hooks.local'),
  quiet: true,
  override: true,
});

type AssessmentGate = 'ready' | 'pending-global-label-review' | 'blocked-missing-label-or-structure';
type SceneDecision = 'scene-viable' | 'scene-weak' | 'scene-not-useful';
type FinalStatus = 'valid-assessment' | 'needs-review' | 'not-called-gated';
type ProviderName = 'deepseek' | 'openrouter';

const HARD_ISSUE_CODES = [
  'arbitrary-target-connection',
  'component-meaning-stretched',
  'unsupported-extra-assumption',
  'stereotype-dependent',
  'abstract-target-mismatch',
  'tautological',
  'weak-causal-link',
] as const;

type HardIssueCode = typeof HARD_ISSUE_CODES[number];

interface DeepSeekRequest {
  model: string;
  temperature: 0;
  max_tokens: 220;
  thinking: { type: 'disabled' };
  response_format: { type: 'json_object' };
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}

interface ComponentInput {
  occurrenceId: string;
  glyph: string | null;
  treePath: string;
  kind: string;
  label: string | null;
  provisionalLabel: string | null;
  globalApproval: 'approved' | 'review-required' | 'missing';
  labelSource: string;
  availableForViability: boolean;
  targetSpecificUse: 'not-evaluated';
}

interface ViabilityEntry {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  frozenPlanStatus: string;
  frozenPlanReviewReasons: string[];
  genericPlanBlockers: string[];
  components: ComponentInput[];
  assessmentGate: AssessmentGate;
  executionEligible: false;
  exactRequest: DeepSeekRequest;
}

interface PacketArtifact {
  schemaVersion: number;
  publishable: false;
  executed: false;
  apiCallsMade: 0;
  targetCount: number;
  entries: ViabilityEntry[];
  allowedDecisions: SceneDecision[];
}

interface StrictAssessment {
  target: string;
  targetMeaning: string;
  componentTokens: string[];
  decision: SceneDecision;
  reason: string;
  issueCodes: string[];
  directTargetConnection: string;
}

interface ValidationIssue {
  code: string;
  message: string;
}

interface DeterministicValidation {
  valid: boolean;
  status: 'valid' | 'invalid' | 'not-run';
  issues: ValidationIssue[];
}

interface ProviderConfig {
  provider: ProviderName;
  url: string;
  apiKey: string;
  model: string;
}

interface AttemptTelemetry {
  character: string;
  exactImmutableInputPacket: DeepSeekRequest;
  packetHash: string;
  rawProviderResponseText: string | null;
  rawModelResponseText: string | null;
  parsedJson: Record<string, unknown> | null;
  normalizedAssessment: StrictAssessment | null;
  deterministicValidation: DeterministicValidation;
  provider: string;
  model: string;
  attemptNumber: number;
  finalStatus: FinalStatus;
}

interface ResultRecord {
  character: string;
  canonicalMeaning: string | null;
  canonicalPinyin: string | null;
  assessmentGate: AssessmentGate;
  components: ComponentInput[];
  exactImmutableInputPacket: DeepSeekRequest;
  packetHash: string;
  apiCallMade: boolean;
  attempts: AttemptTelemetry[];
  parsedJson: Record<string, unknown> | null;
  normalizedAssessment: StrictAssessment | null;
  deterministicValidation: DeterministicValidation;
  provider: string | null;
  model: string | null;
  finalStatus: FinalStatus;
  resolutionReason: string;
}

interface OutputArtifact {
  schemaVersion: 2;
  artifact: 'book-1-frozen-47-scene-viability-results-v2';
  distribution: 'development-only-candidate';
  publishable: false;
  hooksGenerated: false;
  autoApproved: false;
  executionStatus: 'running' | 'completed';
  sourcePacket: string;
  sourcePreviousResults: string;
  provider: string;
  model: string;
  promptVersion: 'scene-viability-v2-strict';
  hardIssueCodes: readonly HardIssueCode[];
  apiCallsMade: number;
  calledReadyCount: number;
  skippedPendingOrBlockedCount: number;
  records: ResultRecord[];
}

interface ProviderEnvelope {
  choices?: Array<{ message?: { content?: unknown } }>;
}

interface ParsedResponse {
  rawProviderResponseText: string | null;
  rawModelResponseText: string | null;
  parsedJson: Record<string, unknown> | null;
  normalizedAssessment: StrictAssessment | null;
  parseError?: string;
}

interface PreviousRecord {
  character: string;
  canonicalMeaning: string | null;
  apiCallMade: boolean;
  parsedJson: {
    decision?: SceneDecision;
    reason?: string;
    labelCoverage?: string;
    unsupportedInference?: boolean;
  } | null;
  deterministicValidation: { valid: boolean; issues: ValidationIssue[] };
  finalStatus: FinalStatus;
}

interface PreviousArtifact {
  records: PreviousRecord[];
  apiCallsMade: number;
  publishable: false;
}

interface ProviderCallResult {
  response: ParsedResponse;
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PACKET_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-packet-v1.json');
const PREVIOUS_RESULTS_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v1.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v2.json');
const TEMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;
const REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v2.md');
const COMPARISON_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-comparison-v1-v2.json');
const COMPARISON_REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-comparison-v1-v2.md');

const ALLOWED_DECISIONS: readonly SceneDecision[] = ['scene-viable', 'scene-weak', 'scene-not-useful'];
const ALLOWED_HARD_ISSUES: readonly string[] = HARD_ISSUE_CODES;
const FORBIDDEN_INFERENCE = /(?:semantic\s+role|phonetic\s+role|phonetic\s+relationship|sound\s+relationship|pronunciation\s+(?:clue|relationship)|histor(?:y|ical)|etymolog|origin|decomposition|component\s+means|represents|derived\s+from)/iu;
const TARGET_TOKEN_PATTERN = /[\p{Script=Han}](?:\([^)]*\))?/u;

const STRICT_SYSTEM_PROMPT = [
  'You are a conservative, target-specific Scene-viability evaluator. Return JSON only. Do not write a mnemonic hook.',
  'Judge only whether the supplied component meanings naturally support one memorable physical or spatial action whose consequence makes the target meaning intuitive.',
  'Be skeptical: a scene is not viable merely because it can contain the target concept.',
].join(' ');

const STRICT_RULES = [
  'Use only the supplied component glyphs and labels exactly as provided; never invent, stretch, simplify, or reinterpret a component meaning.',
  'Require a clear chain: supplied component meanings -> one natural physical/spatial relationship or action -> target meaning becomes intuitive.',
  'Reject or weaken an arbitrary situation that merely contains the target concept.',
  'Reject or weaken unsupported extra assumptions, stereotypes, cultural roles, external facts, arbitrary object associations, or “talking about X therefore X is the subject” reasoning.',
  'Reject or weaken abstract or grammatical target meanings when the concrete components do not actually explain them.',
  'Reject or weaken tautological frames where one component simply repeats the target meaning and the rest adds little pedagogical value.',
  'Repeated labels alone are not a meaningful relationship.',
  'Do not infer semantic roles, phonetic roles, historical relationships, etymology, origin, decomposition changes, or target-specific evidence.',
  'Do not use the affected target character as evidence for any component meaning or relationship.',
  'Do not write a hook, scene sentence, dialogue, story, or learner-facing target token. directTargetConnection is a one-sentence evaluator explanation only.',
  'Use one or more of these exact issue codes when applicable: arbitrary-target-connection, component-meaning-stretched, unsupported-extra-assumption, stereotype-dependent, abstract-target-mismatch, tautological, weak-causal-link.',
  'scene-viable requires no hard issue codes. Use scene-weak when a plausible but weak or indirect connection remains; use scene-not-useful when the supplied labels do not support a useful scene.',
  'Mention the supplied component tokens in componentTokens exactly, and explain every supplied component in directTargetConnection.',
  'Keep reason and directTargetConnection concise.',
];

function requireExecutionApproval(): void {
  const flags = new Set(process.argv.slice(2));
  if (!flags.has('--execute') || !flags.has('--ready-only')) {
    throw new Error('Refusing strict viability API calls. Re-run with --execute --ready-only to call only ready targets.');
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function hashPacket(packet: DeepSeekRequest): string {
  return createHash('sha256').update(canonicalJson(packet)).digest('hex');
}

function resolveProvider(): ProviderConfig {
  const directKey = process.env.DEEPSEEK_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const preferredProvider = process.env.MEMORY_HOOK_PROVIDER;
  if (preferredProvider && preferredProvider !== 'deepseek' && preferredProvider !== 'openrouter') {
    throw new Error('MEMORY_HOOK_PROVIDER must be deepseek or openrouter.');
  }
  if (directKey && openRouterKey && !preferredProvider) {
    throw new Error('Both direct DeepSeek and OpenRouter are configured; choose MEMORY_HOOK_PROVIDER before API calls.');
  }
  if (directKey && (!preferredProvider || preferredProvider === 'deepseek')) {
    return {
      provider: 'deepseek',
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: directKey,
      model: process.env.MEMORY_HOOK_MODEL || 'deepseek-v4-flash',
    };
  }
  if (openRouterKey && (!preferredProvider || preferredProvider === 'openrouter')) {
    return {
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: openRouterKey,
      model: process.env.MEMORY_HOOK_MODEL || 'deepseek/deepseek-v4-flash',
    };
  }
  throw new Error('No DeepSeek provider configuration is available.');
}

function expectedComponentTokens(entry: ViabilityEntry): string[] {
  return entry.components.map((component) => {
    if (!component.glyph || !component.label) return component.glyph || component.kind;
    return `${component.glyph}(${component.label})`;
  });
}

function buildStrictRequest(entry: ViabilityEntry): DeepSeekRequest {
  const input = {
    task: 'evaluate-target-scene-viability-only',
    contractVersion: 'scene-viability-v2-strict',
    target: {
      character: entry.character,
      canonicalMeaning: entry.canonicalMeaning,
      targetDisplayLabel: entry.targetDisplayLabel,
    },
    suppliedComponentTokens: expectedComponentTokens(entry),
    suppliedComponents: entry.components.map((component) => ({
      occurrenceId: component.occurrenceId,
      glyph: component.glyph,
      label: component.label,
      treePath: component.treePath,
      kind: component.kind,
      globalApproval: component.globalApproval,
      availableForViability: component.availableForViability,
    })),
    assessmentGate: entry.assessmentGate,
    rules: STRICT_RULES,
    hardIssueCodes: HARD_ISSUE_CODES,
    outputSchema: {
      target: entry.character,
      targetMeaning: entry.canonicalMeaning,
      componentTokens: expectedComponentTokens(entry),
      decision: 'scene-viable | scene-weak | scene-not-useful',
      reason: 'short skeptical pedagogical reason; do not write a hook',
      issueCodes: 'array containing only the supplied hard issue codes',
      directTargetConnection: 'exactly one concise sentence explaining the component-to-target chain; do not write a hook',
    },
  };
  return {
    model: entry.exactRequest.model,
    temperature: 0,
    max_tokens: 220,
    thinking: { type: 'disabled' },
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: STRICT_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(input) },
    ],
  };
}

function unwrapJson(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '');
}

function parseAssessment(content: string): { parsedJson: Record<string, unknown>; normalizedAssessment: StrictAssessment } {
  const parsed = JSON.parse(unwrapJson(content)) as Record<string, unknown>;
  const componentTokens = Array.isArray(parsed.componentTokens)
    ? parsed.componentTokens.filter((token): token is string => typeof token === 'string')
    : [];
  const issueCodes = Array.isArray(parsed.issueCodes)
    ? parsed.issueCodes.filter((code): code is string => typeof code === 'string')
    : [];
  const normalizedAssessment: StrictAssessment = {
    target: typeof parsed.target === 'string' ? parsed.target : '',
    targetMeaning: typeof parsed.targetMeaning === 'string' ? parsed.targetMeaning : '',
    componentTokens,
    decision: typeof parsed.decision === 'string' ? parsed.decision as SceneDecision : '' as SceneDecision,
    reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    issueCodes,
    directTargetConnection: typeof parsed.directTargetConnection === 'string' ? parsed.directTargetConnection : '',
  };
  return { parsedJson: parsed, normalizedAssessment };
}

function countSentences(value: string): number {
  return value.split(/[.!?。！？]+/u).map((part) => part.trim()).filter(Boolean).length;
}

function validateAssessment(
  entry: ViabilityEntry,
  assessment: StrictAssessment | null,
  parseError?: string,
): DeterministicValidation {
  if (!assessment) return {
    valid: false,
    status: 'invalid',
    issues: [{ code: 'response-not-parseable-json', message: parseError || 'Model response did not parse as JSON.' }],
  };
  const issues: ValidationIssue[] = [];
  const expectedTokens = expectedComponentTokens(entry);
  if (assessment.target !== entry.character) {
    issues.push({ code: 'target-mismatch', message: `Expected target ${entry.character}; received ${assessment.target || '(empty)'}.` });
  }
  if (assessment.targetMeaning !== (entry.canonicalMeaning || '')) {
    issues.push({ code: 'target-meaning-mismatch', message: `Expected canonical target meaning ${entry.canonicalMeaning || '(empty)'}; received ${assessment.targetMeaning || '(empty)'}.` });
  }
  if (assessment.componentTokens.length !== expectedTokens.length || assessment.componentTokens.some((token, index) => token !== expectedTokens[index])) {
    issues.push({ code: 'component-token-mismatch', message: `componentTokens must exactly match supplied tokens: ${expectedTokens.join(', ')}.` });
  }
  if (!ALLOWED_DECISIONS.includes(assessment.decision)) {
    issues.push({ code: 'invalid-decision', message: 'decision must be scene-viable, scene-weak, or scene-not-useful.' });
  }
  if (!assessment.reason.trim()) {
    issues.push({ code: 'missing-reason', message: 'reason must be a short pedagogical explanation.' });
  }
  if (assessment.reason.trim().split(/\s+/u).length > 45) {
    issues.push({ code: 'reason-too-long', message: 'reason must remain concise and must not become a hook or story.' });
  }
  if (!assessment.directTargetConnection.trim()) {
    issues.push({ code: 'missing-direct-target-connection', message: 'directTargetConnection is required.' });
  } else {
    if (countSentences(assessment.directTargetConnection) > 1) {
      issues.push({ code: 'direct-target-connection-not-one-sentence', message: 'directTargetConnection must contain one concise sentence.' });
    }
    if ((entry.canonicalMeaning || '') && !assessment.directTargetConnection.toLocaleLowerCase().includes((entry.canonicalMeaning || '').toLocaleLowerCase())) {
      issues.push({ code: 'target-meaning-absent-from-connection', message: 'directTargetConnection must explicitly name the supplied target meaning.' });
    }
    for (const component of entry.components) {
      if (component.glyph && !assessment.directTargetConnection.includes(component.glyph)) {
        issues.push({ code: 'component-glyph-absent-from-connection', message: `directTargetConnection does not mention component glyph ${component.glyph}.` });
      }
      if (component.label && !assessment.directTargetConnection.toLocaleLowerCase().includes(component.label.toLocaleLowerCase())) {
        issues.push({ code: 'component-label-absent-from-connection', message: `directTargetConnection does not mention supplied label ${component.label}.` });
      }
    }
  }
  const targetToken = entry.targetDisplayLabel ? `${entry.character}(${entry.targetDisplayLabel})` : '';
  if (targetToken && (assessment.reason.includes(targetToken) || assessment.directTargetConnection.includes(targetToken))) {
    issues.push({ code: 'hook-like-target-token', message: 'Evaluator prose contains the learner-facing target token; it must not write a hook.' });
  }
  if (FORBIDDEN_INFERENCE.test(assessment.reason) || FORBIDDEN_INFERENCE.test(assessment.directTargetConnection)) {
    issues.push({ code: 'forbidden-inference-in-assessment', message: 'Assessment contains a prohibited role, sound, historical, etymological, or decomposition claim.' });
  }
  const uniqueIssueCodes = new Set(assessment.issueCodes);
  if (uniqueIssueCodes.size !== assessment.issueCodes.length) {
    issues.push({ code: 'duplicate-issue-code', message: 'issueCodes must not contain duplicates.' });
  }
  for (const code of assessment.issueCodes) {
    if (!ALLOWED_HARD_ISSUES.includes(code)) {
      issues.push({ code: 'unrecognized-issue-code', message: `Unsupported issue code ${code}; use only the seven supplied hard issue codes.` });
    }
  }
  const hasHardIssue = assessment.issueCodes.some((code): code is HardIssueCode => (ALLOWED_HARD_ISSUES as readonly string[]).includes(code));
  if (assessment.decision === 'scene-viable' && hasHardIssue) {
    issues.push({ code: 'viable-with-hard-issues', message: 'scene-viable requires zero hard issue codes.' });
  }
  if (entry.assessmentGate !== 'ready') {
    issues.push({ code: 'called-non-ready-entry', message: 'Only ready entries may be evaluated in this run.' });
  }
  return { valid: issues.length === 0, status: issues.length === 0 ? 'valid' : 'invalid', issues };
}

async function callProvider(provider: ProviderConfig, request: DeepSeekRequest): Promise<ProviderCallResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const rawProviderResponseText = await response.text();
    if (!response.ok) {
      return {
        response: {
          rawProviderResponseText,
          rawModelResponseText: null,
          parsedJson: null,
          normalizedAssessment: null,
          parseError: `HTTP ${response.status}: ${rawProviderResponseText.slice(0, 500)}`,
        },
      };
    }
    let envelope: ProviderEnvelope;
    try {
      envelope = JSON.parse(rawProviderResponseText) as ProviderEnvelope;
    } catch (error) {
      return {
        response: {
          rawProviderResponseText,
          rawModelResponseText: rawProviderResponseText,
          parsedJson: null,
          normalizedAssessment: null,
          parseError: `Provider response was not JSON: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
    const rawModelResponseText = typeof envelope.choices?.[0]?.message?.content === 'string'
      ? envelope.choices[0].message.content
      : null;
    if (!rawModelResponseText) {
      return {
        response: {
          rawProviderResponseText,
          rawModelResponseText: null,
          parsedJson: null,
          normalizedAssessment: null,
          parseError: 'Provider response did not contain choices[0].message.content.',
        },
      };
    }
    try {
      const parsed = parseAssessment(rawModelResponseText);
      return {
        response: {
          rawProviderResponseText,
          rawModelResponseText,
          ...parsed,
        },
      };
    } catch (error) {
      return {
        response: {
          rawProviderResponseText,
          rawModelResponseText,
          parsedJson: null,
          normalizedAssessment: null,
          parseError: `Model content was not parseable JSON: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}

function writeArtifact(artifact: OutputArtifact): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(TEMP_OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  renameSync(TEMP_OUTPUT_PATH, OUTPUT_PATH);
}

function markdownCell(value: string | null | undefined): string {
  return (value || '—').replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ');
}

function issueSummary(validation: DeterministicValidation): string {
  if (validation.status === 'not-run') return 'not run (gated)';
  return validation.valid ? 'valid' : validation.issues.map((issue) => issue.code).join(', ');
}

function buildReport(artifact: OutputArtifact): string {
  const called = artifact.records.filter((record) => record.apiCallMade);
  const notCalled = artifact.records.filter((record) => !record.apiCallMade);
  const lines = [
    '# Frozen 47 strict Scene-viability results',
    '',
    '> Strict evaluator rerun only. No hooks were generated, no labels or roles were approved, and no non-ready target was evaluated.',
    '',
    `- Calls made: ${artifact.apiCallsMade}`,
    `- Ready targets called: ${artifact.calledReadyCount}`,
    `- Pending/blocked targets not called: ${artifact.skippedPendingOrBlockedCount}`,
    `- Provider/model: ${artifact.provider} / ${artifact.model}`,
    `- Hard issue codes: ${artifact.hardIssueCodes.join(', ')}`,
    `- Auto-approved: ${artifact.autoApproved}`,
    `- Hooks generated: ${artifact.hooksGenerated}`,
    `- Publishable: ${artifact.publishable}`,
    '',
    '## Called ready targets',
    '',
    '| Target | Meaning | Supplied components | Decision | Reason | Issue codes | Direct target connection | Validation | Final status |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const record of called) {
    const assessment = record.normalizedAssessment;
    lines.push(`| ${markdownCell(record.character)} | ${markdownCell(record.canonicalMeaning)} | ${markdownCell(assessment?.componentTokens.join(' + '))} | ${markdownCell(assessment?.decision)} | ${markdownCell(assessment?.reason)} | ${markdownCell(assessment?.issueCodes.join(', '))} | ${markdownCell(assessment?.directTargetConnection)} | ${markdownCell(issueSummary(record.deterministicValidation))} | ${markdownCell(record.finalStatus)} |`);
  }
  lines.push('', '## Not called', '', '| Target | Gate | Validation | Reason |', '|---|---|---|---|');
  for (const record of notCalled) {
    lines.push(`| ${markdownCell(record.character)} | ${markdownCell(record.assessmentGate)} | ${markdownCell(issueSummary(record.deterministicValidation))} | ${markdownCell(record.resolutionReason)} |`);
  }
  lines.push('', '## Interpretation boundary', '', 'A valid `scene-viable` assessment means the model supplied no hard issue codes and passed deterministic schema checks. It is not a hook, not a factual formation claim, and not approval for generation or publication. Full immutable packets, hashes, raw responses, parsed JSON, and validation telemetry are in the JSON artifact.', '');
  return `${lines.join('\n')}\n`;
}

function buildComparison(previous: PreviousArtifact, current: OutputArtifact): Record<string, unknown> {
  const previousByCharacter = new Map(previous.records.map((record) => [record.character, record]));
  const currentRows = current.records
    .filter((record) => record.apiCallMade)
    .map((record) => {
      const old = previousByCharacter.get(record.character);
      return {
        target: record.character,
        suppliedMeaning: record.canonicalMeaning,
        previous: old ? {
          decision: old.parsedJson?.decision || null,
          reason: old.parsedJson?.reason || null,
          unsupportedInference: old.parsedJson?.unsupportedInference ?? null,
          deterministicValidation: old.deterministicValidation,
          finalStatus: old.finalStatus,
        } : null,
        strict: {
          componentTokens: record.normalizedAssessment?.componentTokens || [],
          decision: record.normalizedAssessment?.decision || null,
          reason: record.normalizedAssessment?.reason || null,
          issueCodes: record.normalizedAssessment?.issueCodes || [],
          directTargetConnection: record.normalizedAssessment?.directTargetConnection || null,
          deterministicValidation: record.deterministicValidation,
          finalStatus: record.finalStatus,
        },
        decisionChanged: old?.parsedJson?.decision !== record.normalizedAssessment?.decision,
      };
    });
  const countDecisions = (records: Array<{ normalizedAssessment?: StrictAssessment | null; parsedJson?: PreviousRecord['parsedJson'] | null }>) => records.reduce<Record<string, number>>((counts, record) => {
    const decision = record.normalizedAssessment?.decision || record.parsedJson?.decision || 'no-assessment';
    counts[decision] = (counts[decision] || 0) + 1;
    return counts;
  }, {});
  return {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-scene-viability-comparison-v1-v2',
    publishable: false,
    hooksGenerated: false,
    sourcePreviousResults: 'book-1-frozen-47-scene-viability-results-v1.json',
    sourceStrictResults: 'book-1-frozen-47-scene-viability-results-v2.json',
    previousDecisionCounts: countDecisions(previous.records.filter((record) => record.apiCallMade).map((record) => ({ parsedJson: record.parsedJson }))),
    strictDecisionCounts: countDecisions(current.records.filter((record) => record.apiCallMade).map((record) => ({ normalizedAssessment: record.normalizedAssessment }))),
    rows: currentRows,
  };
}

function buildComparisonReport(comparison: Record<string, unknown>): string {
  const rows = comparison.rows as Array<Record<string, unknown>>;
  const lines = [
    '# Scene-viability comparison: v1 versus strict v2',
    '',
    '> Same seven ready targets and same supplied component labels. v2 changes only the viability evaluator contract; it does not generate hooks or alter frozen planning/metadata artifacts.',
    '',
    `- Previous decision counts: ${JSON.stringify(comparison.previousDecisionCounts)}`,
    `- Strict decision counts: ${JSON.stringify(comparison.strictDecisionCounts)}`,
    '- Publishable: false',
    '- Hooks generated: false',
    '',
    '| Target | Previous | Strict | Strict issue codes | Strict validation | Decision changed |',
    '|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    const previous = row.previous as Record<string, unknown> | null;
    const strict = row.strict as Record<string, unknown>;
    const validation = strict.deterministicValidation as Record<string, unknown>;
    lines.push(`| ${markdownCell(String(row.target))} | ${markdownCell(previous ? String(previous.decision || '—') : '—')} | ${markdownCell(String(strict.decision || '—'))} | ${markdownCell(Array.isArray(strict.issueCodes) ? strict.issueCodes.join(', ') : '')} | ${markdownCell(String(validation.status || '—'))}${validation.valid === false && Array.isArray(validation.issues) ? ` (${validation.issues.map((issue) => (issue as Record<string, unknown>).code).join(', ')})` : ''} | ${row.decisionChanged ? 'yes' : 'no'} |`);
  }
  lines.push('', '## Strict evaluator explanations', '');
  for (const row of rows) {
    const strict = row.strict as Record<string, unknown>;
    lines.push(`### ${row.target}`, '', `- Direct target connection: ${strict.directTargetConnection || '—'}`, `- Reason: ${strict.reason || '—'}`, `- Issue codes: ${Array.isArray(strict.issueCodes) && strict.issueCodes.length ? strict.issueCodes.join(', ') : 'none'}`, '');
  }
  lines.push('## Review boundary', '', 'This comparison is an evaluation artifact only. It does not approve any Scene hook and does not change global component labels. A simple deterministic pre-rule may be proposed after reviewing these results, but none is implemented by this run.', '');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  requireExecutionApproval();
  const packet = readJson<PacketArtifact>(PACKET_PATH);
  if (packet.publishable || packet.executed || packet.apiCallsMade !== 0 || packet.targetCount !== 15) {
    throw new Error('Refusing to run from a changed, executed, publishable, or non-frozen viability packet.');
  }
  const readyEntries = packet.entries.filter((entry) => entry.assessmentGate === 'ready');
  const gatedEntries = packet.entries.filter((entry) => entry.assessmentGate !== 'ready');
  if (readyEntries.length !== 7 || gatedEntries.length !== 8) {
    throw new Error(`Expected 7 ready and 8 gated targets; found ${readyEntries.length} ready and ${gatedEntries.length} gated.`);
  }
  const provider = resolveProvider();
  if (provider.model !== 'deepseek-v4-flash') {
    throw new Error(`Configured model ${provider.model} does not match the frozen viability model.`);
  }
  const strictRequests = new Map(packet.entries.map((entry) => [entry.character, buildStrictRequest(entry)]));
  const records: ResultRecord[] = gatedEntries.map((entry) => {
    const request = strictRequests.get(entry.character) as DeepSeekRequest;
    return {
      character: entry.character,
      canonicalMeaning: entry.canonicalMeaning,
      canonicalPinyin: entry.canonicalPinyin,
      assessmentGate: entry.assessmentGate,
      components: entry.components,
      exactImmutableInputPacket: request,
      packetHash: hashPacket(request),
      apiCallMade: false,
      attempts: [],
      parsedJson: null,
      normalizedAssessment: null,
      deterministicValidation: { valid: false, status: 'not-run', issues: [{ code: 'not-evaluated-gate', message: 'Target was not evaluated because its existing gate is not ready.' }] },
      provider: null,
      model: null,
      finalStatus: 'not-called-gated',
      resolutionReason: 'Not called because the existing viability gate is pending global label review or blocked by missing/unknown/structural data.',
    };
  });
  const running: OutputArtifact = {
    schemaVersion: 2,
    artifact: 'book-1-frozen-47-scene-viability-results-v2',
    distribution: 'development-only-candidate',
    publishable: false,
    hooksGenerated: false,
    autoApproved: false,
    executionStatus: 'running',
    sourcePacket: 'book-1-frozen-47-scene-viability-packet-v1.json',
    sourcePreviousResults: 'book-1-frozen-47-scene-viability-results-v1.json',
    provider: provider.provider,
    model: provider.model,
    promptVersion: 'scene-viability-v2-strict',
    hardIssueCodes: HARD_ISSUE_CODES,
    apiCallsMade: 0,
    calledReadyCount: readyEntries.length,
    skippedPendingOrBlockedCount: gatedEntries.length,
    records,
  };
  writeArtifact(running);

  let apiCallsMade = 0;
  for (const entry of readyEntries) {
    apiCallsMade += 1;
    process.stdout.write(`Calling strict DeepSeek viability ${apiCallsMade}/${readyEntries.length} for ${entry.character}...\n`);
    const request = strictRequests.get(entry.character) as DeepSeekRequest;
    const response = await callProvider(provider, request);
    const validation = validateAssessment(entry, response.response.normalizedAssessment, response.response.parseError);
    const finalStatus: FinalStatus = validation.valid ? 'valid-assessment' : 'needs-review';
    const attempt: AttemptTelemetry = {
      character: entry.character,
      exactImmutableInputPacket: request,
      packetHash: hashPacket(request),
      rawProviderResponseText: response.response.rawProviderResponseText,
      rawModelResponseText: response.response.rawModelResponseText,
      parsedJson: response.response.parsedJson,
      normalizedAssessment: response.response.normalizedAssessment,
      deterministicValidation: validation,
      provider: provider.provider,
      model: provider.model,
      attemptNumber: 1,
      finalStatus,
    };
    const record: ResultRecord = {
      character: entry.character,
      canonicalMeaning: entry.canonicalMeaning,
      canonicalPinyin: entry.canonicalPinyin,
      assessmentGate: entry.assessmentGate,
      components: entry.components,
      exactImmutableInputPacket: request,
      packetHash: hashPacket(request),
      apiCallMade: true,
      attempts: [attempt],
      parsedJson: response.response.parsedJson,
      normalizedAssessment: response.response.normalizedAssessment,
      deterministicValidation: validation,
      provider: provider.provider,
      model: provider.model,
      finalStatus,
      resolutionReason: validation.valid ? 'Strict viability assessment passed deterministic checks; no hook generated.' : 'Response requires review after strict deterministic validation.',
    };
    const oldIndex = records.findIndex((candidate) => candidate.character === entry.character);
    if (oldIndex >= 0) records[oldIndex] = record;
    else records.push(record);
    running.apiCallsMade = apiCallsMade;
    writeArtifact(running);
  }

  const completed: OutputArtifact = { ...running, executionStatus: 'completed', apiCallsMade, records };
  writeArtifact(completed);
  writeFileSync(REPORT_PATH, buildReport(completed));
  const previous = readJson<PreviousArtifact>(PREVIOUS_RESULTS_PATH);
  if (previous.publishable || previous.apiCallsMade !== 7) {
    throw new Error('Previous viability results are not the expected non-publishable seven-call comparison baseline.');
  }
  const comparison = buildComparison(previous, completed);
  writeFileSync(COMPARISON_PATH, `${JSON.stringify(comparison, null, 2)}\n`);
  writeFileSync(COMPARISON_REPORT_PATH, buildComparisonReport(comparison));
  console.log(JSON.stringify({
    apiCallsMade,
    calledReadyCount: readyEntries.length,
    skippedPendingOrBlockedCount: gatedEntries.length,
    resultCounts: records.reduce<Record<string, number>>((counts, record) => {
      const decision = record.normalizedAssessment?.decision || record.finalStatus;
      counts[decision] = (counts[decision] ?? 0) + 1;
      return counts;
    }, {}),
    output: 'output/memory-hooks/book-1-frozen-47-scene-viability-results-v2.json',
    report: 'output/memory-hooks/book-1-frozen-47-scene-viability-results-v2.md',
    comparison: 'output/memory-hooks/book-1-frozen-47-scene-viability-comparison-v1-v2.md',
    hooksGenerated: false,
    autoApproved: false,
    publishable: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
