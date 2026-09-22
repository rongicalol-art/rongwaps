/**
 * Jev review of character hooks under the meaning-only rubric.
 *
 * One request per hook; all questions for that hook are batched into the call.
 * Jev judges only: label honesty, scene retellability, prop grounding,
 * memorability, and the phonetic piece for the Sound block. Code composes
 * verdicts later (composeCharTriage.ts).
 *
 * Modes:
 *   --gold        run on output/memory-hooks/review/gold-set-v1.json
 *   --all         run on all 656 hooks from book-1-hooks-v3.json
 *   --characters  comma-separated characters to review
 *
 * Options:
 *   --concurrency N   parallel requests (default 4)
 *   --thresholds P    thresholds JSON (default review/typesafe-thresholds-v1.json)
 *   --dry             print the first request state without calling Jev
 *
 * Raw answers append to output/memory-hooks/review/char-typesafe-raw-v1.json
 * (gold runs write char-typesafe-gold-raw-v1.json). Reruns resume by skipping
 * characters already present.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { choice, noul, score } from '@typesafe-ai/sdk';
import { askJev, JEV_DEFAULT_MODEL } from './typesafeClient';
import { findSoundLanguage } from './reviewRubric';
import { stripSoundClauses } from './stripSoundClauses';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

export interface V3Record {
  character: string;
  hook: string;
  meaning: string;
  pinyin: string;
  targetDisplayLabel?: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
}

export interface LedgerEntry {
  glyph: string;
  senses: Array<{ label: string; source: string }>;
  readings: string[];
}

interface ReviewItem {
  character: string;
  meaning: string;
  hook: string;
  bucket?: string;
  userLabel?: string | null;
}

export interface Thresholds {
  labelsHonest: number;
  scenePresent: number;
  partsMeaningful: number;
  memorability: number;
}

const DEFAULT_THRESHOLDS: Thresholds = {
  labelsHonest: 0.45,
  scenePresent: 0.7,
  partsMeaningful: 0.3,
  memorability: 1.8,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    gold: args.includes('--gold'),
    all: args.includes('--all'),
    analyze: args.includes('--analyze'),
    dry: args.includes('--dry'),
    characters: value('--characters')?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? null,
    concurrency: Number(value('--concurrency') ?? 4),
    thresholdsPath: value('--thresholds') ?? resolve(REVIEW_DIR, 'typesafe-thresholds-v1.json'),
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function pinyinShape(pinyin: string | null | undefined): { initial: string; final: string } {
  const cleaned = (pinyin ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = cleaned.match(/^([zcs]h|[bpmfdtnlgkhjqxrzcsyw])?(.*)$/);
  return { initial: match?.[1] ?? '', final: match?.[2] ?? cleaned };
}

function isPhoneticCandidate(component: LedgerEntry, targetPinyin: string | null | undefined): boolean {
  const target = pinyinShape(targetPinyin);
  return component.readings.some((reading) => {
    const candidate = pinyinShape(reading);
    return candidate.final === target.final && candidate.final.length > 0;
  });
}

/** Keeps the label list short and clean: dictionary noise distracts Jev. */
function summarizeSenses(labels: Array<string | null | undefined>): string[] {
  return labels
    .map((label) => String(label ?? '').trim())
    .filter((label) => !/classifier|surname|radical in|variant of|way to do|loanword|internet slang/i.test(label))
    .map((label) => label.replace(/^"|"$/g, '').trim())
    .filter((label) => label.length > 0 && label.length <= 40)
    .slice(0, 5);
}

export function buildStateForHook(record: V3Record, ledgerByGlyph: Map<string, LedgerEntry>, hook: string) {
  const breakdown = record.componentsUsed.map((component) => {
    const entry = ledgerByGlyph.get(component.glyph);
    return {
      glyph: component.glyph,
      label_in_hook: component.label ?? '',
      ledger_senses: summarizeSenses(entry?.senses.map((sense) => sense.label) ?? []),
      ledger_readings: (entry?.readings ?? []).slice(0, 3),
      phonetic_candidate: entry ? isPhoneticCandidate(entry, record.pinyin) : false,
    };
  });
  return {
    target: { character: record.character, pinyin: record.pinyin ?? '', meaning: record.meaning },
    breakdown,
    hook,
  };
}

