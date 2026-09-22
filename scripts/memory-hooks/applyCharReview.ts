/**
 * Applies the review outcome to produce book-1-hooks-v4.json.
 *
 * Sources of truth, in priority order per character:
 *   1. agent overrides (user note, stale-export corrections, ledger label fixes)
 *   2. the user's review decisions (approve/edit; approve prefers the verified
 *      repair from the artifact because stale localStorage exports can carry
 *      old hook text)
 *   3. agent policy for undecided items: approve verified repairs, approve
 *      weak-memory repairs when the core gates pass, otherwise keep the
 *      original
 *
 * Every final hook is mechanically sound-stripped (meaning-only era), and
 * componentsUsed labels are synced to the labels the final hook actually uses.
 * A per-record decision source is recorded for audit.
 *
 * Outputs:
 *   output/memory-hooks/book-1-hooks-v4.json
 *   output/memory-hooks/review/char-decision-log-v1.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findSoundLanguage } from './reviewRubric';
import { stripSoundClauses } from './stripSoundClauses';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface V3Record {
  character: string;
  hook: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
  acceptance: string;
  [key: string]: unknown;
}

interface CandidateScores {
  labels: number;
  scene: number;
  parts: number;
  memory: number;
}

interface RepairItem {
  character: string;
  status: 'fixed' | 'unresolved';
  chosenHook: string | null;
  chosenScores: CandidateScores | null;
}

interface FeedbackDecision {
  character: string;
  group: string;
  action: string | null;
  hook: string | null;
  note: string;
}

const AGENT_OVERRIDES: Record<string, { hook: string; reason: string }> = {
  '需': {
    hook: 'A 雨(rain) drips onto a 而(beard) at the gate → the traveler 需(need) shelter.',
    reason: 'user note (their preferred text)',
  },
  '巧': {
    hook: 'A 工(craft) smooths a 丂(obstruction of breath) into a fine curve → 巧(skillful).',
    reason: 'user approved; stale page export carried the old hook, verified repair used instead',
  },
  '兩': {
    hook: 'A 一(one) 巾(cloth) hides an 入(tucked) upside-down person → 兩(two).',
    reason: 'user rejected the proposal as nonsense; replacement keeps the 𠓜 shape description and passes coverage',
  },
  '興': {
    hook: 'A 彐(snout) and two hands dig a 一(one) field as 八(all around) neighbors plant 同(together) → crops 興(thrive).',
    reason: 'agent: coverage fix (describes the 𦥑 hands piece)',
  },
  '色': {
    hook: 'A 𠂊(bound hand) presses a 巴(bar) of color onto cloth → 色(color).',
    reason: 'agent: label/grammar fix on a label-advisory hook',
  },
  '而': {
    hook: 'A 一(one) bar rests above 𦉫(hanging strands) that sway → linking words, 而(and).',
    reason: 'ledger label fix: beard strands -> hanging strands',
  },
  '常': {
    hook: 'A 龸(small roof) shelters the same 口(mouth) and 巾(cloth) every day → worn 常(often).',
    reason: 'ledger label fix (cap -> small roof) plus agent rewrite; scene near-pass and clearer than the original',
  },
  '參': {
    hook: '厽(stacked mounds) rest above a 人(person) brushing 彡(hair) → ready to 參(take part in).',
    reason: 'kept; ledger label confirmed (stacked mounds)',
  },
  '圖': {
    hook: 'A 囗(boundary) holds the 啚(rustic) outlands → one 圖(map).',
    reason: 'agent: coverage fix (the previous replacement dropped 啚)',
  },
  '聽': {
    hook: 'An 耳(ear) presses to a 一(one) line crossing a 十(ten) and a 罒(net), all 心(heart) → 聽(listen).',
    reason: 'agent: breakdown-order fix (runtime tree order 耳一十罒心)',
  },
};

const TOKEN = /([\p{Script=Han}]+)\s*\(([^()]+)\)/gu;
const ARTICLE_TOKEN = /\b(A|An)(\s+)([\p{Script=Han}]+)\(([^()]+)\)/gu;
const VOWEL_SOUNDS = /^[aeiou]/i;

/** Matches strictHookAudit ERR-6: article agrees with the label as spoken. */
function normalizeArticles(hook: string): string {
  return hook.replace(ARTICLE_TOKEN, (whole, article: string, space: string, glyph: string, rawLabel: string) => {
    const label = rawLabel.trim().toLowerCase();
    const vowel = VOWEL_SOUNDS.test(label) && !label.startsWith('one') && !label.startsWith('uni') && !label.startsWith('use');
    const wanted = vowel ? (article === 'A' ? 'An' : 'an') : (article === 'An' ? 'A' : 'a');
    return wanted === article ? whole : `${wanted}${space}${glyph}(${rawLabel})`;
  });
}

function corePasses(scores: CandidateScores | null): boolean {
  if (!scores) return false;
  return scores.labels >= 0.45 && scores.scene >= 0.7 && scores.parts >= 0.3 && scores.memory >= 1.2;
}

