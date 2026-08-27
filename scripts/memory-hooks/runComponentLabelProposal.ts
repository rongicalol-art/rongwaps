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

type MetadataStatus = 'already-approved' | 'candidate-review' | 'review-required' | 'withhold';
type ProposalDecision = 'select' | 'withhold';
type ProposalBasis = 'existing-candidate' | 'simplified-supplied-label' | 'none';
type ProposalConfidence = 'high' | 'medium' | 'low';
type FinalProposalStatus = 'strong-learner-label-proposal' | 'ambiguous-human-review' | 'withheld';

interface CandidateLabel {
  label: string;
  basis: 'meaning' | 'reading' | 'visual';
  confidence: ProposalConfidence;
  warnings: string[];
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
    metadataStatus: MetadataStatus;
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
  model: string;
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
  metadataStatus: MetadataStatus;
  metadataReasons: string[];
  sourceRefs: string[];
  targetSpecificUse: 'not-evaluated';
  deepseekInput: ProposalInput;
  deepseekRequest: DeepSeekRequestPayload;
}

interface PacketArtifact {
  schemaVersion: number;
  publishable: false;
  approvedForExecution: false;
  provider: 'deepseek';
  model: string;
  promptVersion: string;
  components: PacketEntry[];
}

interface ParsedProposal {
  glyph: string;
  decision: ProposalDecision;
  label: string | null;
  basis: ProposalBasis;
  sourceText: string | null;
  confidence: ProposalConfidence;
  warnings: string[];
  reason: string;
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
  glyph: string;
  exactImmutableInputPacket: DeepSeekRequestPayload;
  packetHash: string;
  rawProviderResponseText: string | null;
  rawModelResponseText: string | null;
  parsedJson: ParsedProposal | null;
  deterministicValidation: DeterministicValidation;
  provider: string;
  model: string;
  attemptNumber: number;
  finalProposalStatus: FinalProposalStatus;
}

interface ResultRecord {
  glyph: string;
  affectedCharacters: string[];
  metadataStatus: MetadataStatus;
  rawDefinitions: string[];
  readings: string[];
  existingCandidateLabels: CandidateLabel[];
  exactImmutableInputPacket: DeepSeekRequestPayload;
  packetHash: string;
  apiCallMade: boolean;
  attempts: AttemptTelemetry[];
  parsedJson: ParsedProposal | null;
  deterministicValidation: DeterministicValidation;
  provider: string | null;
  model: string | null;
  finalProposalStatus: FinalProposalStatus;
  resolutionReason: string;
}

interface ProposalArtifact {
  schemaVersion: 1;
  artifact: 'book-1-frozen-47-component-label-proposals';
  distribution: 'development-only-candidate';
  publishable: false;
  autoApproved: false;
  executionStatus: 'running' | 'completed';
  sourcePacket: string;
  provider: string;
  model: string;
  promptVersion: string;
  apiCallsMade: number;
  skippedWithholdCount: number;
  records: ResultRecord[];
}

interface ProviderEnvelope {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PACKET_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposal-packet-v1.json');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposals-v1.json');
const TEMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;
const REPORT_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposals-v1.md');
const PROMPT_VERSION = 'component-label-proposal-v1';

const RESPONSE_KEYS = new Set([
  'glyph',
  'decision',
  'label',
  'basis',
  'sourceText',
  'confidence',
  'warnings',
  'reason',
]);

const UNSAFE_METADATA_PATTERN = /(?:ancient|variant|terrestrial branch|heavenly stem|transliteration|short-tailed|component cluster|used in|surname|kwukyel|stroke|number one|slash|hook|line)/iu;
const FORBIDDEN_REASON_PATTERN = /(?:target-specific|semantic bridge|phonetic relationship|decomposition|etymolog|histor|origin|role|relationship|pronunciation|sound clue)/iu;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function hashPacket(packet: DeepSeekRequestPayload): string {
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

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value as string[]
    : [];
}

function parseProposal(rawModelResponseText: string): ParsedProposal {
  const parsed = JSON.parse(unwrapJson(rawModelResponseText)) as Record<string, unknown>;
  return {
    glyph: stringValue(parsed.glyph),
    decision: stringValue(parsed.decision) as ProposalDecision,
    label: parsed.label === null ? null : stringValue(parsed.label) || null,
    basis: stringValue(parsed.basis) as ProposalBasis,
    sourceText: parsed.sourceText === null ? null : stringValue(parsed.sourceText) || null,
    confidence: stringValue(parsed.confidence) as ProposalConfidence,
    warnings: stringArray(parsed.warnings),
    reason: stringValue(parsed.reason),
  };
}

function normalizedLabel(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/[“”]/gu, '"')
    .replace(/\s+/gu, ' ')
    .trim();
}