function buildState(record: V3Record, ledgerByGlyph: Map<string, LedgerEntry>) {
  const stripped = stripSoundClauses(record.hook);
  const needsRewrite = stripped.needsRewrite || findSoundLanguage(stripped.hook).length > 0;
  return {
    ...buildStateForHook(record, ledgerByGlyph, stripped.hook),
    sound_stripped: stripped.changed,
    needs_rewrite: needsRewrite,
  };
}

export function buildQuestions(state: ReturnType<typeof buildStateForHook>) {
  const glyphOptions = Object.fromEntries([
    ['none', 'No component in `breakdown` carries the sound of `target.character`.'],
    ...state.breakdown.map((component) => [
      component.glyph,
      `${component.glyph} carries the sound of the target.`,
    ]),
  ]);
  const labelQuestions = Object.fromEntries(state.breakdown.map((component, index) => {
    const hasListed = component.ledger_senses.length + component.ledger_readings.length > 0;
    const instructions = hasListed
      ? `In \`hook\`, is \`breakdown[${index}].glyph\` used with one of its listed meanings or readings — and not with a different, invented meaning?`
      : `In \`hook\`, does \`breakdown[${index}].glyph\` appear only as a plainly visible shape or an explicitly marked reading, without claiming a specific meaning for it?`;
    const criteria = hasListed
      ? {
          true: 'The glyph is used with one of its listed meanings or readings.',
          false: 'The hook gives the glyph a meaning that is not in the list.',
        }
      : {
          true: 'The glyph is described only by its visible shape or an explicit reading.',
          false: 'The hook claims a specific meaning for the glyph although none is listed.',
        };
    return [`label_grounded_${index}`, noul(instructions, criteria)];
  }));
  return {
    ...labelQuestions,
    scene_present: noul(
      'Does `hook` describe a concrete event or action, rather than only stating what each part means?',
      {
        true: 'A concrete event or action happens in the hook.',
        false: 'The hook only states what the parts are or what the target means.',
      },
    ),
    parts_meaningful: noul(
      'Do the glyphs in `breakdown` play meaningful roles in the event described by `hook`, such that removing any one of them would weaken the scene?',
      {
        true: 'Every listed glyph carries part of the scene.',
        false: 'A listed glyph is decorative or missing from the scene.',
      },
    ),
    memorability: score(
      'How well does `hook` work as a memory device for `target.meaning`?',
      [
        'Incoherent, or contradicts the breakdown.',
        'Declares the parts-meaning relation without a real scene.',
        'Plain but real scene a learner can retell.',
        'Vivid concrete action that lands the meaning.',
      ],
    ),
    phonetic_component: choice(
      'Which glyph in `breakdown` contributes the sound of `target.character`, if any?',
      glyphOptions,
    ),
  };
}

export type RawAnswers = Record<string, unknown>;

interface RawItem {
  character: string;
  bucket?: string;
  userLabel?: string | null;
  state?: unknown;
  answers: RawAnswers;
  resolvedModel?: string;
  usage?: unknown;
  at?: string;
}