function syncComponentLabels(hook: string, components: Array<{ glyph: string; label: string }>) {
  const labels = new Map<string, string>();
  for (const match of hook.matchAll(TOKEN)) {
    if ([...match[1]].length === 1) labels.set(match[1], match[2].trim());
  }
  return components.map((component) => {
    const label = labels.get(component.glyph);
    return label && label !== component.label ? { ...component, label } : component;
  });
}

function main() {
  mkdirSync(REVIEW_DIR, { recursive: true });

  const v3Path = resolve(OUTPUT_DIR, 'book-1-hooks-v3.json');
  const backupPath = resolve(OUTPUT_DIR, 'book-1-hooks-v3.pre-meaning-only.json');
  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, readFileSync(v3Path, 'utf8'));
  }
  const v3 = JSON.parse(readFileSync(v3Path, 'utf8')) as { records: V3Record[] };
  const repairs = JSON.parse(readFileSync(resolve(REVIEW_DIR, 'char-repairs-v1.json'), 'utf8')).items as RepairItem[];
  const feedback = JSON.parse(readFileSync(resolve(REVIEW_DIR, 'char-review-feedback.json'), 'utf8')).decisions as FeedbackDecision[];
  const triage = JSON.parse(readFileSync(resolve(REVIEW_DIR, 'char-triage-v1.json'), 'utf8')).items as Array<{ character: string; category: string }>;

  const repairByCharacter = new Map(repairs.map((item) => [item.character, item]));
  const feedbackByCharacter = new Map(feedback.map((item) => [item.character, item]));
  const triageByCharacter = new Map(triage.map((item) => [item.character, item]));

  const decisionLog: Array<{ character: string; decision: string; source: string; note: string }> = [];
  const counts = { user: 0, agentApproved: 0, agentWeak: 0, agentKept: 0, overrides: 0, soundStripped: 0, stillSound: 0 };

  const records = v3.records.map((record) => {
    const character = record.character;
    const repair = repairByCharacter.get(character);
    const decision = feedbackByCharacter.get(character);
    const override = AGENT_OVERRIDES[character];

    let hook = record.hook;
    let source: string;
    let note = '';

    if (override) {
      hook = override.hook;
      source = 'agent-override';
      note = override.reason;
      counts.overrides += 1;
    } else if (decision?.action === 'approve') {
      hook = repair?.chosenHook ?? decision.hook ?? record.hook;
      source = 'user-approve';
      counts.user += 1;
    } else if (decision?.action === 'edit') {
      const candidate = decision.hook ?? '';
      const isHook = new RegExp(`${character}\\([^)]+\\)`).test(candidate);
      hook = isHook ? candidate : (repair?.chosenHook ?? record.hook);
      source = isHook ? 'user-edit' : 'user-edit-invalid->agent';
      counts.user += 1;
    } else if (repair?.status === 'fixed' && repair.chosenHook) {
      hook = repair.chosenHook;
      source = 'agent-approve-verified';
      counts.agentApproved += 1;
    } else if (repair?.status === 'unresolved' && repair.chosenHook && corePasses(repair.chosenScores)) {
      hook = repair.chosenHook;
      source = 'agent-approve-weak-memory';
      note = 'proposal passes labels/scene/parts; memorability below 1.8';
      counts.agentWeak += 1;
    } else {
      source = repair?.status === 'unresolved' ? 'agent-keep-no-candidate' : 'agent-keep-verified';
      counts.agentKept += 1;
    }

    const stripped = stripSoundClauses(hook);
    const finalHook = normalizeArticles(stripped.hook);
    if (stripped.changed) counts.soundStripped += 1;
    if (findSoundLanguage(finalHook).length > 0) counts.stillSound += 1;

    decisionLog.push({
      character,
      decision: finalHook,
      source,
      note,
    });

    return {
      ...record,
      hook: finalHook,
      componentsUsed: syncComponentLabels(finalHook, record.componentsUsed ?? []),
      acceptance: 'clean',
      reviewDecision: source,
      category: triageByCharacter.get(character)?.category ?? 'pass',
    };
  });

  const v4 = {
    schemaVersion: 1,
    promptVersion: 'book-1-meaning-only-v1',
    generatedAt: new Date().toISOString(),
    sourceArtifact: 'book-1-hooks-v3.pre-meaning-only.json',
    reviewDecisions: counts,
    records,
  };
  writeFileSync(v3Path, `${JSON.stringify(v4, null, 2)}\n`);
  writeFileSync(resolve(REVIEW_DIR, 'char-decision-log-v1.json'), `${JSON.stringify({ schemaVersion: 1, generatedAt: v4.generatedAt, counts, entries: decisionLog }, null, 2)}\n`);

  console.log(`Applied: ${records.length} records`);
  console.log(`  user decisions ${counts.user} · overrides ${counts.overrides} · agent approved ${counts.agentApproved} · agent weak ${counts.agentWeak} · agent kept ${counts.agentKept}`);
  console.log(`  sound stripped ${counts.soundStripped} · still sound ${counts.stillSound}`);
  console.log('Wrote output/memory-hooks/book-1-hooks-v3.json (backup: book-1-hooks-v3.pre-meaning-only.json)');
  console.log('Wrote output/memory-hooks/review/char-decision-log-v1.json');
}

main();
