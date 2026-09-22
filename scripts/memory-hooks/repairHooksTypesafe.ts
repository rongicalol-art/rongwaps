/**
 * Repair loop for triage-flagged hooks.
 *
 * For each flagged hook: generate two meaning-only candidates with the
 * configured provider (opencode-go deepseek-v4.1-flash), validate mechanically
 * (ledger labels, component coverage/order, sound-free, length, target token),
 * re-verify survivors with the same Jev questions used in the full pass, and
 * keep the best Jev-passing candidate. Unresolved items stay for human review.
 *
 * Output: output/memory-hooks/review/char-repairs-v1.json (resume-safe).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateJson, resolveProvider } from './provider';
import { extractJsonObject } from './jsonExtract';
import { BANNED_HOOK_WORDS, findSoundLanguage, MEANING_HOOK_RULES } from './reviewRubric';
import { singleGlyphTokens } from './checkComponentOrder';
import { askJev } from './typesafeClient';
import {
  buildQuestions,
  buildStateForHook,
  verdict,
  type LedgerEntry,
  type V3Record,
  type Thresholds,
} from './reviewCharHooksTypesafe';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface TriageItem {
  character: string;
  severity: 'high' | 'medium';
  category: string;
  reasons: string[];
  hook: string;
  originalHook: string;
}

interface Candidate {
  hook: string;
  issues: string[];
  scores?: { labels: number; scene: number; parts: number; memory: number };
  pass?: boolean;
}

interface RepairedItem {
  character: string;
  status: 'fixed' | 'unresolved';
  rounds: number;
  originalHook: string;
  strippedHook: string;
  chosenHook: string | null;
  chosenScores: Candidate['scores'] | null;
  chosenIssues: string[];
  candidates: Candidate[];
  model: string;
  at: string;
}

const TOKEN_PATTERN = /([\p{Script=Han}]+)\s*\(([^()]+)\)/gu;

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    limit: Number(value('--limit') ?? 0),
    severity: value('--severity'),
    characters: value('--characters')?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? null,
    concurrency: Number(value('--concurrency') ?? 4),
    rounds: Number(value('--rounds') ?? 2),
    dry: args.includes('--dry'),
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const LABEL_NOISE = /variant|archaic|ancient|old form|old version|surname|classifier|radical in|loanword|internet slang|way to do/i;

function labelOptions(entry: LedgerEntry | undefined): { labels: string[]; readings: string[] } {
  const labels = (entry?.senses ?? [])
    .flatMap((sense) => sense.label.split(/[;,]/))
    .map((label) => label.trim())
    .filter((label) => label.length > 1 && label.length <= 30)
    .filter((label) => !LABEL_NOISE.test(label))
    .slice(0, 6);
  const readings = (entry?.readings ?? []).filter((reading) => reading.length <= 12).slice(0, 2);
  return { labels: [...new Set(labels)], readings: [...new Set(readings)] };
}

const ARTICLE = /^(?:a|an|the|to)\s+/;
const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'to', 'or', 'and', 'for', 'in']);

function significantWords(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !STOPWORDS.has(word)));
}

/** Fuzzy grounding: exact, article-insensitive, substring, or token overlap. */
function labelAllowed(label: string, options: { labels: string[]; readings: string[] }): boolean {
  const norm = label.toLowerCase().trim().replace(ARTICLE, '');
  const candidates = [...options.labels, ...options.readings];
  return candidates.some((option) => {
    const candidate = option.toLowerCase().trim();
    const candidateNorm = candidate.replace(ARTICLE, '');
    if (candidate === norm || candidateNorm === norm) return true;
    if (candidate.includes(norm) || norm.includes(candidateNorm)) return true;
    const words = significantWords(candidate);
    return [...significantWords(norm)].some((word) => words.has(word));
  });
}

function proseOf(hook: string): string {
  return hook.replace(TOKEN_PATTERN, '').replace(/\s+/g, ' ').trim();
}