function readRaw(path: string): { items: RawItem[] } {
  if (!existsSync(path)) return { items: [] };
  return readJson(path);
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

export function verdict(answers: RawAnswers, thresholds: Thresholds): { pass: boolean; failed: string[] } {
  const failed: string[] = [];
  const { hasBreakdown, labels, scene, parts, memory } = answerValues(answers);
  if (hasBreakdown && labels < thresholds.labelsHonest) failed.push(`labels ${labels.toFixed(2)}`);
  if (scene < thresholds.scenePresent) failed.push(`scene ${scene.toFixed(2)}`);
  if (hasBreakdown && parts < thresholds.partsMeaningful) failed.push(`parts ${parts.toFixed(2)}`);
  if (memory < thresholds.memorability) failed.push(`memory ${memory.toFixed(2)}`);
  return { pass: failed.length === 0, failed };
}

function answerValues(answers: RawAnswers) {
  const labelProbs = Object.entries(answers)
    .filter(([key]) => key.startsWith('label_grounded_'))
    .map(([, value]) => (value as { noul: number }).noul);
  return {
    hasBreakdown: labelProbs.length > 0,
    labels: labelProbs.length > 0 ? Math.min(...labelProbs) : 1,
    scene: (answers.scene_present as { noul: number } | undefined)?.noul ?? 0,
    parts: (answers.parts_meaningful as { noul: number } | undefined)?.noul ?? 0,
    memory: (answers.memorability as { score: number } | undefined)?.score ?? 0,
  };
}

/** Threshold sweep against the user's gold labels; no API calls. */
function analyzeGold() {
  const raw = readJson<{ items: RawItem[] }>(resolve(REVIEW_DIR, 'char-typesafe-gold-raw-v1.json'));
  const decisions = readJson<{ decisions: Array<{ character: string; label: string | null }> }>(
    resolve(REVIEW_DIR, 'gold-set-v1-decisions.json'),
  ).decisions;
  const labelByCharacter = new Map(
    decisions
      .filter((decision) => decision.label === 'good' || decision.label === 'bad')
      .map((decision) => [decision.character, decision.label as 'good' | 'bad']),
  );
  const items = raw.items
    .filter((item) => labelByCharacter.has(item.character))
    .map((item) => ({ character: item.character, user: labelByCharacter.get(item.character)!, values: answerValues(item.answers) }));

  console.log(`Gold analysis: ${items.length} labeled hooks (${items.filter((item) => item.user === 'good').length} good, ${items.filter((item) => item.user === 'bad').length} bad)`);
  for (const group of ['good', 'bad'] as const) {
    const groupItems = items.filter((item) => item.user === group);
    const mean = (pick: (item: typeof items[number]) => number) => groupItems.reduce((sum, item) => sum + pick(item), 0) / groupItems.length;
    console.log(`  ${group}: labels ${mean((item) => item.values.labels).toFixed(2)} · scene ${mean((item) => item.values.scene).toFixed(2)} · parts ${mean((item) => item.values.parts).toFixed(2)} · memory ${mean((item) => item.values.memory).toFixed(2)}`);
  }

  const grid = (from: number, to: number, step: number) => {
    const out: number[] = [];
    for (let value = from; value <= to + 1e-9; value += step) out.push(Math.round(value * 100) / 100);
    return out;
  };

  interface Scored {
    labelsHonest: number; scenePresent: number; partsMeaningful: number; memorability: number;
    agree: number; balanced: number; falsePass: number; falseFail: number;
  }
  const results: Scored[] = [];
  for (const labelsHonest of grid(0.3, 0.8, 0.05)) {
    for (const scenePresent of grid(0.3, 0.8, 0.1)) {
      for (const partsMeaningful of grid(0.3, 0.8, 0.1)) {
        for (const memorability of grid(1.0, 2.4, 0.2)) {
          let agree = 0;
          let goodTotal = 0;
          let goodPass = 0;
          let badTotal = 0;
          let badPass = 0;
          for (const item of items) {
            const pass = item.values.labels >= labelsHonest && item.values.scene >= scenePresent
              && item.values.parts >= partsMeaningful && item.values.memory >= memorability;
            if (item.user === 'good') { goodTotal += 1; if (pass) goodPass += 1; }
            else { badTotal += 1; if (pass) badPass += 1; }
            if (pass === (item.user === 'good')) agree += 1;
          }
          const balanced = (goodPass / goodTotal + (badTotal - badPass) / badTotal) / 2;
          results.push({
            labelsHonest, scenePresent, partsMeaningful, memorability,
            agree, balanced,
            falsePass: badPass, falseFail: goodTotal - goodPass,
          });
        }
      }
    }
  }
  results.sort((a, b) => b.balanced - a.balanced || b.agree - a.agree || a.falsePass - b.falsePass);
  console.log('Top threshold sets (balanced accuracy first, then agreement):');
  for (const result of results.slice(0, 10)) {
    console.log(`  labels>=${result.labelsHonest} scene>=${result.scenePresent} parts>=${result.partsMeaningful} memory>=${result.memorability} → agree ${result.agree}/${items.length}, balanced ${(result.balanced * 100).toFixed(0)}%, falsePass ${result.falsePass}, falseFail ${result.falseFail}`);
  }
}

async function main() {
  const options = parseArgs();
  mkdirSync(REVIEW_DIR, { recursive: true });

  if (options.analyze) {
    analyzeGold();
    return;
  }

  const thresholds = existsSync(options.thresholdsPath)
    ? { ...DEFAULT_THRESHOLDS, ...readJson<Partial<Thresholds>>(options.thresholdsPath) }
    : DEFAULT_THRESHOLDS;

  const records = readJson<{ records: V3Record[] }>(
    resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'),
  ).records;
  const ledger = readJson<{ entries: LedgerEntry[] }>(
    resolve(OUTPUT_DIR, 'component-ledger-v1.json'),
  ).entries;
  const ledgerByGlyph = new Map(ledger.map((entry) => [entry.glyph, entry]));

  let items: ReviewItem[];
  let rawPath: string;
  if (options.gold) {
    items = readJson<{ items: ReviewItem[] }>(resolve(REVIEW_DIR, 'gold-set-v1.json')).items;
    rawPath = resolve(REVIEW_DIR, 'char-typesafe-gold-raw-v1.json');
  } else if (options.characters) {
    const wanted = new Set(options.characters);
    items = records.filter((record) => wanted.has(record.character));
    rawPath = resolve(REVIEW_DIR, 'char-typesafe-raw-v1.json');
  } else if (options.all) {
    items = records;
    rawPath = resolve(REVIEW_DIR, 'char-typesafe-raw-v1.json');
  } else {
    throw new Error('Choose a mode: --gold, --all, or --characters 圖,啚');
  }

  const existing = readRaw(rawPath);
  const done = new Set(existing.items.map((item) => item.character));
  const pending = items.filter((item) => !done.has(item.character));
  console.log(`Jev review: ${items.length} hooks · ${done.size} already done · ${pending.length} to run`);

  const byCharacter = new Map(records.map((record) => [record.character, record]));
  const results: RawItem[] = [...existing.items];

  if (options.dry) {
    const first = pending[0];
    const record = byCharacter.get(first.character);
    if (!record) throw new Error(`No v3 record for ${first.character}`);
    const state = buildState(record, ledgerByGlyph);
    console.log(JSON.stringify({ model: JEV_DEFAULT_MODEL, state, questions: buildQuestions(state) }, null, 2));
    return;
  }

  let completed = 0;
  await runPool(pending, options.concurrency, async (item) => {
    const record = byCharacter.get(item.character);
    if (!record) {
      console.warn(`skip ${item.character}: no v3 record`);
      return;
    }
    const state = buildState(record, ledgerByGlyph);
    const questions = buildQuestions(state);
    const result = await askJev(state, questions);
    const answers = result.answers as unknown as RawAnswers;
    results.push({
      character: item.character,
      bucket: item.bucket,
      userLabel: item.userLabel ?? null,
      state,
      answers,
      resolvedModel: result.model,
      usage: result.usage,
      at: new Date().toISOString(),
    });
    completed += 1;
    if (completed % 10 === 0 || completed === pending.length) {
      const { pass, failed } = verdict(answers, thresholds);
      writeFileSync(rawPath, `${JSON.stringify({ schemaVersion: 1, rubricVersion: 'book-1-meaning-only-v1', thresholds, generatedAt: new Date().toISOString(), items: results }, null, 2)}\n`);
      console.log(`[${completed}/${pending.length}] ${item.character} ${pass ? 'pass' : `FAIL (${failed.join(', ')})`}`);
    }
  });

  writeFileSync(rawPath, `${JSON.stringify({ schemaVersion: 1, rubricVersion: 'book-1-meaning-only-v1', thresholds, generatedAt: new Date().toISOString(), items: results }, null, 2)}\n`);

  const passCount = results.filter((item) => verdict(item.answers as RawAnswers, thresholds).pass).length;
  console.log(`Done: ${passCount}/${results.length} pass at current thresholds`);
  console.log(`Wrote ${rawPath}`);

  if (options.gold) {
    const decisionsPath = resolve(REVIEW_DIR, 'gold-set-v1-decisions.json');
    if (existsSync(decisionsPath)) {
      const decisions = readJson<{ decisions: Array<{ character: string; label: string | null }> }>(decisionsPath).decisions;
      const decisionByCharacter = new Map(decisions.map((decision) => [decision.character, decision.label]));
      let agree = 0;
      let compared = 0;
      for (const item of results) {
        const userLabel = decisionByCharacter.get(item.character);
        if (!userLabel) continue;
        compared += 1;
        const { pass } = verdict(item.answers as RawAnswers, thresholds);
        const userPass = userLabel === 'good';
        if (pass === userPass) agree += 1;
        else console.log(`  disagree: ${item.character} machine=${pass ? 'pass' : 'fail'} user=${userLabel}`);
      }
      console.log(`Agreement: ${agree}/${compared}${compared ? ` (${Math.round((agree / compared) * 100)}%)` : ''}`);
    } else {
      console.log('No gold-set-v1-decisions.json yet — label the gold set, then rerun with --gold to compare.');
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
