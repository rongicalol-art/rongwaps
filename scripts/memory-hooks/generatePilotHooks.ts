import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import type {
  CharacterMemoryHookPlan,
  GeneratedMemoryHookCandidate,
  MemoryHookValidationResult,
} from '../../src/features/character-memory-hooks/model';
import { validateGeneratedCandidate } from './pipeline';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
dotenv.config({
  path: resolve(import.meta.dirname, '../../.env.memory-hooks.local'),
  quiet: true,
  override: true,
});

interface PilotArtifact {
  entries: Array<{ character: string; plan: CharacterMemoryHookPlan }>;
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

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROMPT_VERSION = 'book1-pilot-v1';

function requireExecutionApproval(): void {
  const flags = new Set(process.argv.slice(2));
  if (!flags.has('--execute') || !flags.has('--pilot-approved')) {
    throw new Error('Refusing API calls. Re-run with --execute --pilot-approved only after the 30-character set is approved.');
  }
}

function resolveProvider(): ProviderConfig {
  const directKey = process.env.DEEPSEEK_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const preferredProvider = process.env.MEMORY_HOOK_PROVIDER;
  if (preferredProvider && preferredProvider !== 'deepseek' && preferredProvider !== 'openrouter') {
    throw new Error('MEMORY_HOOK_PROVIDER must be deepseek or openrouter.');
  }
  if (directKey && openRouterKey) {
    if (!preferredProvider) {
      throw new Error('Both direct DeepSeek and OpenRouter are configured; choose MEMORY_HOOK_PROVIDER before API calls.');
    }
    if (preferredProvider === 'deepseek') {
      return {
        provider: 'deepseek',
        url: 'https://api.deepseek.com/chat/completions',
        apiKey: directKey,
        model: process.env.MEMORY_HOOK_MODEL || 'deepseek-v4-flash',
      };
    }
    return {
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: openRouterKey,
      model: process.env.MEMORY_HOOK_MODEL || 'deepseek/deepseek-v4-flash',
    };
  }
  if (directKey) {
    if (preferredProvider && preferredProvider !== 'deepseek') {
      throw new Error('MEMORY_HOOK_PROVIDER conflicts with the configured DeepSeek key.');
    }
    return {
      provider: 'deepseek',
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: directKey,
      model: process.env.MEMORY_HOOK_MODEL || 'deepseek-v4-flash',
    };
  }
  if (openRouterKey) {
    if (preferredProvider && preferredProvider !== 'openrouter') {
      throw new Error('MEMORY_HOOK_PROVIDER conflicts with the configured OpenRouter key.');
    }
    return {
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: openRouterKey,
      model: process.env.MEMORY_HOOK_MODEL || 'deepseek/deepseek-v4-flash',
    };
  }
  throw new Error('No DEEPSEEK_API_KEY or OPENROUTER_API_KEY is configured.');
}

function buildPrompt(plan: CharacterMemoryHookPlan): string {
  const components = plan.components.map((component) => ({
    key: component.key,
    glyph: component.glyph,
    label: component.label,
    role: component.role,
    roleEvidenceRefs: component.roleEvidenceRefs,
  }));
  const requiredComponentTokens = plan.components.map((component) => `${component.glyph}(${component.label})`);
  const requiredComponentRefs = plan.components.map((component) => component.key);
  return JSON.stringify({
    task: 'Write one concise learner-facing Chinese character memory hook as JSON.',
    rules: [
      'Use only the supplied character, canonical meaning, and components.',
      'Include the canonical meaning verbatim in the hook text.',
      'Render every component exactly as glyph(label), for example 斤(axe).',
      'Copy requiredComponentTokens verbatim into the hook; do not reverse them to label(glyph) or add spaces inside them.',
      'Return componentRefs exactly equal to requiredComponentRefs; refs are keys such as g:斤, never display tokens.',
      'When a component role is unclassified, do not call it semantic, phonetic, sound, or meaning-bearing.',
      'A memory-aid is an invented association. Never use historical or origin language.',
      'For an origin hook, state only the supplied originClaim and do not add historical details.',
      'Use at most two natural sentences.',
      'Return JSON only with character, kind, canonicalMeaning, hook, componentRefs, evidenceRefs.',
    ],
    character: plan.character,
    kind: plan.proposedKind,
    canonicalMeaning: plan.meaningDecision.selectedMeaning,
    components,
    requiredComponentTokens,
    requiredComponentRefs,
    originClaim: plan.originClaim,
    evidenceRefs: plan.evidenceRefs,
  });
}

async function generate(
  provider: ProviderConfig,
  plan: CharacterMemoryHookPlan,
): Promise<GeneratedMemoryHookCandidate> {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      ...(provider.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Follow the supplied facts exactly and return valid JSON.' },
        { role: 'user', content: buildPrompt(plan) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Hook generation failed with HTTP ${response.status}.`);
  const payload = await response.json() as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Hook generation returned empty content.');
  const parsed = JSON.parse(content) as Omit<GeneratedMemoryHookCandidate, 'model' | 'promptVersion'>;
  return { ...parsed, model: provider.model, promptVersion: PROMPT_VERSION };
}

async function main(): Promise<void> {
  requireExecutionApproval();
  const provider = resolveProvider();
  const pilot = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-pilot-selection.json'), 'utf8'),
  ) as PilotArtifact;
  const candidatePath = resolve(OUTPUT_DIR, 'book-1-pilot-candidates.json');
  const retryInvalid = process.argv.includes('--retry-invalid');
  const priorCandidates = retryInvalid && existsSync(candidatePath)
    ? (JSON.parse(readFileSync(candidatePath, 'utf8')) as { candidates?: GeneratedMemoryHookCandidate[] }).candidates ?? []
    : [];
  const priorByCharacter = new Map(priorCandidates.map((candidate) => [candidate.character, candidate]));
  const candidates: GeneratedMemoryHookCandidate[] = [];
  const validations: MemoryHookValidationResult[] = [];
  for (const { plan } of pilot.entries) {
    if (plan.status !== 'eligible') {
      validations.push({
        character: plan.character,
        valid: false,
        issues: [{ code: 'plan-not-eligible', message: plan.blockers.join(', ') }],
      });
      continue;
    }
    const prior = priorByCharacter.get(plan.character);
    if (prior && validateGeneratedCandidate(plan, prior).valid) {
      candidates.push(prior);
      validations.push(validateGeneratedCandidate(plan, prior));
      continue;
    }
    const candidate = await generate(provider, plan);
    candidates.push(candidate);
    validations.push(validateGeneratedCandidate(plan, candidate));
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(candidatePath, `${JSON.stringify({
    schemaVersion: 1,
    model: provider.model,
    promptVersion: PROMPT_VERSION,
    publishable: false,
    candidates,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-pilot-validation.json'), `${JSON.stringify({
    schemaVersion: 1,
    publishable: false,
    validations,
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
