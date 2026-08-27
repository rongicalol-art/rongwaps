import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import type {
  CharacterHookPlanV2,
  HookStyleIssue,
  HookStyleReview,
  MemoryHookCandidateV2,
} from '../../src/features/character-memory-hooks/model';
import type { DeterministicHookQualityResult } from '../../src/features/character-memory-hooks/model';
import { evaluateHookStylePreflight } from './stylePreflight';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
dotenv.config({
  path: resolve(import.meta.dirname, '../../.env.memory-hooks.local'),
  quiet: true,
  override: true,
});

interface ProviderConfig {
  provider: 'deepseek' | 'openrouter';
  url: string;
  apiKey: string;
  model: string;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface PlanArtifact {
  schemaVersion: 2;
  publishable: false;
  plans: CharacterHookPlanV2[];
}

interface CandidateRecord {
  character: string;
  candidate: MemoryHookCandidateV2 | null;
  validation: DeterministicHookQualityResult | null;
  acceptance: string;
}

interface CandidateArtifact {
  schemaVersion: 2;
  publishable: false;
  records: CandidateRecord[];
}

interface CriticRecord {
  character: string;
  deterministicValid: boolean;
  deterministicIssues: DeterministicHookQualityResult['issues'];
  style: HookStyleReview | null;
  acceptance: 'style-clean' | 'style-review' | 'deterministic-reject' | 'no-useful-hook' | 'not-applicable';
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const ARTIFACT_STEM = process.env.MEMORY_HOOK_ARTIFACT_STEM || 'book-1-pilot';
const PLAN_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-quality-plans-v2.json`);
const CANDIDATE_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-candidates-v2.json`);
const OUTPUT_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-style-reviews-v2.json`);
const PROMPT_VERSION = 'book1-style-critic-v1';
const STYLE_ISSUES: HookStyleIssue[] = [
  'awkward',
  'vague',
  'tautological',
  'component-list-only',
  'phonetic-literal-prop',
  'unsupported-relationship',
  'unhelpful-label',
];

function requireExecutionApproval(): void {
  const flags = new Set(process.argv.slice(2));
  if (!flags.has('--execute') || !flags.has('--pilot-approved')) {
    throw new Error('Refusing API calls. Re-run with --execute --pilot-approved after reviewing the V2 pilot drafts.');
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

function parseReview(content: string, plan: CharacterHookPlanV2): HookStyleReview {
  const unwrapped = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(unwrapped) as Record<string, unknown>;
  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.filter((issue): issue is HookStyleIssue => STYLE_ISSUES.includes(issue as HookStyleIssue))
    : [];
  const rawConnectionType = typeof parsed.connectionType === 'string' ? parsed.connectionType.toLowerCase() : '';
  const connectionType = rawConnectionType === 'concrete-scene' || rawConnectionType === 'concrete_scene' || rawConnectionType === 'scene'
    ? 'concrete-scene'
    : rawConnectionType === 'supported-formation' || rawConnectionType === 'supported_formation' || rawConnectionType === 'formation'
      ? 'supported-formation'
      : 'none';
  const culturallyNeutral = parsed.culturallyNeutral === true;
  const accepted = parsed.accepted === true && connectionType !== 'none' && issues.length === 0 && culturallyNeutral;
  return {
    connectionType,
    ahaConnection: typeof parsed.ahaConnection === 'string' ? parsed.ahaConnection : null,
    issues,
    culturallyNeutral,
    accepted,
  };
}

function buildPrompt(plan: CharacterHookPlanV2, candidate: MemoryHookCandidateV2): string {
  if (plan.frame.kind !== 'scene') throw new Error(`Only scene candidates may use the style critic: ${plan.character}`);
  return JSON.stringify({
    task: 'Critique the style of one Chinese-character memory hook. Do not rewrite it.',
    immutablePlan: {
      character: plan.character,
      canonicalMeaning: plan.canonicalMeaning,
      targetToken: `${plan.character}(${plan.targetDisplayLabel})`,
      frameKind: plan.frame.kind,
      components: plan.frame.components.map((component) => ({
        token: `${component.glyph}(${component.displayLabel})`,
        role: component.role,
        labelBasis: component.labelBasis,
      })),
      sceneGuidance: plan.frame.kind === 'scene' ? plan.frame.sceneGuidance : null,
      requiredMnemonicProps: plan.frame.kind === 'scene' ? plan.frame.requiredMnemonicProps ?? [] : [],
    },
    candidate,
    rules: [
      'Return JSON only with connectionType, ahaConnection, issues, culturallyNeutral, and accepted.',
      'connectionType must be exactly one of: concrete-scene, supported-formation, none.',
      'You are a style critic, not a fact checker. Do not add evidence, change roles, or decide whether a source is true.',
      'Accept only one clear aha connection grounded in the immutable plan; reject A + B = C restatements and logic-puzzle wording.',
      'Read the hook aloud mentally. Reject awkward subject/verb constructions around glyph(label) tokens, template openings, filler, and prose that sounds like a generated formula.',
      'For a scene, require one vivid causal or spatial action that naturally leads to the target; do not accept a question-answer puzzle as the aha.',
      'Flag awkward, vague, tautological, component-list-only, phonetic-literal-prop, unsupported-relationship, or unhelpful-label style problems.',
      'The exact supplied glyph(label) tokens should be visible and natural, not reversed, front-loaded awkwardly, or hidden behind English-only wording.',
      'Scene props must be clearly mnemonic props and must not be presented as component meanings.',
      'A target-scoped visual label is acceptable only in the context of this target.',
      'Keep the hook concise: one sentence, one aha, and no filler such as “in a scene,” “together form,” or “recall.”',
      'Use style patterns as evaluation criteria only; do not expect or request any prewritten hook wording.',
      'Keep culturallyNeutral true only for a neutral learner-facing explanation.',
      'The benchmarks 休, 明, and 問 represent the desired concise, concrete tone.',
    ],
  });
}

async function critique(provider: ProviderConfig, plan: CharacterHookPlanV2, candidate: MemoryHookCandidateV2): Promise<HookStyleReview> {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      max_tokens: 220,
      ...(provider.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return a conservative style review as valid JSON only.' },
        { role: 'user', content: buildPrompt(plan, candidate) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Style critic failed with HTTP ${response.status}.`);
  const payload = await response.json() as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Style critic returned empty content.');
  return parseReview(content, plan);
}

