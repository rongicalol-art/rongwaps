import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CharacterHookPlanV2 } from '../../src/features/character-memory-hooks/model';
import type { HookRecord } from './strictHookAudit';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const DRAFTS_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-curated-drafts-v1.json');
const PLAN_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');
const CANDIDATE_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-candidates-v2.json');
const ARTIFACT_PATH = resolve(OUTPUT_DIR, 'book-1-hooks-v3.json');
const BACKUP_PATH = resolve(OUTPUT_DIR, 'book-1-hooks-v3.pre-v2-merge.json');
const PROMPT_VERSION = 'book-1-evaluation-batch-47-curated-drafts-v1';
const MODEL = 'curated-in-review-v1';
const REASON = 'Merged from the curated batch-47 evaluation drafts; deterministic validation and style preflight clean, no API calls.';

interface DraftRecord {
  character: string;
  hook: string;
}

interface CandidateRecord {
  character: string;
  acceptance: string;
  candidate: { hook: string | null } | null;
}

interface ShippedHookRecord extends HookRecord {
  targetDisplayLabel?: string | null;
  attempts?: number;
  model?: string | null;
  promptVersion?: string | null;
}

/** V2 hooks whose scene carries a pinyin sound cue ship with the v3 `sound` strategy. */
const SOUND_STRATEGY_CHARACTERS = new Set<string>([
  '得', '們', '該', '課', '渴', '親', '開', '新', '過', '哥', '近',
]);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main(): void {
  const drafts = readJson<{ publishable: boolean; distribution: string; drafts: DraftRecord[] }>(DRAFTS_PATH);
  if (drafts.publishable || drafts.distribution !== 'development-only-candidate') {
    throw new Error('Refusing curated drafts from a publishable or non-candidate artifact.');
  }
  const plans = readJson<{ plans: CharacterHookPlanV2[] }>(PLAN_PATH);
  const candidates = readJson<{ records: CandidateRecord[] }>(CANDIDATE_PATH);
  const artifact = readJson<{ records: ShippedHookRecord[] }>(ARTIFACT_PATH);
  const planByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));
  const candidateByCharacter = new Map(candidates.records.map((record) => [record.character, record]));
  const recordIndex = new Map(artifact.records.map((record, index) => [record.character, index]));

  if (!existsSync(BACKUP_PATH)) copyFileSync(ARTIFACT_PATH, BACKUP_PATH);

  const merged: Array<{ character: string; strategy: string }> = [];
  for (const draft of drafts.drafts) {
    const plan = planByCharacter.get(draft.character);
    if (!plan || plan.frame.kind !== 'scene') throw new Error(`Draft ${draft.character} has no scene plan.`);
    const candidate = candidateByCharacter.get(draft.character);
    const hook = candidate?.candidate?.hook;
    if (!candidate || candidate.acceptance !== 'draft-clean' || !hook) {
      throw new Error(`Draft ${draft.character} is not draft-clean in the candidates artifact.`);
    }
    const index = recordIndex.get(draft.character);
    if (index === undefined) throw new Error(`Shipped artifact has no record for ${draft.character}.`);
    const strategy = plan.frame.components.length === 0
      ? 'shape'
      : SOUND_STRATEGY_CHARACTERS.has(draft.character) ? 'sound' : 'scene';
    artifact.records[index] = {
      character: plan.character,
      meaning: plan.canonicalMeaning,
      meaningSource: 'evaluation-batch-47',
      pinyin: plan.canonicalPinyin,
      strategy,
      hook,
      targetDisplayLabel: plan.targetDisplayLabel,
      componentsUsed: plan.frame.components.flatMap((component) => (
        component.glyph && component.displayLabel
          ? [{ glyph: component.glyph, label: component.displayLabel }]
          : []
      )),
      parts: plan.frame.components.flatMap((component) => (
        component.glyph
          ? [{
              glyph: component.glyph,
              suggestedLabel: component.displayLabel,
              glosses: [],
              readings: [],
              aliases: [],
            }]
          : []
      )),
      reason: REASON,
      validation: { valid: true, issues: [] },
      attempts: 0,
      acceptance: 'clean',
      model: MODEL,
      promptVersion: PROMPT_VERSION,
    };
    merged.push({ character: plan.character, strategy });
  }

  const byStrategy = merged.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.strategy] = (counts[entry.strategy] ?? 0) + 1;
    return counts;
  }, {});

  writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({
    merged: merged.length,
    byStrategy,
    backup: BACKUP_PATH,
    artifact: ARTIFACT_PATH,
    publishable: false,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
