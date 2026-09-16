import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CharacterHookPlanV2, DescribedPartUse, MemoryHookCandidateV2 } from '../../src/features/character-memory-hooks/model';
import { validateHookQualityDeterministically } from './qualityPlanner';
import { evaluateHookStylePreflight } from './stylePreflight';
import { auditSingleHook } from './strictHookAudit';
import { BUNDLED_EXTRA_GLYPHS } from './checkHookQuality';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const DEFAULT_STEM = 'book-1-evaluation-batch-47';

/** Mirrors the shipped-pack test's banned vague phonetic phrasing. */
const VAGUE_PHRASE = /\b(sounds like|just sounds like|even sounds like|echoes the sound of|echoes|puffs the sound|is only a sound cue|lending its cool sound)\b/i;
const JARGON = /\b(sentence-final|particle|measure word|counter for|classifier for|possessive particle|modal particle|pronoun|grammatical)\b/i;

interface DraftRecord {
  character: string;
  hook: string;
  ahaConnection: string;
  describedParts?: DescribedPartUse[];
}

function main(): void {
  const args = process.argv.slice(2);
  const index = args.indexOf('--batch');
  const stem = index > -1 ? args[index + 1] : DEFAULT_STEM;
  if (!stem || !stem.startsWith('book-1-')) throw new Error('--batch requires a book-1-* file stem.');

  const plans = JSON.parse(readFileSync(resolve(OUTPUT_DIR, `${stem}-quality-plans-v2.json`), 'utf8')) as { plans: CharacterHookPlanV2[] };
  const drafts = JSON.parse(readFileSync(resolve(OUTPUT_DIR, `${stem}-curated-drafts-v1.json`), 'utf8')) as { drafts: DraftRecord[] };
  const planByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));

  let clean = 0;
  const dirty: string[] = [];
  for (const draft of drafts.drafts) {
    const plan = planByCharacter.get(draft.character);
    if (!plan || plan.frame.kind !== 'scene') throw new Error(`Draft ${draft.character} has no scene plan.`);
    const candidate: MemoryHookCandidateV2 = {
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
    const validation = validateHookQualityDeterministically(plan, candidate);
    const style = evaluateHookStylePreflight(plan, candidate);
    const prose = auditSingleHook({
      character: plan.character,
      meaning: plan.canonicalMeaning,
      hook: draft.hook,
      targetDisplayLabel: plan.targetDisplayLabel,
    });
    const stripped = draft.hook.split(`${plan.character}(${plan.targetDisplayLabel})`).join('');
    const extras: string[] = [];
    if (VAGUE_PHRASE.test(draft.hook)) extras.push('vague-phrase');
    if (JARGON.test(stripped)) extras.push('jargon-outside-target');
    if ([...draft.hook].some((character) => character.codePointAt(0)! > 0xffff && !BUNDLED_EXTRA_GLYPHS.has(character))) {
      extras.push('non-bmp');
    }
    if (draft.hook.length < 55) extras.push('under-55-chars');
    const ok = validation.valid && validation.issues.length === 0 && style.issues.length === 0 && prose.length === 0 && extras.length === 0;
    if (ok) {
      clean += 1;
      continue;
    }
    dirty.push(draft.character);
    for (const issue of validation.issues) console.log(`  [${draft.character} v] ${issue.severity} ${issue.code} ${issue.message}`);
    for (const issue of style.issues) console.log(`  [${draft.character} s] ${issue} — ${style.reasons.filter((reason) => reason.toLowerCase().includes(issue)).join('; ')}`);
    for (const finding of prose) console.log(`  [${draft.character} a] ${finding.code} ${finding.detail}`);
    for (const extra of extras) console.log(`  [${draft.character} x] ${extra}`);
    console.log(`  [${draft.character} hook] ${draft.hook}`);
  }
  console.log(`clean: ${clean}/${drafts.drafts.length}`);
  console.log(dirty.length ? `DIRTY: ${dirty.join(' ')}` : 'ALL CLEAN');
  if (dirty.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
