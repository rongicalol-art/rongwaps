import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  CharacterHookPlanV2,
  MemoryHookCandidateV2,
} from '../../src/features/character-memory-hooks/model';
import { evaluateHookStylePreflight } from './stylePreflight';
import { validateHookQualityDeterministically } from './qualityPlanner';

interface PlanArtifact {
  schemaVersion: 2;
  publishable: false;
  plans: CharacterHookPlanV2[];
}

interface CandidateRecord {
  character: string;
  candidate: MemoryHookCandidateV2 | null;
}

interface CandidateArtifact {
  schemaVersion: 2;
  publishable: false;
  records: CandidateRecord[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const ARTIFACT_STEM = process.env.MEMORY_HOOK_ARTIFACT_STEM || 'book-1-pilot';
const PLAN_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-quality-plans-v2.json`);
const CANDIDATE_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-candidates-v2.json`);
const OUTPUT_PATH = resolve(OUTPUT_DIR, `${ARTIFACT_STEM}-style-proposals-v2.json`);

const PROPOSED_HOOKS: Record<string, string> = {
  點: 'A 黑(black) mark claims one precise place—占(takes a spot)—and becomes a tiny 點(dot).',
  喝: '口(mouth) wonders “曷(what) is in the cup” and opens to 喝(drink).',
  吃: '口(mouth) has to 乞(beg) for food before it can 吃(eat).',
  休: '亻(person) rests against 木(tree)—that scene is 休(rest).',
  明: '日(sun) and 月(moon) fill the sky with light: 明(bright).',
  問: 'A 口(mouth) calls through a 門(door) to 問(ask a question).',
};

function main(): void {
  const plans = JSON.parse(readFileSync(PLAN_PATH, 'utf8')) as PlanArtifact;
  const candidates = JSON.parse(readFileSync(CANDIDATE_PATH, 'utf8')) as CandidateArtifact;
  if (plans.schemaVersion !== 2 || plans.publishable || candidates.schemaVersion !== 2 || candidates.publishable) {
    throw new Error('Refusing local style review for missing, non-V2, or publishable artifacts.');
  }
  const plansByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));
  const reviews = candidates.records.map((record) => {
    const plan = plansByCharacter.get(record.character);
    if (!plan) throw new Error(`Missing quality plan for ${record.character}.`);
    if (!record.candidate) {
      return {
        character: record.character,
        currentHook: null,
        issues: [],
        reasons: [],
        proposedHook: null,
        disposition: plan.frame.kind === 'none' ? 'no-useful-hook' : 'needs-review',
      };
    }
    if (plan.frame.kind === 'none') {
      return { character: record.character, currentHook: null, issues: [], reasons: [], proposedHook: null, disposition: 'no-useful-hook' };
    }
    if (plan.frame.kind !== 'scene') {
      return {
        character: record.character,
        currentHook: record.candidate.hook,
        issues: [],
        reasons: [],
        proposedHook: null,
        disposition: 'not-applicable',
      };
    }
    const local = evaluateHookStylePreflight(plan, record.candidate);
    const proposedHook = PROPOSED_HOOKS[record.character] ?? null;
    const proposed = proposedHook
      ? evaluateHookStylePreflight(plan, { ...record.candidate, hook: proposedHook })
      : null;
    const proposedCandidate = proposedHook ? { ...record.candidate, hook: proposedHook } : null;
    const proposedValidation = proposedCandidate
      ? validateHookQualityDeterministically(plan, proposedCandidate)
      : null;
    return {
      character: record.character,
      currentHook: record.candidate.hook,
      issues: local.issues,
      reasons: local.reasons,
      proposedHook,
      proposedIssues: proposed?.issues ?? [],
      proposedReasons: proposed?.reasons ?? [],
      proposedValidation: proposedValidation
        ? { valid: proposedValidation.valid, issues: proposedValidation.issues }
        : null,
      disposition: local.issues.length > 0 ? 'revise-before-next-generation' : 'keep-for-human-review',
    };
  });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schemaVersion: 2,
    distribution: 'development-only-candidate',
    publishable: false,
    sourceCandidates: 'book-1-pilot-candidates-v2.json',
    apiCallsMade: 0,
    reviews,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    charactersReviewed: reviews.length,
    reviseBeforeNextGeneration: reviews.filter((review) => review.disposition === 'revise-before-next-generation').length,
    keepForHumanReview: reviews.filter((review) => review.disposition === 'keep-for-human-review').length,
    noUsefulHook: reviews.filter((review) => review.disposition === 'no-useful-hook').length,
    notApplicable: reviews.filter((review) => review.disposition === 'not-applicable').length,
    needsReview: reviews.filter((review) => review.disposition === 'needs-review').length,
    apiCallsMade: 0,
    publishable: false,
  }, null, 2));
}

main();