function isControlledSimplification(label: string, sourceText: string): boolean {
  const normalizedLabelValue = normalizedLabel(label);
  const normalizedSource = normalizedLabel(sourceText);
  if (normalizedLabelValue === normalizedSource) return true;
  return normalizedLabelValue === normalizedSource.replace(/^to\s+/iu, '');
}

function validateProposal(entry: PacketEntry, proposal: ParsedProposal | null, parseError?: string): DeterministicValidation {
  if (!proposal) {
    return {
      valid: false,
      issues: [{ code: 'response-not-parseable-json', message: parseError || 'The model response did not parse as JSON.' }],
    };
  }
  const issues: ValidationIssue[] = [];
  const keys = Object.keys(proposal);
  if (keys.some((key) => !RESPONSE_KEYS.has(key))) {
    issues.push({ code: 'unexpected-response-field', message: 'The parsed response contains a field outside the constrained output schema.' });
  }
  if (proposal.glyph !== entry.glyph) {
    issues.push({ code: 'glyph-mismatch', message: `Expected glyph ${entry.glyph}, received ${proposal.glyph || '(empty)'}.` });
  }
  if (proposal.decision !== 'select' && proposal.decision !== 'withhold') {
    issues.push({ code: 'invalid-decision', message: 'decision must be select or withhold.' });
  }
  if (!['high', 'medium', 'low'].includes(proposal.confidence)) {
    issues.push({ code: 'invalid-confidence', message: 'confidence must be high, medium, or low.' });
  }
  if (!Array.isArray(proposal.warnings) || proposal.warnings.some((warning) => typeof warning !== 'string')) {
    issues.push({ code: 'invalid-warnings', message: 'warnings must be an array of strings.' });
  }
  if (!proposal.reason.trim()) {
    issues.push({ code: 'missing-reason', message: 'reason must contain a short metadata-only explanation.' });
  } else if (FORBIDDEN_REASON_PATTERN.test(proposal.reason)) {
    issues.push({ code: 'forbidden-inference-in-reason', message: 'reason contains a prohibited target/relationship/history inference.' });
  }

  const allowedSources = new Set([
    ...entry.rawDefinitions,
    ...entry.existingCandidateLabels.map((candidate) => candidate.label),
  ]);
  if (proposal.decision === 'withhold') {
    if (proposal.label !== null || proposal.basis !== 'none' || proposal.sourceText !== null) {
      issues.push({ code: 'withhold-shape-invalid', message: 'withhold requires label, basis, and sourceText to be null/none.' });
    }
  } else {
    if (!proposal.label) issues.push({ code: 'missing-selected-label', message: 'select requires a non-empty label.' });
    if (!['existing-candidate', 'simplified-supplied-label'].includes(proposal.basis)) {
      issues.push({ code: 'invalid-select-basis', message: 'select requires an allowed non-none basis.' });
    }
    if (!proposal.sourceText || !allowedSources.has(proposal.sourceText)) {
      issues.push({ code: 'unsupported-source-text', message: 'sourceText must exactly match a supplied raw definition or candidate label.' });
    }
    if (proposal.basis === 'existing-candidate' && proposal.label && !entry.existingCandidateLabels.some((candidate) => candidate.label === proposal.label)) {
      issues.push({ code: 'label-not-an-existing-candidate', message: 'existing-candidate basis requires an exact supplied candidate label.' });
    }
    if (proposal.basis === 'simplified-supplied-label' && proposal.label && proposal.sourceText && !isControlledSimplification(proposal.label, proposal.sourceText)) {
      issues.push({ code: 'uncontrolled-simplification', message: 'The proposed simplification changes more than the permitted leading grammar word.' });
    }
    if (proposal.sourceText && UNSAFE_METADATA_PATTERN.test(proposal.sourceText)) {
      issues.push({ code: 'unsafe-source-metadata', message: 'The selected source text is technical, historical, encoding-related, or otherwise unsafe for a learner label.' });
    }
    if (proposal.label && UNSAFE_METADATA_PATTERN.test(proposal.label)) {
      issues.push({ code: 'unsafe-selected-label', message: 'The selected label is technical, historical, encoding-related, or otherwise unsafe for a learner label.' });
    }
  }
  return { valid: issues.length === 0, issues };
}

function strongProposal(entry: PacketEntry, proposal: ParsedProposal, validation: DeterministicValidation): boolean {
  if (!validation.valid || proposal.decision !== 'select') return false;
  if (entry.metadataStatus !== 'candidate-review') return false;
  if (entry.rawDefinitions.length !== 1 || entry.existingCandidateLabels.length !== 1) return false;
  if (entry.existingCandidateLabels[0].confidence !== 'high') return false;
  if (proposal.basis !== 'existing-candidate' || proposal.label !== proposal.sourceText) return false;
  if (!proposal.label || proposal.label.split(/\s+/u).length > 3) return false;
  if (UNSAFE_METADATA_PATTERN.test(proposal.label)) return false;
  return true;
}

