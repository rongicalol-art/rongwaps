import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CharacterHookPlanV2 } from '../../src/features/character-memory-hooks/model';
import type { HookRecord } from './strictHookAudit';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const ARTIFACT_PATH = resolve(OUTPUT_DIR, 'book-1-hooks-v3.json');
const BACKUP_PATH = resolve(OUTPUT_DIR, 'book-1-hooks-v3.pre-v2-merge.json');
const DEFAULT_STEM = 'book-1-evaluation-batch-47';
const MODEL = 'curated-in-review-v1';

/** `--batch <stem>` selects a V2 rollout batch; without it the batch-47 artifacts are used. */
function batchStem(): string {
  const args = process.argv.slice(2);
  const index = args.indexOf('--batch');
  const stem = index > -1 ? args[index + 1] : DEFAULT_STEM;
  if (!stem || !stem.startsWith('book-1-')) throw new Error('--batch requires a book-1-* file stem.');
  return stem;
}

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

/** Hooks that carry a tone-marked pinyin sound cue ship with the v3 `sound` strategy. */
const SOUND_CUE = /(^|[^A-Za-z])[A-Za-zü]+[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main(): void {
  const stem = batchStem();
  const draftsPath = resolve(OUTPUT_DIR, `${stem}-curated-drafts-v1.json`);
  const planPath = resolve(OUTPUT_DIR, `${stem}-quality-plans-v2.json`);
  const candidatePath = resolve(OUTPUT_DIR, `${stem}-candidates-v2.json`);
  const promptVersion = `${stem}-curated-drafts-v1`;
  const reason = `Merged from the curated ${stem} drafts; deterministic validation and style preflight clean, no API calls.`;

  const drafts = readJson<{ publishable: boolean; distribution: string; drafts: DraftRecord[] }>(draftsPath);
  if (drafts.publishable || drafts.distribution !== 'development-only-candidate') {
    throw new Error('Refusing curated drafts from a publishable or non-candidate artifact.');
  }
  const plans = readJson<{ plans: CharacterHookPlanV2[] }>(planPath);
  const candidates = readJson<{ records: CandidateRecord[] }>(candidatePath);
  const artifact = readJson<{ records: ShippedHookRecord[] }>(ARTIFACT_PATH);
  const planByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));
  const candidateByCharacter = new Map(candidates.records.map((record) => [record.character, record]));
  const recordIndex = new Map(artifact.records.map((record, index) => [record.character, index]));

  if (!existsSync(BACKUP_PATH)) copyFileSync(ARTIFACT_PATH, BACKUP_PATH);

  // The original v3 parts carry sanctioned glyph aliases (e.g. 𠂒 for 儿). Keep
  // them on the merged records so coverage can resolve aliased runtime parts.
  const aliasByCharacterGlyph = new Map<string, string[]>();
  {
    const backup = readJson<{ records: ShippedHookRecord[] }>(BACKUP_PATH);
    for (const record of backup.records) {
      for (const part of record.parts ?? []) {
        if (part.glyph && part.aliases?.length) {
          aliasByCharacterGlyph.set(`${record.character}:${part.glyph}`, part.aliases);
        }
      }
    }
  }

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
      : SOUND_CUE.test(hook) ? 'sound' : 'scene';
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
              aliases: aliasByCharacterGlyph.get(`${plan.character}:${component.glyph}`) ?? [],
            }]
          : []
      )),
      reason,
      validation: { valid: true, issues: [] },
      attempts: 0,
      acceptance: 'clean',
      model: MODEL,
      promptVersion,
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
