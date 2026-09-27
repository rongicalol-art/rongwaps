/**
 * Jev review of word hooks (the word layer that follows the character review).
 *
 * One request per word; all questions for that word are batched. Jev judges
 * only: are the character meanings used honestly, does the hook resolve to the
 * target meaning, is it a concrete image, and how memorable is it. Code owns
 * the verdict and the thresholds.
 *
 * Modes:
 *   --all             every record in the word-hooks input
 *   --words 一半,一共  explicit words
 *   --limit N         first N pending records (useful for calibration)
 *
 * Options:
 *   --input P         word-hooks JSON (default output/memory-hooks/book-1-word-hooks-v1.json)
 *   --concurrency N   parallel requests (default 4)
 *   --thresholds P    thresholds JSON (default output/jev/word-hooks/thresholds-v1.json)
 *   --out P           raw answers JSON (default output/jev/word-hooks/raw-v1.json)
 *   --dry             print the first request state without calling Jev
 *
 * Reruns resume by skipping words already present in the raw file.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { noul, score, type Questions } from '@typesafe-ai/sdk';
import { askJev, JEV_DEFAULT_MODEL, noulValue, scoreValue, type RawAnswers } from './client';
import { readJson, readRawItems, runPool, writeJson } from './reviewSupport';

const ROOT = resolve(import.meta.dirname, '../..');
const DEFAULT_INPUT = resolve(ROOT, 'output/memory-hooks/book-1-word-hooks-v1.json');
const DEFAULT_OUT = resolve(ROOT, 'output/jev/word-hooks/raw-v1.json');
const DEFAULT_THRESHOLDS = resolve(ROOT, 'output/jev/word-hooks/thresholds-v1.json');

export interface WordRecord {
  word: string;
  pinyin: string;
  meaning: string;
  characters: Array<{ char: string; meaning: string }>;
  hook: string;
}

export interface WordThresholds {
  grounded: number;
  meaningMatch: number;
  concrete: number;
  memorability: number;
}

export const DEFAULT_WORD_THRESHOLDS: WordThresholds = {
  grounded: 0.5,
  meaningMatch: 0.7,
  concrete: 0.5,
  memorability: 1.8,
};

export interface WordReviewItem {
  word: string;
  state: WordState;
  answers: RawAnswers;
  resolvedModel?: string;
  at?: string;
}

export type WordState = {
  word: {
    text: string;
    pinyin: string;
    meaning: string;
    characters: Array<{ glyph: string; meaning: string }>;
  };
  hook: string;
};

export interface WordOptions {
  all: boolean;
  words: string[] | null;
  limit: number | null;
  input: string;
  concurrency: number;
  thresholdsPath: string;
  out: string;
  dry: boolean;
}

export function buildWordState(record: WordRecord): WordState {
  return {
    word: {
      text: record.word,
      pinyin: record.pinyin,
      meaning: record.meaning,
      characters: record.characters.map((character) => ({
        glyph: character.char,
        meaning: character.meaning,
      })),
    },
    hook: record.hook,
  };
}

export function buildWordQuestions(): Questions {
  return {
    hook_grounded: noul(
      'Does `hook` use each glyph in `word.characters` only with the meaning listed for it, without inventing a different meaning?',
      {
        true: 'Every glyph is used with its listed meaning.',
        false: 'A glyph is given a meaning that is not listed.',
      },
    ),
    meaning_match: noul(
      'Does `hook` lead to `word.meaning` as the outcome of the image or relation it describes?',
      {
        true: 'The hook resolves to the target meaning.',
        false: 'The hook resolves to a different or unclear meaning.',
      },
    ),
    hook_concrete: noul(
      'Does `hook` describe a concrete image or relation between the glyphs, rather than only restating what the word means?',
      {
        true: 'The hook gives a concrete image or relation.',
        false: 'The hook only restates the meaning or lists parts.',
      },
    ),
    memorability: score(
      'How well does `hook` work as a memory device for `word.meaning`?',
      [
        'Incoherent, or contradicts the characters.',
        'Restates the meaning without an image.',
        'Plain but real image a learner can retell.',
        'Vivid image that lands the meaning.',
      ],
    ),
  };
}

export function wordVerdict(answers: RawAnswers, thresholds: WordThresholds = DEFAULT_WORD_THRESHOLDS): { pass: boolean; failed: string[] } {
  const failed: string[] = [];
  const grounded = noulValue(answers, 'hook_grounded');
  const meaning = noulValue(answers, 'meaning_match');
  const concrete = noulValue(answers, 'hook_concrete');
  const memory = scoreValue(answers, 'memorability');
  if (grounded < thresholds.grounded) failed.push(`grounded ${grounded.toFixed(2)}`);
  if (meaning < thresholds.meaningMatch) failed.push(`meaning ${meaning.toFixed(2)}`);
  if (concrete < thresholds.concrete) failed.push(`concrete ${concrete.toFixed(2)}`);
  if (memory < thresholds.memorability) failed.push(`memory ${memory.toFixed(2)}`);
  return { pass: failed.length === 0, failed };
}

export function parseWordArgs(argv: string[]): WordOptions {
  const args = argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    all: args.includes('--all'),
    words: value('--words')?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? null,
    limit: value('--limit') ? Number(value('--limit')) : null,
    input: value('--input') ?? DEFAULT_INPUT,
    concurrency: Number(value('--concurrency') ?? 4),
    thresholdsPath: value('--thresholds') ?? DEFAULT_THRESHOLDS,
    out: value('--out') ?? DEFAULT_OUT,
    dry: args.includes('--dry'),
  };
}

export function selectWords(records: WordRecord[], options: WordOptions): WordRecord[] {
  if (options.words) {
    const wanted = new Set(options.words);
    return records.filter((record) => wanted.has(record.word));
  }
  if (options.all) return records;
  if (options.limit) return records.slice(0, options.limit);
  throw new Error('Choose a mode: --all, --words 一半,一共, or --limit N');
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const options = parseWordArgs(argv);
  const thresholds = existsSync(options.thresholdsPath)
    ? { ...DEFAULT_WORD_THRESHOLDS, ...readJson<Partial<WordThresholds>>(options.thresholdsPath) }
    : DEFAULT_WORD_THRESHOLDS;

  const records = readJson<{ records: WordRecord[] }>(options.input).records;
  const selected = selectWords(records, options);
  const existing = readRawItems<WordReviewItem>(options.out);
  const done = new Set(existing.map((item) => item.word));
  const pending = selected.filter((record) => !done.has(record.word));
  console.log(`Jev word review: ${selected.length} words · ${done.size} already done · ${pending.length} to run`);

  if (options.dry) {
    const first = pending[0];
    if (!first) {
      console.log('Nothing pending.');
      return;
    }
    console.log(JSON.stringify({
      model: JEV_DEFAULT_MODEL,
      state: buildWordState(first),
      questions: buildWordQuestions(),
    }, null, 2));
    return;
  }

  const results: WordReviewItem[] = [...existing];
  let completed = 0;
  await runPool(pending, options.concurrency, async (record) => {
    const state = buildWordState(record);
    const result = await askJev(state, buildWordQuestions());
    const answers = result.answers as unknown as RawAnswers;
    results.push({ word: record.word, state, answers, resolvedModel: result.model, at: new Date().toISOString() });
    completed += 1;
    if (completed % 10 === 0 || completed === pending.length) {
      const { pass, failed } = wordVerdict(answers, thresholds);
      writeJson(options.out, { schemaVersion: 1, thresholds, items: results });
      console.log(`[${completed}/${pending.length}] ${record.word} ${pass ? 'pass' : `FAIL (${failed.join(', ')})`}`);
    }
  });

  writeJson(options.out, { schemaVersion: 1, thresholds, items: results });
  const passCount = results.filter((item) => wordVerdict(item.answers, thresholds).pass).length;
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
