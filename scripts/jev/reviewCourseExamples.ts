/**
 * Review a scratch course-example preview before publishing packs.
 * Default: additions/edits relative to the published Book 1 pack. --all reviews
 * every preview record; --lessons 11,12 filters either mode; --limit N caps
 * pending calls. --dry makes no calls/writes; --strict fails on review items.
 * Jev judges text only. No pinyin generation, source verification, or pack writes.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { noul, type Questions } from '@typesafe-ai/sdk';
import type { CourseExamplePack, CourseExampleRecord } from '../../src/types/models';
import { askJev, JEV_DEFAULT_MODEL, type RawAnswers } from './client';
import type { AskJevFn } from './lintRules';
import { readJson, readRawItems, reviewFingerprint, runPool, writeJson } from './reviewSupport';

const ROOT = resolve(import.meta.dirname, '../..');
export const COURSE_THRESHOLDS = {
  translation_faithful: 0.7,
  chinese_natural: 0.6,
  pinyin_correct: 0.7,
  scripts_equivalent: 0.7,
};

export interface CourseReviewOptions {
  input: string;
  baseline: string;
  out: string;
  all: boolean;
  lessons: number[] | null;
  limit: number | null;
  concurrency: number;
  dry: boolean;
  strict: boolean;
}

export interface CourseReviewItem {
  key: string;
  fingerprint: string;
  record: CourseExampleRecord;
  answers: RawAnswers;
  resolvedModel: string;
}

export function buildCourseState(record: CourseExampleRecord, records: CourseExampleRecord[]) {
  const dialogue = record.sourceOcrId?.match(/^(B\d+L\d+-D\d+)-L\d+$/)?.[1];
  const lines = dialogue ? records.filter((other) => other.bookId === record.bookId
    && other.lessonId === record.lessonId && other.partId === record.partId
    && typeof other.sourceOcrId === 'string' && other.sourceOcrId.startsWith(`${dialogue}-L`)
    && typeof other.traditional === 'string' && typeof other.english === 'string'
    && (other.confidence === 'high' || other.confidence === 'medium'))
    .sort((a, b) => a.sourceOcrId.localeCompare(b.sourceOcrId, undefined, { numeric: true })) : [];
  const index = lines.findIndex((line) => line.id === record.id);
  const context = index < 0 ? [] : lines.slice(Math.max(0, index - 2), index + 2)
    .filter((line) => line.id !== record.id)
    .map((line) => ({ sourceOcrId: line.sourceOcrId, traditional: line.traditional, english: line.english }));
  return { record: { ...record }, context };
}

export function parseCourseArgs(argv: string[]): CourseReviewOptions {
  const args = argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    if (index < 0) return null;
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} needs a value`);
    return args[index + 1];
  };
  const positive = (raw: string, label: string): number => {
    const number = Number(raw);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} must be a positive integer`);
    return number;
  };
  if (args.includes('--all') && args.includes('--changed')) throw new Error('Choose --all or --changed');
  const lessons = value('--lessons');
  const limit = value('--limit');
  return {
    input: resolve(value('--input') ?? resolve(ROOT, 'output/course-examples/book-1-preview.json')),
    baseline: resolve(value('--baseline') ?? resolve(ROOT, 'public/data/course-examples/book-1.json')),
    out: resolve(value('--out') ?? resolve(ROOT, 'output/jev/course-examples/latest.json')),
    all: args.includes('--all'),
    lessons: lessons ? lessons.split(',').map((lesson) => positive(lesson, '--lessons')) : null,
    limit: limit ? positive(limit, '--limit') : null,
    concurrency: positive(value('--concurrency') ?? '4', '--concurrency'),
    dry: args.includes('--dry'),
    strict: args.includes('--strict'),
  };
}

export function validateCoursePack(pack: CourseExamplePack): void {
  if (pack.schemaVersion !== 1 || !Array.isArray(pack.records) || pack.count !== pack.records.length) {
    throw new Error('Invalid course-example pack schema or count');
  }
  const ids = new Set<string>();
  for (const record of pack.records) {
    if (!record?.id || ids.has(record.id) || record.bookId !== pack.bookId) throw new Error('Invalid or duplicate course-example ID/book');
    ids.add(record.id);
  }
}

export function selectCourseRecords(pack: CourseExamplePack, baseline: CourseExamplePack | null, options: CourseReviewOptions): CourseExampleRecord[] {
  validateCoursePack(pack);
  if (baseline) validateCoursePack(baseline);
  if (!options.all && (!baseline || baseline.bookId !== pack.bookId)) throw new Error('Changed review needs a baseline for the same book; use --baseline or --all');
  const previous = new Map(baseline?.records.map((record) => [record.id, record]) ?? []);
  return pack.records.filter((record) => {
    if (options.lessons && !options.lessons.includes(record.lessonId)) return false;
    const old = previous.get(record.id);
    return options.all || !old || JSON.stringify(buildCourseState(record, pack.records))
      !== JSON.stringify(buildCourseState(old, baseline!.records));
  });
}

export function courseRecordIssues(record: CourseExampleRecord): string[] {
  const issues: string[] = [];
  for (const field of ['traditional', 'pinyin', 'english', 'sourceCardId', 'sourceOcrId'] as const) {
    if (typeof record[field] !== 'string' || !record[field].trim()) issues.push(`missing ${field}`);
  }
  if (record.confidence !== 'high' && record.confidence !== 'medium') issues.push('source needs review');
  if (!['textbook-ocr', 'authored'].includes(record.provenance)) issues.push('missing provenance');
  return issues;
}

export function buildCourseQuestions(record: CourseExampleRecord): Questions {
  const questions: Questions = {
    translation_faithful: noul(
      'Does `record.english` accurately translate `record.traditional`, including negation, quantities, aspect, and named entities? `context` contains neighboring source dialogue lines, in source order. Accept natural paraphrases and explicit English referents established by their Chinese context (for example "in the book" after discussing a book). Flag additions unsupported by the supplied Chinese, losses, or contradictions. Context English is supporting material, not independent proof.',
      { true: 'The meanings agree.', false: 'The English adds, loses, or changes meaning.' },
    ),
    chinese_natural: noul(
      'Is `record.traditional` natural Taiwan Mandarin in a textbook dialogue or reading, given the neighboring source lines in `context` when supplied? Accept conversational fragments, polite forms and dialogue punctuation. No taught-vocabulary inventory is supplied; do not invent additional context or judge curriculum difficulty.',
      { true: 'Natural Taiwan Mandarin.', false: 'Awkward or unidiomatic Chinese.' },
    ),
    pinyin_correct: noul(
      'Does `record.pinyin` accurately represent `record.traditional`? Accept Taiwan Mandarin readings, neutral tones, erhua, citation-tone or spoken sandhi conventions for 一/不, capitalization and reasonable word spacing. Flag wrong readings or tones, and missing/extra syllables. This judgment cannot establish what a textbook scan prints.',
      { true: 'The pinyin accurately represents the Chinese.', false: 'A reading, tone, or syllable is incorrect.' },
    ),
  };
  if (record.simplified?.trim()) {
    questions.scripts_equivalent = noul(
      'Do `record.simplified` and `record.traditional` express the same sentence after script conversion? Accept Taiwan/Mainland character variants; flag changed words or meaning.',
      { true: 'Equivalent sentences in the two scripts.', false: 'Words or meaning differ.' },
    );
  }
  return questions;
}

export function courseVerdict(record: CourseExampleRecord, answers: RawAnswers): string[] {
  const failed = courseRecordIssues(record);
  for (const id of Object.keys(buildCourseQuestions(record)) as Array<keyof typeof COURSE_THRESHOLDS>) {
    const probability = (answers[id] as { noul?: number } | undefined)?.noul;
    if (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) {
      failed.push(`${id}: missing/invalid judgment`);
    } else if (probability < COURSE_THRESHOLDS[id]) {
      failed.push(`${id}: ${probability.toFixed(2)} < ${COURSE_THRESHOLDS[id]}`);
    }
  }
  return failed;
}

export async function runCourseReview(options: CourseReviewOptions, ask: AskJevFn = askJev as AskJevFn) {
  if (!existsSync(options.input)) throw new Error('Preview missing: run npm run course-examples:preview first, or provide --input');
  const pack = readJson<CourseExamplePack>(options.input);
  const baseline = options.all ? null : readJson<CourseExamplePack>(options.baseline);
  const selected = selectCourseRecords(pack, baseline, options);
  const cached = new Map(readRawItems<CourseReviewItem>(options.out).map((item) => [item.key, item]));
  const state = (record: CourseExampleRecord) => buildCourseState(record, pack.records);
  const fingerprint = (record: CourseExampleRecord) => reviewFingerprint(state(record), buildCourseQuestions(record), JEV_DEFAULT_MODEL);
  const pending = selected.filter((record) => courseRecordIssues(record).length === 0
    && cached.get(record.id)?.fingerprint !== fingerprint(record));
  const limited = options.limit ? pending.slice(0, options.limit) : pending;
  console.log(`Jev course review: ${selected.length} selected · ${pending.length} pending · ${limited.length} calls planned`);
  if (options.dry) {
    if (limited[0]) console.log(JSON.stringify({ model: JEV_DEFAULT_MODEL, state: state(limited[0]), questions: buildCourseQuestions(limited[0]) }, null, 2));
    return { selected: selected.length, calls: 0, review: 0, inputTokens: 0, outputTokens: 0, dry: true };
  }
  let inputTokens = 0;
  let outputTokens = 0;
  await runPool(limited, options.concurrency, async (record) => {
    const result = await ask(state(record), buildCourseQuestions(record), JEV_DEFAULT_MODEL);
    cached.set(record.id, { key: record.id, fingerprint: fingerprint(record), record, answers: result.answers as RawAnswers, resolvedModel: result.model });
    inputTokens += result.usage.input_tokens;
    outputTokens += result.usage.output_tokens;
    writeJson(options.out, { schemaVersion: 1, items: [...cached.values()] });
  });
  const queue = selected.flatMap((record) => {
    const issues = courseRecordIssues(record);
    const current = cached.get(record.id);
    const failed = issues.length ? issues : current?.fingerprint === fingerprint(record)
      ? courseVerdict(record, current.answers) : ['not reviewed (call limit)'];
    return failed.length ? [{ record, sourceJson: record.provenance === 'textbook-ocr'
      ? `output/ocr/modern_chinese_${record.bookId}/lesson-${record.lessonId}/lesson.json` : null, failed }] : [];
  });
  const totals = { selected: selected.length, calls: limited.length, review: queue.length, inputTokens, outputTokens };
  const queuePath = options.out.replace(/\.json$/, '') + '-review.json';
  writeJson(options.out, { schemaVersion: 1, generatedAt: new Date().toISOString(), model: JEV_DEFAULT_MODEL, thresholds: COURSE_THRESHOLDS, totals, items: [...cached.values()] });
  writeJson(queuePath, { schemaVersion: 1, input: options.input, thresholds: COURSE_THRESHOLDS, totals, queue });
  const markdown = ['# Course-example review queue', '', 'Text judgments only; thresholds are provisional. Jev never verifies scans or authorizes publication.', '',
    ...queue.flatMap(({ record, sourceJson, failed }) => [`## ${record.id}`, '',
      `Book ${record.bookId}, lesson ${record.lessonId}, part ${record.partId}; printed page ${record.printedPage ?? 'not recorded'}; OCR ID ${record.sourceOcrId}.`, '',
      `Source: ${sourceJson ?? 'authored record; inspect its authoring source'}`, '', record.traditional, '', record.pinyin, '', record.english, '',
      ...failed.map((issue) => `- ${issue}`), '']),
    ...(queue.length ? [] : ['No review items in the selected records.', '']),
  ].join('\n');
  writeFileSync(queuePath.replace(/\.json$/, '.md'), markdown);
  console.log(`Course QA: ${totals.selected} selected · ${totals.review} need review · ${totals.inputTokens} in / ${totals.outputTokens} out tokens`);
  console.log(`Review queue: ${queuePath}`);
  if (options.strict && queue.length) process.exitCode = 1;
  return totals;
}

if (import.meta.url === (process.argv[1] ? pathToFileURL(process.argv[1]).href : '')) {
  runCourseReview(parseCourseArgs(process.argv)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
