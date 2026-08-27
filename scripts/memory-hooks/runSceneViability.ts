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
type LabelCoverage = 'complete' | 'pending-global-review' | 'missing-label' | 'unresolved-structure';
type FinalStatus = 'valid-assessment' | 'needs-review' | 'not-called-gated';

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

interface ParsedAssessment {
  character: string;
  decision: SceneDecision;
  reason: string;
  labelCoverage: LabelCoverage;
  unsupportedInference: boolean;
}

interface ValidationIssue {
  code: string;
  message: string;
}

interface DeterministicValidation {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ProviderConfig {
  provider: 'deepseek' | 'openrouter';
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
  parsedJson: ParsedAssessment | null;
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
  parsedJson: ParsedAssessment | null;
  deterministicValidation: DeterministicValidation;
  provider: string | null;
  model: string | null;
  finalStatus: FinalStatus;
  resolutionReason: string;
}

interface OutputArtifact {
  schemaVersion: 1;
  artifact: 'book-1-frozen-47-scene-viability-results';
  distribution: 'development-only-candidate';
  publishable: false;
  hooksGenerated: false;
  autoApproved: false;
  executionStatus: 'running' | 'completed';
  sourcePacket: string;
  provider: string;
  model: string;
  promptVersion: 'scene-viability-v1';
  apiCallsMade: number;
  calledReadyCount: number;
  skippedPendingOrBlockedCount: number;
  records: ResultRecord[];
}

interface ProviderEnvelope {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PACKET_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-packet-v1.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v1.json');
const TEMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;
const REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-scene-viability-results-v1.md');

const ALLOWED_DECISIONS: SceneDecision[] = ['scene-viable', 'scene-weak', 'scene-not-useful'];
const ALLOWED_COVERAGE: LabelCoverage[] = ['complete', 'pending-global-review', 'missing-label', 'unresolved-structure'];
const FORBIDDEN_INFERENCE = /(?:semantic role|phonetic role|phonetic relationship|sound relationship|pronunciation clue|histor|etymolog|origin|decomposition|component means|represents|derived from)/iu;

function requireExecutionApproval(): void {
  const flags = new Set(process.argv.slice(2));
  if (!flags.has('--execute') || !flags.has('--ready-only')) {
    throw new Error('Refusing viability API calls. Re-run with --execute --ready-only to call only ready targets.');
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

function packetHash(packet: DeepSeekRequest): string {
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

function unwrapJson(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '');
}

function parseAssessment(content: string): ParsedAssessment {
  const parsed = JSON.parse(unwrapJson(content)) as Record<string, unknown>;
  return {
    character: typeof parsed.character === 'string' ? parsed.character : '',
    decision: typeof parsed.decision === 'string' ? parsed.decision as SceneDecision : '' as SceneDecision,
    reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    labelCoverage: typeof parsed.labelCoverage === 'string' ? parsed.labelCoverage as LabelCoverage : '' as LabelCoverage,
    unsupportedInference: parsed.unsupportedInference === true,
  };
}

function validateAssessment(
  entry: ViabilityEntry,
  assessment: ParsedAssessment | null,
  parseError?: string,
): DeterministicValidation {
  if (!assessment) return {
    valid: false,
    issues: [{ code: 'response-not-parseable-json', message: parseError || 'Model response did not parse as JSON.' }],
  };
  const issues: ValidationIssue[] = [];
  if (assessment.character !== entry.character) {
    issues.push({ code: 'character-mismatch', message: `Expected ${entry.character}; received ${assessment.character || '(empty)'}.` });
  }
  if (!ALLOWED_DECISIONS.includes(assessment.decision)) {
    issues.push({ code: 'invalid-decision', message: 'decision must be scene-viable, scene-weak, or scene-not-useful.' });
  }
  if (!assessment.reason.trim()) {
    issues.push({ code: 'missing-pedagogical-reason', message: 'reason must be a short pedagogical explanation.' });
  }
  if (assessment.reason.trim().split(/\s+/u).length > 45) {
    issues.push({ code: 'reason-too-long', message: 'reason must remain short; it must not become a hook or story.' });
  }
  if (!ALLOWED_COVERAGE.includes(assessment.labelCoverage)) {
    issues.push({ code: 'invalid-label-coverage', message: 'labelCoverage is outside the constrained schema.' });
  }
  const expectedCoverage: LabelCoverage = entry.assessmentGate === 'ready'
    ? 'complete'
    : entry.assessmentGate === 'pending-global-label-review'
      ? 'pending-global-review'
      : 'unresolved-structure';
  if (assessment.labelCoverage !== expectedCoverage) {
    issues.push({ code: 'label-coverage-mismatch', message: `Expected labelCoverage ${expectedCoverage} for gate ${entry.assessmentGate}.` });
  }
  if (assessment.unsupportedInference) {
    issues.push({ code: 'unsupported-inference-flagged', message: 'Model reported that the assessment would require stretching or inventing a component meaning.' });
  }
  if (FORBIDDEN_INFERENCE.test(assessment.reason)) {
    issues.push({ code: 'forbidden-inference-in-reason', message: 'reason contains a prohibited role, sound, historical, etymological, or decomposition claim.' });
  }
  const targetToken = entry.targetDisplayLabel ? `${entry.character}(${entry.targetDisplayLabel})` : '';
  if (targetToken && assessment.reason.includes(targetToken)) {
    issues.push({ code: 'hook-like-target-token', message: 'reason contains the learner-facing target token; viability evaluation must not write a hook.' });
  }
  return { valid: issues.length === 0, issues };
}

async function callProvider(provider: ProviderConfig, request: DeepSeekRequest): Promise<{
  rawProviderResponseText: string | null;
  rawModelResponseText: string | null;
  parsedJson: ParsedAssessment | null;
  parseError?: string;
}> {
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
        rawProviderResponseText,
        rawModelResponseText: null,
        parsedJson: null,
        parseError: `HTTP ${response.status}: ${rawProviderResponseText.slice(0, 500)}`,
      };
    }
    let envelope: ProviderEnvelope;
    try {
      envelope = JSON.parse(rawProviderResponseText) as ProviderEnvelope;
    } catch (error) {
      return {
        rawProviderResponseText,
        rawModelResponseText: rawProviderResponseText,
        parsedJson: null,
        parseError: `Provider response was not JSON: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    const rawModelResponseText = typeof envelope.choices?.[0]?.message?.content === 'string'
      ? envelope.choices[0].message.content
      : null;
    if (!rawModelResponseText) {
      return {
        rawProviderResponseText,
        rawModelResponseText: null,
        parsedJson: null,
        parseError: 'Provider response did not contain choices[0].message.content.',
      };
    }
    try {
      return {
        rawProviderResponseText,
        rawModelResponseText,
        parsedJson: parseAssessment(rawModelResponseText),
      };
    } catch (error) {
      return {
        rawProviderResponseText,
        rawModelResponseText,
        parsedJson: null,
        parseError: `Model content was not parseable JSON: ${error instanceof Error ? error.message : String(error)}`,
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

function buildReport(artifact: OutputArtifact): string {
  const called = artifact.records.filter((record) => record.apiCallMade);
  const notCalled = artifact.records.filter((record) => !record.apiCallMade);
  const lines = [
    '# Frozen 47 Scene-viability results',
    '',
    '> DeepSeek evaluated scene viability only. No hooks were generated and no target-specific labels or roles were approved.',
    '',
    `- Calls made: ${artifact.apiCallsMade}`,
    `- Ready targets called: ${artifact.calledReadyCount}`,
    `- Pending/blocked targets not called: ${artifact.skippedPendingOrBlockedCount}`,
    `- Provider/model: ${artifact.provider} / ${artifact.model}`,
    `- Auto-approved: ${artifact.autoApproved}`,
    `- Hooks generated: ${artifact.hooksGenerated}`,
    `- Publishable: ${artifact.publishable}`,
    '',
    '## Called ready targets',
    '',
    '| Target | Meaning | Decision | Reason | Label coverage | Validation | Final status |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const record of called) {
    const parsed = record.parsedJson;
    const validation = record.deterministicValidation.valid
      ? 'valid'
      : record.deterministicValidation.issues.map((issue) => issue.code).join(', ');
    lines.push(`| ${markdownCell(record.character)} | ${markdownCell(record.canonicalMeaning)} | ${markdownCell(parsed?.decision)} | ${markdownCell(parsed?.reason)} | ${markdownCell(parsed?.labelCoverage)} | ${markdownCell(validation)} | ${markdownCell(record.finalStatus)} |`);
  }
  lines.push('', '## Not called', '', '| Target | Gate | Reason |', '|---|---|---|');
  for (const record of notCalled) {
    lines.push(`| ${markdownCell(record.character)} | ${markdownCell(record.assessmentGate)} | ${markdownCell(record.resolutionReason)} |`);
  }
  lines.push('', '## Interpretation boundary', '', 'A `scene-viable` response is only a model assessment that the supplied labels could support a natural invented scene. It is not a hook, not a factual relationship claim, and not approval for publication. The complete raw telemetry and immutable request packets are in the JSON artifact.', '');
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
    throw new Error(`Configured model ${provider.model} does not match the immutable viability packet model.`);
  }

  const records: ResultRecord[] = [];
  for (const entry of gatedEntries) {
    records.push({
      character: entry.character,
      canonicalMeaning: entry.canonicalMeaning,
      canonicalPinyin: entry.canonicalPinyin,
      assessmentGate: entry.assessmentGate,
      components: entry.components,
      exactImmutableInputPacket: entry.exactRequest,
      packetHash: packetHash(entry.exactRequest),
      apiCallMade: false,
      attempts: [],
      parsedJson: null,
      deterministicValidation: { valid: true, issues: [] },
      provider: null,
      model: null,
      finalStatus: 'not-called-gated',
      resolutionReason: 'Not called because the target is pending global label review or blocked by missing/unknown/structural data.',
    });
  }

  const running: OutputArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-scene-viability-results',
    distribution: 'development-only-candidate',
    publishable: false,
    hooksGenerated: false,
    autoApproved: false,
    executionStatus: 'running',
    sourcePacket: 'book-1-frozen-47-scene-viability-packet-v1.json',
    provider: provider.provider,
    model: provider.model,
    promptVersion: 'scene-viability-v1',
    apiCallsMade: 0,
    calledReadyCount: readyEntries.length,
    skippedPendingOrBlockedCount: gatedEntries.length,
    records,
  };
  writeArtifact(running);

  let apiCallsMade = 0;
  for (const entry of readyEntries) {
    apiCallsMade += 1;
    process.stdout.write(`Calling DeepSeek viability ${apiCallsMade}/${readyEntries.length} for ${entry.character}...\n`);
    const packetHashValue = packetHash(entry.exactRequest);
    const response = await callProvider(provider, entry.exactRequest);
    const validation = validateAssessment(entry, response.parsedJson, response.parseError);
    const finalStatus: FinalStatus = validation.valid ? 'valid-assessment' : 'needs-review';
    const attempt: AttemptTelemetry = {
      character: entry.character,
      exactImmutableInputPacket: entry.exactRequest,
      packetHash: packetHashValue,
      rawProviderResponseText: response.rawProviderResponseText,
      rawModelResponseText: response.rawModelResponseText,
      parsedJson: response.parsedJson,
      deterministicValidation: validation,
      provider: provider.provider,
      model: provider.model,
      attemptNumber: 1,
      finalStatus,
    };
    records.push({
      character: entry.character,
      canonicalMeaning: entry.canonicalMeaning,
      canonicalPinyin: entry.canonicalPinyin,
      assessmentGate: entry.assessmentGate,
      components: entry.components,
      exactImmutableInputPacket: entry.exactRequest,
      packetHash: packetHashValue,
      apiCallMade: true,
      attempts: [attempt],
      parsedJson: response.parsedJson,
      deterministicValidation: validation,
      provider: provider.provider,
      model: provider.model,
      finalStatus,
      resolutionReason: validation.valid ? 'Valid viability assessment; no hook generated.' : 'Response requires review after deterministic validation.',
    });
    running.apiCallsMade = apiCallsMade;
    writeArtifact(running);
  }

  const completed: OutputArtifact = { ...running, executionStatus: 'completed', apiCallsMade, records };
  writeArtifact(completed);
  writeFileSync(REPORT_PATH, buildReport(completed));
  console.log(JSON.stringify({
    apiCallsMade,
    calledReadyCount: readyEntries.length,
    skippedPendingOrBlockedCount: gatedEntries.length,
    resultCounts: records.reduce<Record<string, number>>((counts, record) => {
      const decision = record.parsedJson?.decision || record.finalStatus;
      counts[decision] = (counts[decision] ?? 0) + 1;
      return counts;
    }, {}),
    output: 'output/memory-hooks/book-1-frozen-47-scene-viability-results-v1.json',
    report: 'output/memory-hooks/book-1-frozen-47-scene-viability-results-v1.md',
    hooksGenerated: false,
    autoApproved: false,
    publishable: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