function classify(entry: PacketEntry, proposal: ParsedProposal | null, validation: DeterministicValidation): FinalProposalStatus {
  if (!proposal || !validation.valid || proposal.decision === 'withhold') return 'withheld';
  return strongProposal(entry, proposal, validation) ? 'strong-learner-label-proposal' : 'ambiguous-human-review';
}

function writeArtifact(artifact: ProposalArtifact): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(TEMP_OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  renameSync(TEMP_OUTPUT_PATH, OUTPUT_PATH);
}

function cell(value: string | null | undefined): string {
  return (value || '—').replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ');
}

function compactResult(result: ResultRecord): string {
  const proposal = result.parsedJson;
  const decision = proposal?.decision || 'error';
  const label = proposal?.label || '—';
  const basis = proposal?.basis || '—';
  const sourceText = proposal?.sourceText || '—';
  const warnings = proposal?.warnings?.join('; ') || '—';
  const validation = result.deterministicValidation.valid
    ? 'valid'
    : result.deterministicValidation.issues.map((issue) => issue.code).join(', ');
  return `| ${cell(result.glyph)} | ${cell(result.affectedCharacters.join('、'))} | ${cell(result.metadataStatus)} | ${cell(decision)} | ${cell(label)} | ${cell(basis)} | ${cell(sourceText)} | ${cell(warnings)} | ${cell(validation)} |`;
}