function validateMechanical(hook: string, record: V3Record, ledgerByGlyph: Map<string, LedgerEntry>): string[] {
  const issues: string[] = [];
  const targetLabel = record.targetDisplayLabel ?? record.meaning;
  const targetToken = `${record.character}(${targetLabel})`;
  const trimmed = hook.trim();

  if (findSoundLanguage(hook).length > 0 || /->/.test(hook)) issues.push('sound-language');
  if (!trimmed.endsWith(targetToken) && !trimmed.endsWith(`${targetToken}.`)) issues.push('missing-target-token');
  const targetMentions = [...hook.matchAll(new RegExp(`${record.character}\\s*\\(`, 'gu'))].length;
  if (targetMentions > 1) issues.push('target-twice');

  const prose = proseOf(hook);
  const fullLength = hook.trim().length;
  if (fullLength < 25) issues.push(`hook-short (${fullLength})`);
  if (fullLength > 170) issues.push(`hook-long (${fullLength})`);
  const words = prose.split(' ').filter(Boolean).length;
  if (words > 15) issues.push(`too-many-words (${words})`);
  const sentences = (hook.match(/[.!?]/g) ?? []).length;
  if (sentences > 1) issues.push(`multi-sentence (${sentences})`);
  const commas = (prose.match(/,/g) ?? []).length;
  if (commas > 2) issues.push(`too-many-commas (${commas})`);
  if (BANNED_HOOK_WORDS.test(hook)) issues.push('banned-words');

  const expected = [...new Set(record.componentsUsed.map((component) => component.glyph))];
  const mentioned = singleGlyphTokens(hook, record.character);
  const missing = expected.filter((glyph) => !mentioned.includes(glyph));
  if (missing.length > 0) issues.push(`missing-components (${missing.join('')})`);
  const order = mentioned.filter((glyph) => expected.includes(glyph));
  if (order.join('') !== expected.filter((glyph) => mentioned.includes(glyph)).join('')) issues.push('order');

  const stray = [...hook.matchAll(/[\p{Script=Han}]/gu)]
    .map((match) => match[0])
    .filter((glyph) => glyph !== record.character && !expected.includes(glyph));
  if (stray.length > 0) issues.push(`stray-han (${[...new Set(stray)].join('')})`);

  for (const match of hook.matchAll(TOKEN_PATTERN)) {
    const glyphs = match[1];
    if ([...glyphs].length !== 1 || glyphs === record.character) continue;
    const options = labelOptions(ledgerByGlyph.get(glyphs));
    const hasOptions = options.labels.length + options.readings.length > 0;
    if (hasOptions && !labelAllowed(match[2], options)) issues.push(`ungrounded-label (${glyphs}:${match[2]})`);
  }
  return issues;
}

function buildPrompt(record: V3Record, ledgerByGlyph: Map<string, LedgerEntry>, brokenHook: string): string {
  const componentLines = record.componentsUsed.map((component) => {
    const options = labelOptions(ledgerByGlyph.get(component.glyph));
    const labels = options.labels.length > 0 ? options.labels.join(', ') : 'none (describe only its plainly visible shape)';
    const readings = options.readings.length > 0 ? ` [reading: ${options.readings.join(', ')}]` : '';
    return `- ${component.glyph}: allowed labels: ${labels}${readings}`;
  }).join('\n');

  const componentSection = record.componentsUsed.length > 0
    ? [
        'Components, in the order the hook must mention them:',
        componentLines,
        '',
      ]
    : [
        'This character has no components: describe its shape with plain words and state the meaning. Do not write any 字(label) token in the scene — the target token appears only once, at the end.',
        '',
      ];

  return [
    `Rewrite ONE memory hook for the Chinese character ${record.character}, meaning "${record.targetDisplayLabel ?? record.meaning}".`,
    '',
    ...componentSection,
    'Rules:',
    ...MEANING_HOOK_RULES.map((rule) => `- ${rule}`),
    `- Use the listed labels (you may drop "a"/"to"); never invent a meaning for a piece.`,
    `- The target token ${record.character}(${record.targetDisplayLabel ?? record.meaning}) appears exactly once, as the final token. Never use the target character mid-scene.`,
    '- Aim for 45–90 characters of hook text (about 6–12 words of prose). The final hook must be at least 25 characters and at most 170.',
    '- Make it vivid: one specific action a learner can picture, not a plain definition. No "the way", "as if", "while", or stacked clauses.',
    '- No pinyin and no sound language anywhere: no "lends the sound", no comparisons of readings.',
    '- Format example: "An 耂(old) man leans on a 匕(spoon) as a cane → long years make him 老(old)." Every component is a 字(label) token; the target token closes the hook.',
    '',
    `The current hook is wrong (too long or broken): "${brokenHook}"`,
    '',
    'Write two different rewrites. Return JSON exactly like {"hooks": ["first rewrite", "second rewrite"]}.',
  ].join('\n');
}

