import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import type {
  CharacterHookPlanV2,
  DeterministicHookQualityResult,
  HookFrame,
  MemoryHookCandidateV2,
} from '../../src/features/character-memory-hooks/model';
import { validateHookQualityDeterministically } from './qualityPlanner';
import { evaluateHookStylePreflight } from './stylePreflight';
import { renderDeterministicCandidate } from './deterministicRenderer';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
dotenv.config({
  path: resolve(import.meta.dirname, '../../.env.memory-hooks.local'),
  quiet: true,
  override: true,
});

interface QualityPlanArtifact {
  schemaVersion: 2;
  publishable: false;
  plans: CharacterHookPlanV2[];
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ProviderConfig {
  provider: 'deepseek' | 'openrouter';
  url: string;
  apiKey: string;
  model: string;
}

interface DraftRecord {
  character: string;
  planStatus: CharacterHookPlanV2['status'];
  candidate: MemoryHookCandidateV2 | null;
  validation: DeterministicHookQualityResult | null;
  attempts: number;
  acceptance: 'draft-clean' | 'needs-style-review' | 'rejected' | 'no-useful-hook';
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const ARTIFACT_STEM = process.env.MEMORY_HOOK_ARTIFACT_STEM || 'book-1-pilot';
const PLAN_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-quality-plans-v2.json`);
const CANDIDATE_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-candidates-v2.json`);
const VALIDATION_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-validation-v2.json`);
const PROMPT_VERSION = 'book1-pilot-hybrid-v1';

function requireExecutionApproval(): void {
  const flags = new Set(process.argv.slice(2));
  if (!flags.has('--execute') || !flags.has('--pilot-approved')) {
    throw new Error(
      'Refusing API calls. Re-run with --execute --pilot-approved after reviewing the V2 pilot plans.',
    );
  }
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
  throw new Error('No DEEPSEEK_API_KEY or OPENROUTER_API_KEY is configured.');
}

function frameComponents(frame: HookFrame): HookFrame extends { kind: 'none' }
  ? never
  : Extract<HookFrame, { kind: Exclude<HookFrame['kind'], 'none'> }>['components'] {
  if (frame.kind === 'none') return [] as never;
  return frame.components;
}

function expectedEvidence(frame: Exclude<HookFrame, { kind: 'none' }>): string[] {
  if (frame.kind === 'origin') return frame.sourceRefs;
  return [...new Set([
    ...frame.components.flatMap((component) => component.evidenceRefs),
    ...(frame.kind === 'formation' ? frame.semanticBridge?.sourceRefs ?? [] : []),
  ])];
}

function buildPrompt(plan: CharacterHookPlanV2, retryIssues: string[] = []): string {
  if (plan.frame.kind !== 'scene') throw new Error(`Only scene frames may use DeepSeek: ${plan.character}`);
  const components = frameComponents(plan.frame).map((component) => ({
    occurrenceIds: component.occurrenceIds,
    glyph: component.glyph,
    displayLabel: component.displayLabel,
    labelBasis: component.labelBasis,
    role: component.role,
  }));
  const requiredComponentTokens = components.map((component) => `${component.glyph}(${component.displayLabel})`);
  const requiredOccurrenceRefs = components.flatMap((component) => component.occurrenceIds);
  const evidenceRefs = expectedEvidence(plan.frame);
  const frameRules = [
    'This is an invented mnemonic scene, not an etymology. Do not use historical language.',
    'Scene props such as a cup are allowed only as explicit mnemonicProps; never call a prop a component.',
    `Required scene props: ${(plan.frame.requiredMnemonicProps ?? []).join(', ') || 'none'}.`,
    `Scene guidance: ${plan.frame.sceneGuidance}`,
  ];

  return JSON.stringify({
    task: 'Write one concise learner-facing Chinese character construction hook as JSON.',
    character: plan.character,
    canonicalMeaning: plan.canonicalMeaning,
    targetToken: `${plan.character}(${plan.targetDisplayLabel})`,
    frameKind: plan.frame.kind,
    components,
    requiredComponentTokens,
    requiredOccurrenceRefs,
    requiredEvidenceRefs: evidenceRefs,
    rules: [
      'Return JSON only with character, frameKind, canonicalMeaning, hook, componentOccurrenceRefs, mnemonicProps, ahaConnection, and evidenceRefs.',
      'Use only the supplied Han characters. Keep all other prose in English.',
      'Include every required component token exactly once, verbatim as glyph(label), with no reversed or nested form.',
      'Include the target token exactly once, verbatim as 字(label).',
      `The hook must contain this exact target token: ${plan.character}(${plan.targetDisplayLabel}).`,
      'Never write label (字) or describe a component only by its English word; every supplied component must appear in the exact glyph(label) token.',
      'Never attach English plural or verb endings directly to a glyph(label) token, such as 占(occupy)s.',
      'Use one natural sentence of at most 32 space-delimited words.',
      'Make one clear aha connection: a concrete scene or a supported formation relationship. Do not merely say A and B make C.',
      'Keep mnemonicProps as plain English scene objects only; use [] for a formation or origin hook.',
      `When required scene props are listed, set mnemonicProps to exactly ${(plan.frame.kind === 'scene' ? JSON.stringify(plan.frame.requiredMnemonicProps ?? []) : '[]')} and mention each required prop in the hook.`,
      'Style references are patterns, not answer strings: a visual scene can briefly contextualize a target-specific label and show one clear spatial action; an invented scene should make one physical action cause the target meaning.',
      'Generate the sentence independently. Do not copy, paraphrase, or aim for any prewritten target hook.',
      'If a scene setup mentions a question, keep it as a natural detail inside one causal action; do not turn the hook into a question-answer logic puzzle.',
      'Copy componentOccurrenceRefs and evidenceRefs exactly from the supplied arrays.',
      ...frameRules,
      'Tone benchmarks: 亻(person) rests against 木(tree)—that scene is 休(rest).; 日(sun) and 月(moon) fill the sky with light: 明(bright).',
      ...(retryIssues.length > 0 ? [`Fix these deterministic validation issues from the previous draft: ${retryIssues.join(' | ')}`] : []),
    ],
  });
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseCandidate(content: string): MemoryHookCandidateV2 {
  const unwrapped = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(unwrapped) as Record<string, unknown>;
  return {
    character: stringValue(parsed.character),
    frameKind: stringValue(parsed.frameKind) as MemoryHookCandidateV2['frameKind'],
    canonicalMeaning: stringValue(parsed.canonicalMeaning),
    hook: stringValue(parsed.hook),
    componentOccurrenceRefs: stringArray(parsed.componentOccurrenceRefs),
    mnemonicProps: stringArray(parsed.mnemonicProps),
    ahaConnection: stringValue(parsed.ahaConnection),
    evidenceRefs: stringArray(parsed.evidenceRefs),
  };
}

async function generate(
  provider: ProviderConfig,
  plan: CharacterHookPlanV2,
  retryIssues: string[] = [],
): Promise<MemoryHookCandidateV2> {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      max_tokens: 240,
      ...(provider.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Follow the supplied plan exactly. Return valid JSON only.' },
        { role: 'user', content: buildPrompt(plan, retryIssues) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Hook generation failed with HTTP ${response.status}.`);
  const payload = await response.json() as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Hook generation returned empty content.');
  return parseCandidate(content);
}

