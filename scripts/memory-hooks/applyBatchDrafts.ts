import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CharacterHookPlanV2,
  DescribedPartUse,
  DeterministicHookQualityResult,
  MemoryHookCandidateV2,
} from '../../src/features/character-memory-hooks/model';
import { validateHookQualityDeterministically } from './qualityPlanner';
import { evaluateHookStylePreflight } from './stylePreflight';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const STEM = 'book-1-evaluation-batch-47';
const DRAFTS_PATH = resolve(OUTPUT_DIR, `${STEM}-curated-drafts-v1.json`);
const PLAN_PATH = resolve(OUTPUT_DIR, `${STEM}-quality-plans-v2.json`);
const CANDIDATE_PATH = resolve(OUTPUT_DIR, `${STEM}-candidates-v2.json`);
const VALIDATION_PATH = resolve(OUTPUT_DIR, `${STEM}-validation-v2.json`);
const PROMPT_VERSION = 'batch-47-curated-drafts-v1';

interface DraftRecord {
  character: string;
  hook: string;
  ahaConnection: string;
  describedParts?: DescribedPartUse[];
}

interface DraftArtifact {
  schemaVersion: 1;
  distribution: 'development-only-candidate';
  publishable: false;
  drafts: DraftRecord[];
}

interface CandidateRecord {
  character: string;
  planStatus: CharacterHookPlanV2['status'];
  candidate: MemoryHookCandidateV2 | null;
  validation: DeterministicHookQualityResult | null;
  attempts: number;
  acceptance: 'draft-clean' | 'needs-style-review' | 'rejected' | 'no-useful-hook';
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function buildDraftCandidate(plan: CharacterHookPlanV2, draft: DraftRecord): MemoryHookCandidateV2 {
  if (plan.frame.kind !== 'scene') throw new Error(`Draft target ${plan.character} is not a scene plan.`);
  return {
    character: plan.character,
    frameKind: 'scene',
    canonicalMeaning: plan.canonicalMeaning ?? '',
    hook: draft.hook,
    componentOccurrenceRefs: plan.frame.components.flatMap((component) => component.occurrenceIds),
    describedParts: draft.describedParts ?? [],
    mnemonicProps: [],
    ahaConnection: draft.ahaConnection,
    evidenceRefs: plan.frame.components.flatMap((component) => component.evidenceRefs),
  };
}

export function acceptanceFor(
  validation: DeterministicHookQualityResult,
  styleIssueCount: number,
): CandidateRecord['acceptance'] {
  if (!validation.valid) return 'rejected';
  if (validation.issues.length > 0 || styleIssueCount > 0) return 'needs-style-review';
  return 'draft-clean';
}

function main(): void {
  const drafts = readJson<DraftArtifact>(DRAFTS_PATH);
  if (drafts.publishable || drafts.distribution !== 'development-only-candidate') {
    throw new Error('Refusing curated drafts from a publishable or non-candidate artifact.');
  }
  const plans = readJson<{ plans: CharacterHookPlanV2[] }>(PLAN_PATH);
  const candidates = readJson<{ records: CandidateRecord[] }>(CANDIDATE_PATH);
  const validations = readJson<{ records: Array<{ character: string }> }>(VALIDATION_PATH);
  const planByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));
  const recordIndex = new Map(candidates.records.map((record, index) => [record.character, index]));

  if (!existsSync(resolve(OUTPUT_DIR, `${STEM}-candidates-v2.pre-curated.json`))) {
    copyFileSync(CANDIDATE_PATH, resolve(OUTPUT_DIR, `${STEM}-candidates-v2.pre-curated.json`));
    copyFileSync(VALIDATION_PATH, resolve(OUTPUT_DIR, `${STEM}-validation-v2.pre-curated.json`));
  }

  const summary: Array<{ character: string; acceptance: CandidateRecord['acceptance']; issues: string[] }> = [];
  for (const draft of drafts.drafts) {
    const plan = planByCharacter.get(draft.character);
    if (!plan) throw new Error(`Draft character ${draft.character} has no quality plan.`);
    const candidate = buildDraftCandidate(plan, draft);
    const validation = validateHookQualityDeterministically(plan, candidate);
    const style = evaluateHookStylePreflight(plan, candidate);
    const acceptance = acceptanceFor(validation, style.issues.length);
    const record: CandidateRecord = {
      character: plan.character,
      planStatus: plan.status,
      candidate,
      validation,
      attempts: 0,
      acceptance,
    };
    const index = recordIndex.get(plan.character);
    if (index === undefined) {
      recordIndex.set(plan.character, candidates.records.length);
      candidates.records.push(record);
    } else {
      candidates.records[index] = record;
    }
    summary.push({
      character: plan.character,
      acceptance,
      issues: [
        ...validation.issues.map((issue) => issue.code),
        ...style.issues.map((issue) => `style:${issue}`),
      ],
    });
  }

  const acceptedByCharacter = new Map(candidates.records.map((record) => [record.character, record]));
  writeFileSync(CANDIDATE_PATH, `${JSON.stringify({
    ...candidates,
    promptVersion: PROMPT_VERSION,
    sourcePlan: 'book-1-evaluation-batch-47-quality-plans-v2.json',
  }, null, 2)}\n`);
  writeFileSync(VALIDATION_PATH, `${JSON.stringify({
    ...validations,
    promptVersion: PROMPT_VERSION,
    records: candidates.records.map((record) => ({
      character: record.character,
      planStatus: record.planStatus,
      validation: record.validation,
      attempts: record.attempts,
      acceptance: record.acceptance,
    })),
  }, null, 2)}\n`);

  const acceptanceCounts = candidates.records.reduce<Record<string, number>>((counts, record) => {
    counts[record.acceptance] = (counts[record.acceptance] ?? 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({
    curated: summary.length,
    summary,
    acceptanceCounts,
    records: acceptedByCharacter.size,
    publishable: false,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