async function main() {
  const options = parseArgs();
  mkdirSync(REVIEW_DIR, { recursive: true });

  const provider = resolveProvider();
  const thresholds = readJson<{ thresholds: Thresholds }>(
    resolve(REVIEW_DIR, 'typesafe-thresholds-v1.json'),
  ).thresholds;
  const triage = readJson<{ items: TriageItem[] }>(resolve(REVIEW_DIR, 'char-triage-v1.json')).items;
  const records = readJson<{ records: V3Record[] }>(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json')).records;
  const ledger = readJson<{ entries: LedgerEntry[] }>(resolve(OUTPUT_DIR, 'component-ledger-v1.json')).entries;
  const ledgerByGlyph = new Map(ledger.map((entry) => [entry.glyph, entry]));
  const recordByCharacter = new Map(records.map((record) => [record.character, record]));

  let queue = options.characters
    ? triage.filter((item) => options.characters!.includes(item.character))
    : triage.filter((item) => item.category === 'repair');
  if (options.severity) queue = queue.filter((item) => item.severity === options.severity);
  if (options.limit > 0) queue = queue.slice(0, options.limit);

  const repairsPath = resolve(REVIEW_DIR, 'char-repairs-v1.json');
  const existing = existsSync(repairsPath)
    ? readJson<{ items: RepairedItem[] }>(repairsPath)
    : { items: [] };
  const done = new Set(existing.items.filter((item) => item.status === 'fixed').map((item) => item.character));
  const pending = queue.filter((item) => !done.has(item.character));
  console.log(`Repair: ${queue.length} queued · ${done.size} already fixed · ${pending.length} to run · model ${provider.model}`);

  if (options.dry) {
    const first = pending[0];
    const record = recordByCharacter.get(first.character);
    if (!record) throw new Error(`No record for ${first.character}`);
    console.log(buildPrompt(record, ledgerByGlyph, first.hook));
    return;
  }

  const results: RepairedItem[] = [...existing.items];

  const runOne = async (item: TriageItem): Promise<void> => {
    const record = recordByCharacter.get(item.character);
    if (!record) return;
    const candidates: Candidate[] = [];
    let rounds = 0;
    let solved: Candidate | null = null;

    for (let round = 1; round <= options.rounds && !solved; round += 1) {
      rounds = round;
      const content = await generateJson(
        provider,
        'You repair memory hooks for a Chinese-learning app. Follow the rules exactly and output JSON only.',
        buildPrompt(record, ledgerByGlyph, item.hook),
        900,
      );
      let hooks: string[];
      try {
        const parsed = JSON.parse(extractJsonObject(content)) as { hooks?: string[] };
        hooks = (parsed.hooks ?? []).filter((hook) => typeof hook === 'string');
      } catch {
        hooks = [];
      }
      for (const hook of hooks.slice(0, 2)) {
        const issues = validateMechanical(hook, record, ledgerByGlyph);
        const candidate: Candidate = { hook, issues };
        if (issues.length === 0) {
          const state = buildStateForHook(record, ledgerByGlyph, hook);
          const result = await askJev(state, buildQuestions(state));
          const rawAnswers = result.answers as unknown as Record<string, unknown>;
          const check = verdict(rawAnswers, thresholds);
          const labelProbs = Object.entries(rawAnswers)
            .filter(([key]) => key.startsWith('label_grounded_'))
            .map(([, value]) => (value as { noul: number }).noul);
          candidate.pass = check.pass;
          candidate.scores = {
            labels: labelProbs.length > 0 ? Math.min(...labelProbs) : 1,
            scene: (rawAnswers.scene_present as { noul: number }).noul,
            parts: (rawAnswers.parts_meaningful as { noul: number }).noul,
            memory: (rawAnswers.memorability as { score: number }).score,
          };
          if (check.pass && (!solved || (candidate.scores.memory ?? 0) > (solved.scores?.memory ?? 0))) {
            solved = candidate;
          }
        }
        candidates.push(candidate);
      }
    }

    const best = solved
      ?? candidates.filter((candidate) => candidate.issues.length === 0)
        .sort((a, b) => (b.scores?.memory ?? 0) - (a.scores?.memory ?? 0))[0]
      ?? null;

    const entry: RepairedItem = {
      character: item.character,
      status: solved ? 'fixed' : 'unresolved',
      rounds,
      originalHook: item.originalHook,
      strippedHook: item.hook,
      chosenHook: best?.hook ?? null,
      chosenScores: best?.scores
        ? {
            labels: Math.round(best.scores.labels * 100) / 100,
            scene: Math.round(best.scores.scene * 100) / 100,
            parts: Math.round(best.scores.parts * 100) / 100,
            memory: Math.round(best.scores.memory * 100) / 100,
          }
        : null,
      chosenIssues: best?.issues ?? [],
      candidates,
      model: provider.model,
      at: new Date().toISOString(),
    };
    const existingIndex = results.findIndex((result) => result.character === entry.character);
    if (existingIndex >= 0) results[existingIndex] = entry;
    else results.push(entry);
    console.log(`${item.character} ${entry.status}${entry.chosenScores ? ` (memory ${entry.chosenScores.memory}, labels ${entry.chosenScores.labels})` : ''}`);
  };

  let cursor = 0;
  const workers = Array.from({ length: Math.min(options.concurrency, pending.length) }, async () => {
    while (cursor < pending.length) {
      const item = pending[cursor];
      cursor += 1;
      try {
        await runOne(item);
      } catch (error) {
        console.error(`${item.character} error: ${error instanceof Error ? error.message : error}`);
      }
      writeFileSync(repairsPath, `${JSON.stringify({ schemaVersion: 1, rubricVersion: 'book-1-meaning-only-v1', model: provider.model, generatedAt: new Date().toISOString(), items: results }, null, 2)}\n`);
    }
  });
  await Promise.all(workers);

  const fixed = results.filter((item) => item.status === 'fixed').length;
  console.log(`Done: ${fixed}/${results.length} fixed`);
  console.log(`Wrote ${repairsPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