function acceptance(
  plan: CharacterHookPlanV2,
  validation: DeterministicHookQualityResult,
  styleIssueCount = 0,
): DraftRecord['acceptance'] {
  if (plan.frame.kind === 'none') return 'no-useful-hook';
  if (!validation.valid) return 'rejected';
  if (validation.issues.length > 0 || styleIssueCount > 0) return 'needs-style-review';
  return 'draft-clean';
}

function validationForNoHook(plan: CharacterHookPlanV2): DeterministicHookQualityResult {
  return {
    character: plan.character,
    valid: false,
    issues: [{
      code: 'no-useful-hook-frame',
      severity: 'error',
      message: plan.frame.kind === 'none' ? plan.frame.detail : 'No draft generated.',
    }],
  };
}

function buildBenchmarkCandidate(plan: CharacterHookPlanV2): MemoryHookCandidateV2 | null {
  if (plan.frame.kind !== 'scene' || !plan.frame.benchmarkHook) return null;
  return {
    character: plan.character,
    frameKind: 'scene',
    canonicalMeaning: plan.canonicalMeaning ?? '',
    hook: plan.frame.benchmarkHook,
    componentOccurrenceRefs: plan.frame.components.flatMap((component) => component.occurrenceIds),
    mnemonicProps: [],
    ahaConnection: plan.frame.benchmarkAhaConnection ?? plan.frame.sceneGuidance,
    evidenceRefs: expectedEvidence(plan.frame),
  };
}