function buildReport(artifact: ProposalArtifact): string {
  const attempted = artifact.records.filter((record) => record.apiCallMade);
  const groups: Array<[FinalProposalStatus, string]> = [
    ['strong-learner-label-proposal', 'Strong learner-label proposals'],
    ['ambiguous-human-review', 'Ambiguous / human review'],
    ['withheld', 'Withheld'],
  ];
  const lines = [
    '# Frozen 47 component-label proposal results',
    '',
    '> DeepSeek label-proposal run only. No labels were auto-approved. No planner, hook, pilot, or production data was changed.',
    '',
    `- API calls: ${artifact.apiCallsMade}`,
    `- Deterministically skipped: ${artifact.skippedWithholdCount}`,
    `- Provider/model: ${artifact.provider} / ${artifact.model}`,
    `- Publishable: ${artifact.publishable}`,
    `- Auto-approved: ${artifact.autoApproved}`,
    `- Full telemetry: [book-1-frozen-47-component-label-proposals-v1.json](./book-1-frozen-47-component-label-proposals-v1.json)`,
    '',
    'The table shows the 27 API-call results. “Strong” means a deterministic, exact supplied-label proposal that still requires human approval; it is not an approval decision.',
    '',
  ];
  for (const [status, title] of groups) {
    const records = attempted.filter((record) => record.finalProposalStatus === status);
    lines.push(`## ${title} (${records.length})`);
    lines.push('');
    lines.push('| Glyph | Blocks | Metadata | Decision | Label | Basis | Source text | Warnings | Validation |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    if (records.length === 0) lines.push('| — | — | — | — | — | — | — | — | — |');
    else records.forEach((record) => lines.push(compactResult(record)));
    lines.push('');
  }
  const skipped = artifact.records.filter((record) => !record.apiCallMade);
  lines.push(`## Deterministically skipped withhold entries (${skipped.length})`);
  lines.push('');
  lines.push(`No DeepSeek request was made for: ${skipped.map((record) => record.glyph).join('、')}.`);
  lines.push('');
  lines.push('Their immutable packets and deterministic-withhold resolution remain in the telemetry artifact for auditability.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function callDeepSeek(provider: ProviderConfig, request: DeepSeekRequestPayload): Promise<{
  rawProviderResponseText: string | null;
  rawModelResponseText: string | null;
  parsedJson: ParsedProposal | null;
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
        parsedJson: parseProposal(rawModelResponseText),
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

async function main(): Promise<void> {
  const packet = readJson<PacketArtifact>(PACKET_PATH);
  if (packet.publishable || packet.approvedForExecution) {
    throw new Error('Refusing to run from a publishable or already-approved packet.');
  }
  if (packet.components.length !== 41) {
    throw new Error(`Expected 41 packet components; found ${packet.components.length}.`);
  }
  const provider = resolveProvider();
  if (provider.model !== packet.model) {
    throw new Error(`Provider model ${provider.model} does not match immutable packet model ${packet.model}.`);
  }

  const records: ResultRecord[] = [];
  const initialArtifact: ProposalArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-component-label-proposals',
    distribution: 'development-only-candidate',
    publishable: false,
    autoApproved: false,
    executionStatus: 'running',
    sourcePacket: 'book-1-frozen-47-component-label-proposal-packet-v1.json',
    provider: provider.provider,
    model: provider.model,
    promptVersion: PROMPT_VERSION,
    apiCallsMade: 0,
    skippedWithholdCount: 0,
    records,
  };
  writeArtifact(initialArtifact);

  let apiCallsMade = 0;
  let skippedWithholdCount = 0;
  for (const entry of packet.components) {
    const packetHash = hashPacket(entry.deepseekRequest);
    if (entry.metadataStatus === 'withhold') {
      skippedWithholdCount += 1;
      records.push({
        glyph: entry.glyph,
        affectedCharacters: entry.affectedCharacters,
        metadataStatus: entry.metadataStatus,
        rawDefinitions: entry.rawDefinitions,
        readings: entry.readings,
        existingCandidateLabels: entry.existingCandidateLabels,
        exactImmutableInputPacket: entry.deepseekRequest,
        packetHash,
        apiCallMade: false,
        attempts: [],
        parsedJson: {
          glyph: entry.glyph,
          decision: 'withhold',
          label: null,
          basis: 'none',
          sourceText: null,
          confidence: 'high',
          warnings: ['metadata-status-withhold', 'deepseek-call-skipped'],
          reason: 'Deterministically withheld because current metadata status is withhold.',
        },
        deterministicValidation: { valid: true, issues: [] },
        provider: null,
        model: null,
        finalProposalStatus: 'withheld',
        resolutionReason: 'deterministic-withhold-no-api-call',
      });
      initialArtifact.apiCallsMade = apiCallsMade;
      initialArtifact.skippedWithholdCount = skippedWithholdCount;
      writeArtifact(initialArtifact);
      continue;
    }

    apiCallsMade += 1;
    process.stdout.write(`Calling DeepSeek ${apiCallsMade}/27 for ${entry.glyph}...\n`);
    const response = await callDeepSeek(provider, entry.deepseekRequest);
    const validation = validateProposal(entry, response.parsedJson, response.parseError);
    const finalProposalStatus = classify(entry, response.parsedJson, validation);
    const attempt: AttemptTelemetry = {
      glyph: entry.glyph,
      exactImmutableInputPacket: entry.deepseekRequest,
      packetHash,
      rawProviderResponseText: response.rawProviderResponseText,
      rawModelResponseText: response.rawModelResponseText,
      parsedJson: response.parsedJson,
      deterministicValidation: validation,
      provider: provider.provider,
      model: provider.model,
      attemptNumber: 1,
      finalProposalStatus,
    };
    records.push({
      glyph: entry.glyph,
      affectedCharacters: entry.affectedCharacters,
      metadataStatus: entry.metadataStatus,
      rawDefinitions: entry.rawDefinitions,
      readings: entry.readings,
      existingCandidateLabels: entry.existingCandidateLabels,
      exactImmutableInputPacket: entry.deepseekRequest,
      packetHash,
      apiCallMade: true,
      attempts: [attempt],
      parsedJson: response.parsedJson,
      deterministicValidation: validation,
      provider: provider.provider,
      model: provider.model,
      finalProposalStatus,
      resolutionReason: validation.valid
        ? response.parsedJson?.decision === 'withhold'
          ? 'model-withhold'
          : finalProposalStatus === 'strong-learner-label-proposal'
            ? 'exact-supplied-label-with-conservative-strong-heuristic'
            : 'valid-proposal-requires-human-review'
        : 'deterministic-validation-failed',
    });
    initialArtifact.apiCallsMade = apiCallsMade;
    initialArtifact.skippedWithholdCount = skippedWithholdCount;
    writeArtifact(initialArtifact);
  }

  const finalArtifact: ProposalArtifact = {
    ...initialArtifact,
    executionStatus: 'completed',
    apiCallsMade,
    skippedWithholdCount,
    records,
  };
  writeArtifact(finalArtifact);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, buildReport(finalArtifact));
  console.log(JSON.stringify({
    apiCallsMade,
    skippedWithholdCount,
    resultCounts: finalArtifact.records.reduce<Record<string, number>>((counts, record) => {
      counts[record.finalProposalStatus] = (counts[record.finalProposalStatus] ?? 0) + 1;
      return counts;
    }, {}),
    output: 'output/memory-hooks/book-1-frozen-47-component-label-proposals-v1.json',
    report: 'output/memory-hooks/book-1-frozen-47-component-label-proposals-v1.md',
    autoApproved: false,
    publishable: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