async function main(): Promise<void> {
  requireExecutionApproval();
  const provider = resolveProvider();
  const plans = JSON.parse(readFileSync(PLAN_PATH, 'utf8')) as PlanArtifact;
  const candidates = JSON.parse(readFileSync(CANDIDATE_PATH, 'utf8')) as CandidateArtifact;
  if (plans.schemaVersion !== 2 || plans.publishable || candidates.schemaVersion !== 2 || candidates.publishable) {
    throw new Error('Refusing style review for missing, non-V2, or publishable artifacts.');
  }
  const plansByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));
  const reviews: CriticRecord[] = [];
  for (const record of candidates.records) {
    const plan = plansByCharacter.get(record.character);
    if (!plan) throw new Error(`Missing quality plan for ${record.character}.`);
    if (!record.candidate || plan.frame.kind === 'none') {
      reviews.push({
        character: record.character,
        deterministicValid: false,
        deterministicIssues: record.validation?.issues ?? [],
        style: null,
        acceptance: plan.frame.kind === 'none'
          ? 'no-useful-hook'
          : plan.frame.kind === 'scene'
            ? 'style-review'
            : 'not-applicable',
      });
      continue;
    }
    if (plan.frame.kind !== 'scene') {
      reviews.push({
        character: record.character,
        deterministicValid: record.validation?.valid ?? false,
        deterministicIssues: record.validation?.issues ?? [],
        style: null,
        acceptance: record.validation?.valid ? 'not-applicable' : 'deterministic-reject',
      });
      continue;
    }
    if (plan.frame.kind === 'scene' && plan.frame.benchmarkHook === record.candidate.hook) {
      reviews.push({
        character: record.character,
        deterministicValid: record.validation?.valid ?? false,
        deterministicIssues: record.validation?.issues ?? [],
        style: {
          connectionType: 'concrete-scene',
          ahaConnection: plan.frame.benchmarkAhaConnection ?? plan.frame.sceneGuidance,
          issues: [],
          culturallyNeutral: true,
          accepted: record.validation?.valid === true,
        },
        acceptance: record.validation?.valid ? 'style-clean' : 'deterministic-reject',
      });
      continue;
    }
    const preflight = evaluateHookStylePreflight(plan, record.candidate);
    if (preflight.issues.length > 0) {
      reviews.push({
        character: record.character,
        deterministicValid: record.validation?.valid ?? false,
        deterministicIssues: record.validation?.issues ?? [],
        style: {
          connectionType: plan.frame.kind === 'scene' ? 'concrete-scene' : 'supported-formation',
          ahaConnection: record.candidate.ahaConnection || null,
          issues: preflight.issues,
          culturallyNeutral: true,
          accepted: false,
        },
        acceptance: 'style-review',
      });
      continue;
    }
    if (!record.validation?.valid) {
      reviews.push({
        character: record.character,
        deterministicValid: false,
        deterministicIssues: record.validation?.issues ?? [],
        style: null,
        acceptance: 'deterministic-reject',
      });
      continue;
    }
    const style = await critique(provider, plan, record.candidate);
    reviews.push({
      character: record.character,
      deterministicValid: true,
      deterministicIssues: record.validation.issues,
      style,
      acceptance: style.accepted && record.validation.issues.length === 0 ? 'style-clean' : 'style-review',
    });
  }

  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    model: provider.model,
    promptVersion: PROMPT_VERSION,
    candidateSource: 'book-1-pilot-candidates-v2.json',
    reviews,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    provider: provider.provider,
    model: provider.model,
    promptVersion: PROMPT_VERSION,
    reviewed: reviews.filter((review) => review.style !== null).length,
    styleClean: reviews.filter((review) => review.acceptance === 'style-clean').length,
    styleReview: reviews.filter((review) => review.acceptance === 'style-review').length,
    deterministicReject: reviews.filter((review) => review.acceptance === 'deterministic-reject').length,
    noUsefulHook: reviews.filter((review) => review.acceptance === 'no-useful-hook').length,
    notApplicable: reviews.filter((review) => review.acceptance === 'not-applicable').length,
    publishable: false,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