async function main(): Promise<void> {
  requireExecutionApproval();
  let provider: ProviderConfig | null = null;
  const getProvider = (): ProviderConfig => {
    provider ??= resolveProvider();
    return provider;
  };
  const artifact = JSON.parse(readFileSync(PLAN_PATH, 'utf8')) as QualityPlanArtifact;
  if (artifact.schemaVersion !== 2 || artifact.publishable) {
    throw new Error('Refusing generation from a missing, non-V2, or publishable plan artifact.');
  }
  const retryInvalid = process.argv.includes('--retry-invalid');
  const retrySceneStyle = process.argv.includes('--retry-scene-style');
  const forceRegenerate = process.argv.includes('--force-regenerate');
  const prior = existsSync(CANDIDATE_PATH)
    ? (JSON.parse(readFileSync(CANDIDATE_PATH, 'utf8')) as { records?: DraftRecord[] }).records ?? []
    : [];
  if (forceRegenerate && existsSync(CANDIDATE_PATH)) {
    writeFileSync(resolve(OUTPUT_DIR, 'book-1-pilot-candidates-v2-before-rerun.json'), `${JSON.stringify({
      schemaVersion: 2,
      distribution: 'development-only-candidate',
      publishable: false,
      source: 'book-1-pilot-candidates-v2.json',
      records: prior,
    }, null, 2)}\n`);
  }
  const priorByCharacter = new Map(prior.map((record) => [record.character, record]));
  const records: DraftRecord[] = [];
  let deterministicRendered = 0;
  let sceneApiCalls = 0;

  for (const plan of artifact.plans) {
    if (plan.frame.kind === 'none') {
      records.push({
        character: plan.character,
        planStatus: plan.status,
        candidate: null,
        validation: validationForNoHook(plan),
        attempts: 0,
        acceptance: 'no-useful-hook',
      });
      continue;
    }
    const benchmark = buildBenchmarkCandidate(plan);
    if (benchmark) {
      const validation = validateHookQualityDeterministically(plan, benchmark);
      records.push({
        character: plan.character,
        planStatus: plan.status,
        candidate: benchmark,
        validation,
        attempts: 0,
        acceptance: acceptance(plan, validation),
      });
      continue;
    }
    if (plan.frame.kind === 'formation' || plan.frame.kind === 'origin') {
      const rendered = renderDeterministicCandidate(plan);
      if (!rendered.candidate) {
        records.push({
          character: plan.character,
          planStatus: plan.status,
          candidate: null,
          validation: {
            character: plan.character,
            valid: false,
            issues: [{
              code: 'deterministic-render-failed',
              severity: 'error',
              message: rendered.error ?? 'Deterministic renderer returned no candidate.',
            }],
          },
          attempts: 0,
          // A missing bridge is a reviewable FormationFrame gap, not a NoHook.
          acceptance: 'needs-style-review',
        });
        continue;
      }
      deterministicRendered += 1;
      const validation = validateHookQualityDeterministically(plan, rendered.candidate);
      records.push({
        character: plan.character,
        planStatus: plan.status,
        candidate: rendered.candidate,
        validation,
        attempts: 0,
        acceptance: acceptance(plan, validation),
      });
      continue;
    }
    const previous = priorByCharacter.get(plan.character);
    if (!forceRegenerate && previous?.candidate) {
      const currentValidation = validateHookQualityDeterministically(plan, previous.candidate);
      const previousStyle = evaluateHookStylePreflight(plan, previous.candidate);
      if (currentValidation.valid && currentValidation.issues.length === 0 && previousStyle.issues.length === 0) {
        records.push({ ...previous, planStatus: plan.status, validation: currentValidation });
        continue;
      }
    }

    let candidate: MemoryHookCandidateV2 | null = null;
    let validation: DeterministicHookQualityResult | null = null;
    let styleIssues: string[] = [];
    let attempts = 0;
    const maxAttempts = retryInvalid || retrySceneStyle ? 3 : 1;
    do {
      attempts += 1;
      sceneApiCalls += 1;
      try {
        candidate = await generate(getProvider(), plan, [
          ...(validation?.issues.map((issue) => issue.message) ?? []),
          ...styleIssues,
        ]);
        validation = validateHookQualityDeterministically(plan, candidate);
        styleIssues = evaluateHookStylePreflight(plan, candidate).reasons;
      } catch (error: unknown) {
        candidate = null;
        validation = {
          character: plan.character,
          valid: false,
          issues: [{
            code: 'scene-generation-failed',
            severity: 'error',
            message: error instanceof Error ? error.message : String(error),
          }],
        };
        styleIssues = [];
      }
      const factualFailure = !validation.valid || validation.issues.length > 0;
      const styleFailure = styleIssues.length > 0;
      const retryRequested = (retryInvalid && factualFailure) || (retrySceneStyle && styleFailure);
      if (!retryRequested || attempts >= maxAttempts) break;
    } while (attempts < maxAttempts);

    if (!validation) throw new Error(`No validation result for ${plan.character}.`);
    records.push({
      character: plan.character,
      planStatus: plan.status,
      candidate,
      validation,
      attempts,
      acceptance: candidate
        ? acceptance(plan, validation, styleIssues.length)
        : 'needs-style-review',
    });
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const cleanCount = records.filter((record) => record.acceptance === 'draft-clean').length;
  const rejectedCount = records.filter((record) => record.acceptance === 'rejected').length;
  writeFileSync(CANDIDATE_PATH, `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    model: provider?.model ?? 'deterministic-only',
    promptVersion: PROMPT_VERSION,
    sourcePlan: 'book-1-pilot-quality-plans-v2.json',
    records,
  }, null, 2)}\n`);
  writeFileSync(VALIDATION_PATH, `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    model: provider?.model ?? 'deterministic-only',
    promptVersion: PROMPT_VERSION,
    records: records.map((record) => ({
      character: record.character,
      planStatus: record.planStatus,
      validation: record.validation,
      attempts: record.attempts,
      acceptance: record.acceptance,
    })),
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    provider: provider?.provider ?? 'deterministic-only',
    model: provider?.model ?? 'deterministic-only',
    promptVersion: PROMPT_VERSION,
    planCharacters: artifact.plans.length,
    apiCallsMade: records.reduce((sum, record) => sum + record.attempts, 0),
    sceneApiCalls,
    deterministicRendered,
    draftClean: cleanCount,
    rejected: rejectedCount,
    noUsefulHook: records.filter((record) => record.acceptance === 'no-useful-hook').length,
    publishable: false,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
