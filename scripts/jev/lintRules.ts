/**
 * Jev semantic lint gate.
 *
 * Takes the current diff, keeps the files whose changed lines trip a rule
 * trigger (`scripts/jev/lintRuleSet.ts`), and asks one batched Jev call per
 * file: one `noul` per rule, where the probability is how strongly the rule
 * HOLDS. Answers below a rule's threshold are violations.
 *
 * Modes:
 *   (default)        git diff HEAD (staged + unstaged)
 *   --staged         git diff --cached
 *   --range A..B     git diff A..B
 *   --files a.ts,b.ts  explicit paths (untracked files are read directly)
 *
 * Options:
 *   --strict         exit 1 when violations exist (default is warn-only)
 *   --dry            print the first request state and questions, no API calls
 *   --max-files N    cap linted files (default 20)
 *   --out PATH       report path (default output/jev/lint/latest.json)
 *   --model M        override the pinned Jev model
 *
 * Writes output/jev/lint/latest.json with per-file probabilities and token use.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { noul, type EntryType, type Questions, type SystemOneResult } from '@typesafe-ai/sdk';
import { askJev, JEV_DEFAULT_MODEL, noulValue, type RawAnswers } from './client';
import { LINT_RULES, type LintRule } from './lintRuleSet';

const ROOT = resolve(import.meta.dirname, '../..');
const DEFAULT_OUT = resolve(ROOT, 'output/jev/lint/latest.json');
const DIFF_CAP = 16_000;
const CONTENT_CAP = 20_000;
const STATE_CAP = 30_000;
const DEFAULT_MAX_FILES = 20;

export interface FileDiff {
  path: string;
  diff: string;
}

export interface LintOptions {
  staged: boolean;
  range: string | null;
  files: string[] | null;
  strict: boolean;
  dry: boolean;
  maxFiles: number;
  outputPath: string;
  model: string;
}

export interface RuleVerdict {
  id: string;
  title: string;
  probability: number;
  threshold: number;
  pass: boolean;
}

export interface LintFileReport {
  path: string;
  model: string;
  rules: RuleVerdict[];
}

export interface LintReport {
  schemaVersion: 1;
  mode: string;
  model: string;
  generatedAt: string;
  strict: boolean;
  totals: {
    candidateFiles: number;
    lintedFiles: number;
    calls: number;
    violations: number;
    inputTokens: number;
    outputTokens: number;
    skippedNoRules: string[];
    skippedMaxFiles: string[];
  };
  files: LintFileReport[];
}

export type AskJevFn = (
  state: EntryType,
  questions: Questions,
  model?: string,
) => Promise<SystemOneResult<Questions>>;

export type GitFn = (args: string[]) => string;

export interface LintDeps {
  askJev?: AskJevFn;
  runGit?: GitFn;
  readFile?: (path: string) => string;
  writeFile?: (path: string, contents: string) => void;
}

function expandBraces(pattern: string): string[] {
  const start = pattern.indexOf('{');
  const end = pattern.indexOf('}', start);
  if (start === -1 || end === -1) return [pattern];
  const before = pattern.slice(0, start);
  const after = pattern.slice(end + 1);
  return pattern
    .slice(start + 1, end)
    .split(',')
    .flatMap((part) => expandBraces(before + part + after));
}

const REGEXP_SPECIALS = new Set(['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']);

export function globToRegExp(pattern: string): RegExp {
  const sources = expandBraces(pattern).map((expanded) => {
    let source = '';
    for (let index = 0; index < expanded.length; index += 1) {
      const char = expanded[index];
      if (char === '*') {
        if (expanded[index + 1] === '*') {
          index += 1;
          if (expanded[index + 1] === '/') {
            index += 1;
            source += '(?:.*/)?';
          } else {
            source += '.*';
          }
        } else {
          source += '[^/]*';
        }
      } else if (char === '?') {
        source += '[^/]';
      } else if (REGEXP_SPECIALS.has(char)) {
        source += `\\${char}`;
      } else {
        source += char;
      }
    }
    return source;
  });
  return new RegExp(`^(?:${sources.join('|')})$`);
}

