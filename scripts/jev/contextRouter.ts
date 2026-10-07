/**
 * Jev context router: pick the files a coding task actually needs.
 *
 * Two stages, cheap first:
 *   1. Lexical shortlist — token overlap against path and file head.
 *   2. One batched Jev call — a `score` per candidate over the shortlist
 *      (parallel questions; see the TypeSafe parallel-questions cookbook).
 *
 * Output is a paste-ready context preamble plus a JSON report, so expensive
 * coding models read the relevant files instead of the whole repo.
 *
 * Usage:
 *   tsx scripts/jev/contextRouter.ts "fix grammar exercise scoring"
 *   tsx scripts/jev/contextRouter.ts --task "..." --candidates 60 --top 12
 *
 * Options:
 *   --task TEXT        task description (or pass it as a positional argument)
 *   --root PATH        corpus root (default repo root)
 *   --candidates N     lexical shortlist size (default 40)
 *   --top N            selected files in the output (default 10)
 *   --min-score N      minimum Jev score to select (default 1.5 of 3)
 *   --out PATH         output prefix (default output/jev/context/latest)
 *   --model M          override the pinned Jev model
 *   --dry              print state and questions, no API calls
 *
 * Writes <out>.json and <out>.md.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { score, type EntryType, type Questions } from '@typesafe-ai/sdk';
import { askJev, JEV_DEFAULT_MODEL, scoreValue, type RawAnswers } from './client';
import { truncate, type AskJevFn } from './lintRules';

const ROOT = resolve(import.meta.dirname, '../..');
const DEFAULT_OUT = resolve(ROOT, 'output/jev/context/latest');

const ROOT_DOCS = ['AGENTS.md', 'README.md'];
const CANDIDATE_DIRS = ['src', 'scripts', 'server', 'tests', 'docs'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git', 'output', 'public', '.vite', 'tmp', '.agents', '__pycache__']);
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.md']);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'when', 'then',
  'than', 'have', 'has', 'was', 'were', 'are', 'not', 'but', 'add', 'fix',
  'make', 'use', 'using', 'should', 'would', 'could', 'need', 'needs', 'new',
]);

const SCORE_LEVELS = [
  'Not relevant context',
  'Background only',
  'Useful context',
  'Essential context',
] as const;

export interface RouterOptions {
  task: string;
  root: string;
  candidates: number;
  top: number;
  minScore: number;
  out: string;
  model: string;
  dry: boolean;
}

export interface RankedFile {
  path: string;
  score: number;
}

export interface RouterReport {
  schemaVersion: 1;
  task: string;
  model: string;
  generatedAt: string;
  totals: {
    corpusFiles: number;
    shortlist: number;
    selected: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    selectedTokensEstimate: number;
  };
  selected: RankedFile[];
  shortlist: RankedFile[];
}

export interface RouterDeps {
  askJev?: AskJevFn;
  readFile?: (path: string) => string;
  writeFile?: (path: string, contents: string) => void;
}

export function collectCandidates(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(resolve(dir, entry.name));
      } else if (entry.isFile() && ALLOWED_EXTENSIONS.has(extname(entry.name))) {
        files.push(relative(root, resolve(dir, entry.name)));
      }
    }
  };
  for (const doc of ROOT_DOCS) {
    if (existsSync(resolve(root, doc))) files.push(doc);
  }
  for (const dir of CANDIDATE_DIRS) walk(resolve(root, dir));
  return files.sort();
}

export function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z0-9_./-]{3,}/g) ?? [];
  return [...new Set(tokens.filter((token) => !STOP_WORDS.has(token)))];
}

export function lexicalShortlist(
  root: string,
  files: string[],
  task: string,
  limit: number,
  readFile: (path: string) => string,
): string[] {
  const tokens = tokenize(task);
  if (tokens.length === 0) return files.slice(0, limit);
  const scored = files.map((path) => {
    const lowerPath = path.toLowerCase();
    let head: string;
    try {
      head = readFile(resolve(root, path)).slice(0, 2_000).toLowerCase();
    } catch {
      head = '';
    }
    let value = 0;
    for (const token of tokens) {
      if (lowerPath.includes(token)) value += 3;
      else if (head.includes(token)) value += 1;
    }
    return { path, value };
  });
  return scored
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((entry) => entry.path);
}

export function buildExcerpt(root: string, path: string, readFile: (path: string) => string): string {
  let content: string;
  try {
    content = readFile(resolve(root, path));
  } catch {
    return '';
  }
  const headings = content
    .split('\n')
    .filter((line) => /^#{1,3} /.test(line))
    .slice(0, 4)
    .join('\n');
  const body = truncate(content.replace(/\s+/g, ' ').trim(), 500);
  return [headings, body].filter(Boolean).join('\n');
}

export function buildState(task: string, root: string, paths: string[], readFile: (path: string) => string) {
  return {
    task,
    candidates: paths.map((path, index) => ({
      id: `file_${index}`,
      path,
      excerpt: buildExcerpt(root, path, readFile),
    })),
  };
}

export function buildQuestions(count: number): Questions {
  return Object.fromEntries(Array.from({ length: count }, (_unused, index) => [
    `file_${index}`,
    score(
      `How useful is \`candidates[${index}]\` as context for \`task\`?`,
      SCORE_LEVELS,
    ),
  ])) as Questions;
}

export function rankCandidates(paths: string[], answers: RawAnswers): RankedFile[] {
  return paths
    .map((path, index) => ({ path, score: scoreValue(answers, `file_${index}`) }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

export function formatContext(task: string, selected: RankedFile[]): string {
  const lines = [
    '# Jev context router',
    '',
    `Task: ${task}`,
    '',
    '## Open these first',
    '',
    ...selected.map((entry) => `- ${entry.path} (score ${entry.score.toFixed(2)}/${SCORE_LEVELS.length - 1})`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function parseArgs(argv: string[]): RouterOptions {
  const args = argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  const valueFlags = new Set(['--task', '--root', '--candidates', '--top', '--min-score', '--out', '--model']);
  const positional: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (valueFlags.has(args[index])) {
      index += 1;
      continue;
    }
    if (!args[index].startsWith('--')) positional.push(args[index]);
  }
  const task = value('--task') ?? positional.join(' ').trim();
  if (!task) throw new Error('Provide a task: positional text or --task "..."');
  return {
    task,
    root: value('--root') ?? ROOT,
    candidates: Number(value('--candidates') ?? 40),
    top: Number(value('--top') ?? 10),
    minScore: Number(value('--min-score') ?? 1.5),
    out: value('--out') ?? DEFAULT_OUT,
    model: value('--model') ?? JEV_DEFAULT_MODEL,
    dry: args.includes('--dry'),
  };
}

export async function runRouter(options: RouterOptions, deps: RouterDeps = {}): Promise<RouterReport> {
  const ask = deps.askJev ?? (askJev as AskJevFn);
  const readFile = deps.readFile ?? ((path: string) => readFileSync(path, 'utf8'));
  const writeFile = deps.writeFile ?? ((path: string, contents: string) => writeFileSync(path, contents));

  const corpus = collectCandidates(options.root);
  const shortlist = lexicalShortlist(options.root, corpus, options.task, options.candidates, readFile);
  const state = buildState(options.task, options.root, shortlist, readFile);
  const questions = buildQuestions(shortlist.length);

  const report: RouterReport = {
    schemaVersion: 1,
    task: options.task,
    model: options.model,
    generatedAt: new Date().toISOString(),
    totals: {
      corpusFiles: corpus.length,
      shortlist: shortlist.length,
      selected: 0,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      selectedTokensEstimate: 0,
    },
    selected: [],
    shortlist: [],
  };

  if (options.dry) {
    console.log(JSON.stringify({ model: options.model, state, questions }, null, 2));
    return report;
  }

  if (shortlist.length === 0) {
    console.log(`[jev-context] no lexical candidate for "${options.task}"`);
    return report;
  }

  const result = await ask(state as EntryType, questions, options.model);
  const ranked = rankCandidates(shortlist, result.answers as RawAnswers);
  const selected = ranked.filter((entry) => entry.score >= options.minScore).slice(0, options.top);
  const selectedTokens = selected.reduce((sum, entry) => {
    try {
      return sum + Math.ceil(readFile(resolve(options.root, entry.path)).length / 4);
    } catch {
      return sum;
    }
  }, 0);

  report.selected = selected;
  report.shortlist = ranked;
  report.totals.selected = selected.length;
  report.totals.calls = 1;
  report.totals.inputTokens = result.usage.input_tokens;
  report.totals.outputTokens = result.usage.output_tokens;
  report.totals.selectedTokensEstimate = selectedTokens;

  console.log(`[jev-context] ${corpus.length} corpus files · ${shortlist.length} shortlisted · ${selected.length} selected (~${selectedTokens} tokens)`);
  for (const entry of selected) console.log(`[jev-context]   ${entry.score.toFixed(2)} ${entry.path}`);
  const unselected = ranked.filter((entry) => entry.score < options.minScore);
  if (unselected.length > 0) {
    const shown = unselected.slice(0, 10).map((entry) => entry.path).join(', ');
    const more = unselected.length > 10 ? ` …and ${unselected.length - 10} more` : '';
    console.log(`[jev-context] dropped: ${shown}${more}`);
  }
  console.log(`[jev-context] ${report.totals.inputTokens} in / ${report.totals.outputTokens} out tokens`);

  mkdirSync(dirname(options.out), { recursive: true });
  writeFile(`${options.out}.json`, `${JSON.stringify(report, null, 2)}\n`);
  writeFile(`${options.out}.md`, formatContext(options.task, selected));
  console.log(`[jev-context] report: ${options.out}.json`);
  return report;
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
  try {
    const options = parseArgs(process.argv);
    runRouter(options).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
