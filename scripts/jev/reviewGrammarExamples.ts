/**
 * Jev review of grammar lesson examples (content/grammar/*.json).
 *
 * One request per example; all questions for that example are batched. Jev
 * judges only: translation fidelity, natural learner-level Chinese, pinyin
 * accuracy, and how clearly the example demonstrates the lesson pattern. Code
 * owns the verdict and thresholds.
 *
 * Modes:
 *   --file lessonEight.json   one content file (name under content/grammar or a path)
 *   --all                     every content/grammar/*.json file
 *   --limit N                 first N pending examples (calibration)
 *
 * Options:
 *   --concurrency N   parallel requests (default 4)
 *   --thresholds P    thresholds JSON (default output/jev/grammar/thresholds-v1.json)
 *   --out P           raw answers JSON (default output/jev/grammar/raw-v1.json)
 *   --dry             print the first request state without calling Jev
 *
 * Reruns resume by skipping example keys already present in the raw file.
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { noul, score, type Questions } from '@typesafe-ai/sdk';
import { askJev, JEV_DEFAULT_MODEL, noulValue, scoreValue, type RawAnswers } from './client';
import { readJson, readRawItems, runPool, writeJson } from './reviewSupport';

const ROOT = resolve(import.meta.dirname, '../..');
const CONTENT_DIR = resolve(ROOT, 'content/grammar');
const DEFAULT_OUT = resolve(ROOT, 'output/jev/grammar/raw-v1.json');
const DEFAULT_THRESHOLDS = resolve(ROOT, 'output/jev/grammar/thresholds-v1.json');

export interface GrammarExampleLike {
  id: string;
  number?: number;
  teachingNote?: string;
  text?: {
    traditional?: string;
    simplified?: string;
    pinyin?: string;
    english?: string;
  };
}

export interface GrammarPageLike {
  id?: string;
  titleEnglish?: string;
  pattern?: string;
  focusTerms?: string[];
  examples?: GrammarExampleLike[];
}

export interface GrammarThresholds {
  translationFaithful: number;
  chineseNatural: number;
  pinyinCorrect: number;
  patternFit: number;
}

export const DEFAULT_GRAMMAR_THRESHOLDS: GrammarThresholds = {
  translationFaithful: 0.7,
  chineseNatural: 0.6,
  pinyinCorrect: 0.7,
  patternFit: 1.5,
};

export interface GrammarReviewItem {
  key: string;
  state: GrammarState;
  answers: RawAnswers;
  resolvedModel?: string;
  at?: string;
}

export type GrammarState = {
  lesson: { title: string; pattern: string; focus_terms: string[] };
  example: {
    traditional: string;
    simplified: string | null;
    pinyin: string | null;
    english: string | null;
    teaching_note: string | null;
  };
};

export interface GrammarOptions {
  file: string | null;
  all: boolean;
  limit: number | null;
  concurrency: number;
  thresholdsPath: string;
  out: string;
  dry: boolean;
}

export interface GrammarCandidate {
  key: string;
  page: GrammarPageLike;
  example: GrammarExampleLike;
}

export function listGrammarFiles(): string[] {
  return readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.json')).sort();
}

export function collectGrammarCandidates(fileName: string, content: Record<string, unknown>): GrammarCandidate[] {
  const candidates: GrammarCandidate[] = [];
  for (const value of Object.values(content)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const page = value as GrammarPageLike;
    if (!Array.isArray(page.examples)) continue;
    for (const example of page.examples) {
      if (!example?.id) continue;
      candidates.push({ key: `${fileName}:${example.id}`, page, example });
    }
  }
  return candidates;
}

export function buildGrammarState(candidate: GrammarCandidate): GrammarState {
  const { page, example } = candidate;
  return {
    lesson: {
      title: page.titleEnglish ?? '',
      pattern: page.pattern ?? '',
      focus_terms: page.focusTerms ?? [],
    },
    example: {
      traditional: example.text?.traditional ?? '',
      simplified: example.text?.simplified ?? null,
      pinyin: example.text?.pinyin ?? null,
      english: example.text?.english ?? null,
      teaching_note: example.teachingNote ?? null,
    },
  };
}

export function buildGrammarQuestions(state: GrammarState): Questions {
  const questions: Record<string, unknown> = {
    translation_faithful: noul(
      'Does `example.english` accurately translate `example.traditional`, including its tense, aspect, and particles?',
      {
        true: 'The English matches the Chinese meaning and grammar.',
        false: 'The English misses, adds, or changes meaning.',
      },
    ),
    chinese_natural: noul(
      'Is `example.traditional` natural, idiomatic Chinese for a learner at this lesson level, and does it clearly contain `lesson.pattern`?',
      {
        true: 'The Chinese is natural and demonstrates the pattern.',
        false: 'The Chinese is awkward or does not clearly show the pattern.',
      },
    ),
    pattern_fit: score(
      'How clearly does `example.traditional` demonstrate `lesson.pattern`?',
      [
        'Does not show the pattern.',
        'Contains the pattern but obscures it.',
        'Clearly shows the pattern with light support from context.',
        'Textbook-clear demonstration of the pattern.',
      ],
    ),
  };
  if (state.example.pinyin) {
    questions.pinyin_correct = noul(
      'Does `example.pinyin` match `example.traditional` (tones, syllables, spacing) with no missing or extra syllables?',
      {
        true: 'Pinyin matches the Chinese exactly.',
        false: 'Pinyin has tone, syllable, or spacing errors.',
      },
    );
  }
  return questions as Questions;
}

export function grammarVerdict(answers: RawAnswers, state: GrammarState, thresholds: GrammarThresholds = DEFAULT_GRAMMAR_THRESHOLDS): { pass: boolean; failed: string[] } {
  const failed: string[] = [];
  const faithful = noulValue(answers, 'translation_faithful');
  const natural = noulValue(answers, 'chinese_natural');
  const fit = scoreValue(answers, 'pattern_fit');
  if (faithful < thresholds.translationFaithful) failed.push(`translation ${faithful.toFixed(2)}`);
  if (natural < thresholds.chineseNatural) failed.push(`natural ${natural.toFixed(2)}`);
  if (fit < thresholds.patternFit) failed.push(`pattern ${fit.toFixed(2)}`);
  if (state.example.pinyin) {
    const pinyin = noulValue(answers, 'pinyin_correct');
    if (pinyin < thresholds.pinyinCorrect) failed.push(`pinyin ${pinyin.toFixed(2)}`);
  }
  return { pass: failed.length === 0, failed };
}

export function parseGrammarArgs(argv: string[]): GrammarOptions {
  const args = argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    file: value('--file'),
    all: args.includes('--all'),
    limit: value('--limit') ? Number(value('--limit')) : null,
    concurrency: Number(value('--concurrency') ?? 4),
    thresholdsPath: value('--thresholds') ?? DEFAULT_THRESHOLDS,
    out: value('--out') ?? DEFAULT_OUT,
    dry: args.includes('--dry'),
  };
}

export function selectGrammarCandidates(options: GrammarOptions): GrammarCandidate[] {
  const files = options.all
    ? listGrammarFiles()
    : options.file
      ? [options.file]
      : (() => {
          throw new Error('Choose a mode: --file lessonEight.json or --all');
        })();
  const candidates = files.flatMap((fileName) => {
    const path = fileName.includes('/') ? fileName : resolve(CONTENT_DIR, fileName);
    return collectGrammarCandidates(fileName, readJson<Record<string, unknown>>(path));
  });
  return options.limit ? candidates.slice(0, options.limit) : candidates;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const options = parseGrammarArgs(argv);
  const thresholds = existsSync(options.thresholdsPath)
    ? { ...DEFAULT_GRAMMAR_THRESHOLDS, ...readJson<Partial<GrammarThresholds>>(options.thresholdsPath) }
    : DEFAULT_GRAMMAR_THRESHOLDS;

  const selected = selectGrammarCandidates(options);
  const existing = readRawItems<GrammarReviewItem>(options.out);
  const done = new Set(existing.map((item) => item.key));
  const pending = selected.filter((candidate) => !done.has(candidate.key));
  console.log(`Jev grammar review: ${selected.length} examples · ${done.size} already done · ${pending.length} to run`);

  if (options.dry) {
    const first = pending[0];
    if (!first) {
      console.log('Nothing pending.');
      return;
    }
    const state = buildGrammarState(first);
    console.log(JSON.stringify({ model: JEV_DEFAULT_MODEL, state, questions: buildGrammarQuestions(state) }, null, 2));
    return;
  }

  const results: GrammarReviewItem[] = [...existing];
  let completed = 0;
  await runPool(pending, options.concurrency, async (candidate) => {
    const state = buildGrammarState(candidate);
    const result = await askJev(state, buildGrammarQuestions(state));
    const answers = result.answers as unknown as RawAnswers;
    results.push({ key: candidate.key, state, answers, resolvedModel: result.model, at: new Date().toISOString() });
    completed += 1;
    if (completed % 10 === 0 || completed === pending.length) {
      const { pass, failed } = grammarVerdict(answers, state, thresholds);
      writeJson(options.out, { schemaVersion: 1, thresholds, items: results });
      console.log(`[${completed}/${pending.length}] ${candidate.key} ${pass ? 'pass' : `FAIL (${failed.join(', ')})`}`);
    }
  });

  writeJson(options.out, { schemaVersion: 1, thresholds, items: results });
  const passCount = results.filter((item) => grammarVerdict(item.answers, item.state, thresholds).pass).length;
  console.log(`Done: ${passCount}/${results.length} pass at current thresholds`);
  console.log(`Wrote ${options.out}`);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