const FILE_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;

export function parseFileDiffs(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | null = null;
  for (const line of diffText.split('\n')) {
    const match = line.match(FILE_HEADER);
    if (match) {
      current = { path: match[2], diff: '' };
      files.push(current);
    }
    if (current) current.diff += `${line}\n`;
  }
  return files;
}

export function changedLines(diff: string): string {
  return diff
    .split('\n')
    .filter((line) => (line.startsWith('+') && !line.startsWith('+++'))
      || (line.startsWith('-') && !line.startsWith('---')))
    .join('\n');
}

export function selectRules(filePath: string, diff: string): LintRule[] {
  const changed = changedLines(diff);
  return LINT_RULES.filter((rule) => rule.appliesTo.some((pattern) => globToRegExp(pattern).test(filePath))
    && rule.trigger.test(changed));
}

export function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n…[truncated ${text.length - limit} chars]`;
}

export type FileState = {
  file: {
    path: string;
    diff: string;
    content: string | null;
    content_truncated: boolean;
  };
};

export function buildState(filePath: string, diff: string, content: string | null): FileState {
  const cappedDiff = truncate(diff, DIFF_CAP);
  let cappedContent: string | null = null;
  if (content) {
    const room = Math.min(CONTENT_CAP, STATE_CAP - cappedDiff.length);
    if (room > 0) cappedContent = truncate(content, room);
  }
  return {
    file: {
      path: filePath,
      diff: cappedDiff,
      content: cappedContent,
      content_truncated: content !== null && (cappedContent === null || cappedContent.length < content.length),
    },
  };
}

export function buildQuestions(rules: LintRule[]): Questions {
  return Object.fromEntries(rules.map((rule) => [
    rule.id,
    noul(rule.instructions, { true: rule.trueCriteria, false: rule.falseCriteria }),
  ])) as Questions;
}

export function evaluateAnswers(rules: LintRule[], answers: RawAnswers): RuleVerdict[] {
  return rules.map((rule) => {
    const probability = noulValue(answers, rule.id);
    return {
      id: rule.id,
      title: rule.title,
      probability,
      threshold: rule.threshold,
      pass: probability >= rule.threshold,
    };
  });
}

function defaultRunGit(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function ensureDiffForPath(path: string, runGit: GitFn, readFile: (path: string) => string): string {
  const diff = runGit(['diff', 'HEAD', '--', path]);
  if (diff.trim()) return diff;
  const absolute = resolve(ROOT, path);
  if (!existsSync(absolute)) throw new Error(`No diff and no file at ${path}`);
  const content = readFile(absolute);
  return [
    `diff --git a/${path} b/${path}`,
    '--- /dev/null',
    `+++ b/${path}`,
    ...content.split('\n').map((line) => `+${line}`),
  ].join('\n');
}

export function collectDiffs(
  options: LintOptions,
  runGit: GitFn,
  readFile: (path: string) => string,
): { files: FileDiff[]; mode: string } {
  if (options.files) {
    return {
      files: options.files.map((path) => ({ path, diff: ensureDiffForPath(path, runGit, readFile) })),
      mode: `files:${options.files.length}`,
    };
  }
  const args = options.staged ? ['diff', '--cached'] : options.range ? ['diff', options.range] : ['diff', 'HEAD'];
  return {
    files: parseFileDiffs(runGit(args)),
    mode: options.range ?? (options.staged ? 'staged' : 'worktree'),
  };
}

function readContent(path: string, readFile: (path: string) => string): string | null {
  try {
    const content = readFile(resolve(ROOT, path));
    return content.includes('\u0000') ? null : content;
  } catch {
    return null;
  }
}

export async function runLint(options: LintOptions, deps: LintDeps = {}): Promise<LintReport> {
  const ask = deps.askJev ?? (askJev as AskJevFn);
  const runGit = deps.runGit ?? defaultRunGit;
  const readFile = deps.readFile ?? ((path: string) => readFileSync(path, 'utf8'));
  const writeFile = deps.writeFile ?? ((path: string, contents: string) => writeFileSync(path, contents));

  const { files, mode } = collectDiffs(options, runGit, readFile);
  const report: LintReport = {
    schemaVersion: 1,
    mode,
    model: options.model,
    generatedAt: new Date().toISOString(),
    strict: options.strict,
    totals: {
      candidateFiles: files.length,
      lintedFiles: 0,
      calls: 0,
      violations: 0,
      inputTokens: 0,
      outputTokens: 0,
      skippedNoRules: [],
      skippedMaxFiles: [],
    },
    files: [],
  };

  const withRules = files.filter((file) => selectRules(file.path, file.diff).length > 0);
  report.totals.skippedNoRules = files
    .filter((file) => !withRules.includes(file))
    .map((file) => file.path);
  const selected = withRules.slice(0, options.maxFiles);
  report.totals.skippedMaxFiles = withRules.slice(options.maxFiles).map((file) => file.path);

  if (options.dry) {
    const first = selected[0];
    if (!first) {
      console.log('No changed file trips a lint rule.');
      return report;
    }
    const rules = selectRules(first.path, first.diff);
    console.log(JSON.stringify({
      model: options.model,
      state: buildState(first.path, first.diff, readContent(first.path, readFile)),
      questions: buildQuestions(rules),
    }, null, 2));
    return report;
  }

  for (const file of selected) {
    const rules = selectRules(file.path, file.diff);
    const state = buildState(file.path, file.diff, readContent(file.path, readFile));
    const result = await ask(state, buildQuestions(rules), options.model);
    const verdicts = evaluateAnswers(rules, result.answers as RawAnswers);
    const failed = verdicts.filter((verdict) => !verdict.pass);

    report.totals.lintedFiles += 1;
    report.totals.calls += 1;
    report.totals.violations += failed.length;
    report.totals.inputTokens += result.usage.input_tokens;
    report.totals.outputTokens += result.usage.output_tokens;
    report.files.push({ path: file.path, model: result.model, rules: verdicts });

    if (failed.length === 0) {
      console.log(`[jev-lint] ${file.path}: pass (${verdicts.length} ${verdicts.length === 1 ? 'rule' : 'rules'})`);
    } else {
      for (const verdict of failed) {
        console.log(`[jev-lint] ${file.path}: FAIL ${verdict.id} p=${verdict.probability.toFixed(2)} < ${verdict.threshold} — ${verdict.title}`);
      }
    }
  }

  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFile(options.outputPath, `${JSON.stringify(report, null, 2)}\n`);

  const { lintedFiles, violations, skippedNoRules, skippedMaxFiles } = report.totals;
  console.log(`[jev-lint] ${lintedFiles} files · ${violations} violations · ${report.totals.inputTokens} in / ${report.totals.outputTokens} out tokens`);
  if (skippedNoRules.length > 0) console.log(`[jev-lint] skipped (no rule applies): ${skippedNoRules.join(', ')}`);
  if (skippedMaxFiles.length > 0) console.log(`[jev-lint] skipped (--max-files ${options.maxFiles}): ${skippedMaxFiles.join(', ')}`);
  console.log(`[jev-lint] report: ${options.outputPath}`);
  return report;
}

export function parseArgs(argv: string[]): LintOptions {
  const args = argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    staged: args.includes('--staged'),
    range: value('--range'),
    files: value('--files')?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? null,
    strict: args.includes('--strict'),
    dry: args.includes('--dry'),
    maxFiles: Number(value('--max-files') ?? DEFAULT_MAX_FILES),
    outputPath: value('--out') ?? DEFAULT_OUT,
    model: value('--model') ?? JEV_DEFAULT_MODEL,
  };
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
  const options = parseArgs(process.argv);
  runLint(options)
    .then((report) => {
      if (report.totals.violations === 0) return;
      if (options.strict) {
        process.exitCode = 1;
      } else {
        console.log('[jev-lint] warn-only: rerun with --strict to fail on violations');
      }
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
