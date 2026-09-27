/**
 * Jev verification of an agent-crew handoff against the actual diff.
 *
 * Reads `.agents/<crew>/{BRIEFING,handoff,progress}.md` plus the current diff
 * and asks one batched Jev call: do the handoff's claims match the changed
 * lines, does the diff stay in scope, is cited evidence real, and are reported
 * verification results consistent with the diff. Jev judges only; the crew
 * still owns the work.
 *
 * Usage:
 *   tsx scripts/jev/verifyHandoff.ts --crew worker_m2
 *   tsx scripts/jev/verifyHandoff.ts --dir .agents/worker_m2 --range HEAD~1
 *
 * Options:
 *   --crew NAME      crew folder under .agents/
 *   --dir PATH       explicit crew folder (overrides --crew)
 *   --range REV      git diff REV (default: worktree, i.e. git diff HEAD)
 *   --staged         verify only staged changes
 *   --strict         exit 1 when a check fails (default is warn-only)
 *   --dry            print state and questions, no API calls
 *   --out PATH       report path (default <crew>/verification.json)
 *   --model M        override the pinned Jev model
 *
 * Writes verification.json and verification.md into the crew folder.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { noul, type Questions } from '@typesafe-ai/sdk';
import { askJev, JEV_DEFAULT_MODEL, noulValue, type RawAnswers } from './client';
import { truncate, type AskJevFn, type GitFn } from './lintRules';

const ROOT = resolve(import.meta.dirname, '../..');
const DEFAULT_AGENTS_DIR = resolve(ROOT, '.agents');
const DOC_CAP = 8_000;
const DIFF_CAP = 20_000;
const STATE_CAP = 30_000;

export interface VerifyOptions {
  crew: string | null;
  dir: string | null;
  range: string | null;
  staged: boolean;
  strict: boolean;
  dry: boolean;
  out: string | null;
  model: string;
}

export interface HandoffThresholds {
  claimsMatchDiff: number;
  noUnclaimedChanges: number;
  evidenceGrounded: number;
  verificationSupported: number;
}

export const DEFAULT_HANDOFF_THRESHOLDS: HandoffThresholds = {
  claimsMatchDiff: 0.6,
  noUnclaimedChanges: 0.6,
  evidenceGrounded: 0.5,
  verificationSupported: 0.5,
};

export interface CrewDocs {
  name: string;
  briefing: string;
  handoff: string;
  progress: string;
  filesChanged: string[];
}

export type VerifyState = {
  crew: {
    name: string;
    briefing: string;
    handoff: string;
    progress: string;
    files_changed: string[];
  };
  diff: string;
};

export interface HandoffVerdict {
  id: keyof HandoffThresholds;
  title: string;
  probability: number;
  threshold: number;
  pass: boolean;
}

export interface HandoffReport {
  schemaVersion: 1;
  crew: string;
  mode: string;
  model: string;
  generatedAt: string;
  strict: boolean;
  thresholds: HandoffThresholds;
  totals: { calls: number; failures: number; inputTokens: number; outputTokens: number };
  verdicts: HandoffVerdict[];
}

export interface VerifyDeps {
  askJev?: AskJevFn;
  runGit?: GitFn;
  readFile?: (path: string) => string;
  writeFile?: (path: string, contents: string) => void;
}

const CHECKS: Array<{ id: keyof HandoffThresholds; title: string; instructions: string; trueCriteria: string; falseCriteria: string }> = [
  {
    id: 'claimsMatchDiff',
    title: 'Handoff claims match the diff',
    instructions:
      'Does `diff` implement the work that `crew.handoff` claims was done? Judge only what the changed lines can show. A claim about files, behavior, or wiring that no changed line supports makes this false. Formatting or prose differences are irrelevant; missing implementation is not.',
    trueCriteria: 'Every material claim in the handoff is supported by the changed lines.',
    falseCriteria: 'At least one material claim is unsupported by the changed lines.',
  },
  {
    id: 'noUnclaimedChanges',
    title: 'No unclaimed changes',
    instructions:
      'Does `diff` avoid changes that the handoff and progress notes never mention? Incidental mechanical edits (formatting, imports required by a claimed change, lockfile noise) do not count. A behavior change, new file, or deletion that the notes do not describe makes this false.',
    trueCriteria: 'The diff contains no material changes beyond the described work.',
    falseCriteria: 'The diff contains material changes the crew never described.',
  },
  {
    id: 'evidenceGrounded',
    title: 'Evidence citations are real',
    instructions:
      'When `crew.handoff` cites specific files, symbols, line numbers, commands, or outputs, do those citations exist in `diff` or in `crew.progress`? Unverifiable or invented citations make this false. If the handoff cites no evidence, the check holds.',
    trueCriteria: 'All citations can be matched to the diff or progress notes.',
    falseCriteria: 'A citation cannot be matched or contradicts the provided state.',
  },
  {
    id: 'verificationSupported',
    title: 'Reported verification is consistent',
    instructions:
      'Are the verification results reported in `crew.handoff` (tests, typecheck, lint, manual checks) consistent with the diff? Claimed passes for suites the diff would clearly break, or results reported without any corresponding work in the diff, make this false. If the handoff reports no verification, the check holds.',
    trueCriteria: 'Reported verification is plausible and consistent with the diff.',
    falseCriteria: 'Reported verification conflicts with what the diff shows.',
  },
];

export function buildState(docs: CrewDocs, diff: string): VerifyState {
  const diffText = truncate(diff, DIFF_CAP);
  const remaining = Math.max(0, STATE_CAP - diffText.length);
  const share = Math.floor(remaining / 3);
  return {
    crew: {
      name: docs.name,
      briefing: truncate(docs.briefing, Math.min(DOC_CAP, share)),
      handoff: truncate(docs.handoff, Math.min(DOC_CAP, share)),
      progress: truncate(docs.progress, Math.min(DOC_CAP, share)),
      files_changed: docs.filesChanged,
    },
    diff: diffText,
  };
}

export function buildQuestions(): Questions {
  return Object.fromEntries(CHECKS.map((check) => [
    check.id,
    noul(check.instructions, { true: check.trueCriteria, false: check.falseCriteria }),
  ])) as Questions;
}

export function evaluateHandoff(
  answers: RawAnswers,
  thresholds: HandoffThresholds = DEFAULT_HANDOFF_THRESHOLDS,
): HandoffVerdict[] {
  return CHECKS.map((check) => {
    const probability = noulValue(answers, check.id);
    const threshold = thresholds[check.id];
    return { id: check.id, title: check.title, probability, threshold, pass: probability >= threshold };
  });
}

export function filesFromDiff(diff: string): string[] {
  return [...diff.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].map((match) => match[2]);
}

export function readCrew(dir: string, readFile: (path: string) => string): CrewDocs {
  const optional = (name: string): string => {
    const path = resolve(dir, name);
    return existsSync(path) ? readFile(path) : '';
  };
  const handoff = optional('handoff.md');
  if (!handoff) throw new Error(`No handoff.md in ${dir}`);
  return {
    name: basename(dir),
    briefing: optional('BRIEFING.md'),
    handoff,
    progress: optional('progress.md'),
    filesChanged: [],
  };
}

function defaultRunGit(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function collectDiff(options: VerifyOptions, runGit: GitFn): { diff: string; mode: string } {
  const args = options.staged ? ['diff', '--cached'] : options.range ? ['diff', options.range] : ['diff', 'HEAD'];
  return { diff: runGit(args), mode: options.range ?? (options.staged ? 'staged' : 'worktree') };
}

export function formatMarkdown(report: HandoffReport): string {
  const lines = [
    `# Jev handoff verification — ${report.crew}`,
    '',
    `- model: \`${report.model}\` (${report.mode})`,
    `- generated: ${report.generatedAt}`,
    `- result: ${report.totals.failures === 0 ? 'PASS' : `FAIL (${report.totals.failures})`}`,
    '',
    '| check | probability | threshold | verdict |',
    '| --- | --- | --- | --- |',
    ...report.verdicts.map((verdict) =>
      `| ${verdict.title} | ${verdict.probability.toFixed(2)} | ${verdict.threshold} | ${verdict.pass ? 'pass' : 'FAIL'} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export async function runVerify(options: VerifyOptions, deps: VerifyDeps = {}): Promise<HandoffReport> {
  const ask = deps.askJev ?? (askJev as AskJevFn);
  const runGit = deps.runGit ?? defaultRunGit;
  const readFile = deps.readFile ?? ((path: string) => readFileSync(path, 'utf8'));
  const writeFile = deps.writeFile ?? ((path: string, contents: string) => writeFileSync(path, contents));

  const dir = options.dir ?? (options.crew ? resolve(DEFAULT_AGENTS_DIR, options.crew) : null);
  if (!dir) throw new Error('Choose a crew folder: --crew NAME or --dir PATH');
  const { diff, mode } = collectDiff(options, runGit);
  const docs = readCrew(dir, readFile);
  docs.filesChanged = filesFromDiff(diff);

  const state = buildState(docs, diff);
  const questions = buildQuestions();
  const report: HandoffReport = {
    schemaVersion: 1,
    crew: docs.name,
    mode,
    model: options.model,
    generatedAt: new Date().toISOString(),
    strict: options.strict,
    thresholds: DEFAULT_HANDOFF_THRESHOLDS,
    totals: { calls: 0, failures: 0, inputTokens: 0, outputTokens: 0 },
    verdicts: [],
  };

  if (options.dry) {
    console.log(JSON.stringify({ model: options.model, state, questions }, null, 2));
    return report;
  }

  const result = await ask(state, questions, options.model);
  const verdicts = evaluateHandoff(result.answers as RawAnswers);
  report.verdicts = verdicts;
  report.totals.calls = 1;
  report.totals.failures = verdicts.filter((verdict) => !verdict.pass).length;
  report.totals.inputTokens = result.usage.input_tokens;
  report.totals.outputTokens = result.usage.output_tokens;

  for (const verdict of verdicts) {
    const label = verdict.pass ? 'pass' : `FAIL p=${verdict.probability.toFixed(2)} < ${verdict.threshold}`;
    console.log(`[jev-verify] ${verdict.id}: ${label} — ${verdict.title}`);
  }
  console.log(`[jev-verify] ${docs.name}: ${report.totals.failures === 0 ? 'PASS' : `FAIL (${report.totals.failures})`} · ${report.totals.inputTokens} in / ${report.totals.outputTokens} out tokens`);

  const outPath = options.out ?? resolve(dir, 'verification.json');
  const markdownPath = outPath.replace(/\.json$/, '.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFile(markdownPath, formatMarkdown(report));
  console.log(`[jev-verify] report: ${outPath}`);
  return report;
}

export function parseArgs(argv: string[]): VerifyOptions {
  const args = argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    crew: value('--crew'),
    dir: value('--dir'),
    range: value('--range'),
    staged: args.includes('--staged'),
    strict: args.includes('--strict'),
    dry: args.includes('--dry'),
    out: value('--out'),
    model: value('--model') ?? JEV_DEFAULT_MODEL,
  };
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
  const options = parseArgs(process.argv);
  runVerify(options)
    .then((report) => {
      if (report.totals.failures === 0) return;
      if (options.strict) {
        process.exitCode = 1;
      } else {
        console.log('[jev-verify] warn-only: rerun with --strict to fail on failed checks');
      }
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
