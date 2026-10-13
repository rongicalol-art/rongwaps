import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { Questions, SystemOneResult } from '@typesafe-ai/sdk';
import type { CourseExamplePack, CourseExampleRecord } from '../../src/types/models';
import type { AskJevFn } from '../../scripts/jev/lintRules';
import { reviewFingerprint } from '../../scripts/jev/reviewSupport';
import {
  buildCourseQuestions, buildCourseState, courseVerdict, parseCourseArgs, runCourseReview, selectCourseRecords,
} from '../../scripts/jev/reviewCourseExamples';

const RECORD: CourseExampleRecord = {
  id: 'B1L15-1-01-D01L01', sourceCardId: 'B1L15-1-01', sourceFront: '動物', sourceMeaning: 'animal',
  bookId: 1, lessonId: 15, partId: 1, traditional: '我喜歡喝茶。', simplified: '我喜欢喝茶。',
  pinyin: 'Wǒ xǐhuān hē chá.', english: 'I like drinking tea.',
  printedPage: 344, sourceOcrId: 'B1L15-D01-L01', provenance: 'textbook-ocr', confidence: 'high',
};
const pack = (records: CourseExampleRecord[]): CourseExamplePack => ({ schemaVersion: 1, bookId: 1, count: records.length, records });
const GOOD = Object.fromEntries(['translation_faithful', 'chinese_natural', 'pinyin_correct', 'scripts_equivalent'].map((id) => [id, { noul: 0.95 }]));

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'jev-course-'));
  const input = join(directory, 'preview.json');
  const baseline = join(directory, 'baseline.json');
  const out = join(directory, 'latest.json');
  writeFileSync(input, JSON.stringify(pack([RECORD])));
  writeFileSync(baseline, JSON.stringify(pack([])));
  return { directory, input, baseline, out, options: parseCourseArgs(['node', 'script', '--input', input, '--baseline', baseline, '--out', out]) };
}

test('changed selection includes additions/edits and respects lesson filters; grouped source words need not occur', () => {
  const options = parseCourseArgs(['node', 'script']);
  assert.equal(selectCourseRecords(pack([RECORD]), pack([RECORD]), options).length, 0);
  assert.equal(selectCourseRecords(pack([RECORD]), pack([]), options).length, 1);
  assert.equal(selectCourseRecords(pack([{ ...RECORD, pinyin: 'bad' }]), pack([RECORD]), options).length, 1);
  assert.equal(selectCourseRecords(pack([RECORD]), pack([]), { ...options, lessons: [11] }).length, 0);
  assert.equal(selectCourseRecords(pack([RECORD]), null, { ...options, all: true }).length, 1);
  assert.throws(() => selectCourseRecords(pack([RECORD]), null, options), /baseline/);
  assert.deepEqual(courseVerdict(RECORD, GOOD), []);
  assert.throws(() => selectCourseRecords(pack([RECORD, RECORD]), pack([]), options), /duplicate/);
});

test('questions separate naturalness, translation, pinyin and script equivalence; no scan-verification judgment', () => {
  assert.deepEqual(Object.keys(buildCourseQuestions(RECORD)), ['translation_faithful', 'chinese_natural', 'pinyin_correct', 'scripts_equivalent']);
  assert.deepEqual(Object.keys(buildCourseQuestions({ ...RECORD, simplified: undefined })), ['translation_faithful', 'chinese_natural', 'pinyin_correct']);
  assert.ok(courseVerdict(RECORD, { ...GOOD, pinyin_correct: { noul: 0.1 } }).some((issue) => issue.startsWith('pinyin_correct')));
  assert.ok(courseVerdict(RECORD, { ...GOOD, pinyin_correct: { noul: Number.NaN } }).some((issue) => issue.includes('invalid')));
  assert.ok(courseVerdict(RECORD, {}).every((issue) => issue.includes('missing/invalid')));
});

test('review fingerprints invalidate changed evidence, questions and models', () => {
  const first = reviewFingerprint({ record: RECORD }, buildCourseQuestions(RECORD), 'jev-1');
  assert.notEqual(first, reviewFingerprint({ record: { ...RECORD, pinyin: 'bad' } }, buildCourseQuestions(RECORD), 'jev-1'));
  assert.notEqual(first, reviewFingerprint({ record: RECORD }, {}, 'jev-1'));
  assert.notEqual(first, reviewFingerprint({ record: RECORD }, buildCourseQuestions(RECORD), 'jev-2'));
});

test('dialogue context stays within the source dialogue and changes invalidate the review', () => {
  const previous = { ...RECORD, id: 'previous', sourceOcrId: 'B1L15-D01-L01', traditional: '這本書有很多動物。' };
  const current = { ...RECORD, id: 'current', sourceOcrId: 'B1L15-D01-L02', traditional: '有哪些動物？' };
  const other = { ...RECORD, id: 'other', sourceOcrId: 'B1L15-D02-L01' };
  const state = buildCourseState(current, [current, other, previous]);
  assert.deepEqual(state.context.map((line) => line.sourceOcrId), ['B1L15-D01-L01']);
  const changed = buildCourseState(current, [current, { ...previous, traditional: '這個公園有很多動物。' }]);
  assert.notEqual(reviewFingerprint(state, buildCourseQuestions(current), 'jev'), reviewFingerprint(changed, buildCourseQuestions(current), 'jev'));
  const selected = selectCourseRecords(pack([current, { ...previous, traditional: '這個公園有很多動物。' }]), pack([current, previous]), parseCourseArgs(['node', 'script']));
  assert.ok(selected.some((record) => record.id === current.id), 'changed context also selects an unchanged dependent sentence');
});

test('review resumes current results but rejudges a changed record; queue preserves source evidence', async () => {
  const f = fixture();
  let calls = 0;
  const ask: AskJevFn = async (_state, questions, model) => {
    calls += 1;
    return { model, usage: { input_tokens: 100, output_tokens: 10 }, answers: Object.fromEntries(Object.keys(questions).map((id) => [id, { noul: calls === 1 || id !== 'pinyin_correct' ? 0.95 : 0.1 }])) } as SystemOneResult<Questions>;
  };
  try {
    assert.equal((await runCourseReview(f.options, ask)).review, 0);
    assert.equal((await runCourseReview(f.options, ask)).calls, 0);
    const edited = { ...RECORD, pinyin: 'Wǒ xǐhuān hē kāfēi.' };
    writeFileSync(f.input, JSON.stringify(pack([edited])));
    const result = await runCourseReview(f.options, ask);
    assert.equal(calls, 2);
    assert.equal(result.review, 1);
    assert.equal(result.inputTokens, 100);
    const queue = JSON.parse(readFileSync(join(f.directory, 'latest-review.json'), 'utf8'));
    assert.equal(queue.queue[0].record.pinyin, edited.pinyin);
    assert.equal(queue.queue[0].record.printedPage, 344);
    assert.equal(queue.queue[0].sourceJson, 'output/ocr/modern_chinese_1/lesson-15/lesson.json');
    const saved = JSON.parse(readFileSync(f.out, 'utf8'));
    assert.equal(saved.items.length, 1, 'edited records replace stale judgments');
    assert.equal(readFileSync(f.input, 'utf8'), JSON.stringify(pack([edited])), 'QA never rewrites source input');
  } finally { rmSync(f.directory, { recursive: true, force: true }); }
});

test('missing pinyin and needs-review sources enter the queue without model calls; strict mode fails', async () => {
  const f = fixture();
  const originalExit = process.exitCode;
  writeFileSync(f.input, JSON.stringify(pack([{ ...RECORD, pinyin: '', confidence: 'needs-review' }])));
  try {
    const result = await runCourseReview({ ...f.options, strict: true }, async () => { throw new Error('Invalid records must not call Jev'); });
    assert.equal(result.calls, 0);
    assert.equal(result.review, 1);
    assert.equal(process.exitCode, 1);
    const queue = JSON.parse(readFileSync(join(f.directory, 'latest-review.json'), 'utf8'));
    assert.deepEqual(queue.queue[0].failed, ['missing pinyin', 'source needs review']);
  } finally { process.exitCode = originalExit; rmSync(f.directory, { recursive: true, force: true }); }
});

test('dry mode makes no API calls and writes no reports', async () => {
  const f = fixture();
  try {
    const result = await runCourseReview({ ...f.options, dry: true }, async () => { throw new Error('dry called API'); });
    assert.equal(result.calls, 0);
    assert.equal(existsSync(f.out), false);
  } finally { rmSync(f.directory, { recursive: true, force: true }); }
});

test('call limits leave unreviewed items in the queue, then resume completes them', async () => {
  const f = fixture();
  writeFileSync(f.input, JSON.stringify(pack([RECORD, { ...RECORD, id: 'B1L15-1-01-D01L02' }])));
  const ask: AskJevFn = async () => ({ model: 'fake', usage: { input_tokens: 1, output_tokens: 1 }, answers: GOOD } as SystemOneResult<Questions>);
  try {
    assert.equal((await runCourseReview({ ...f.options, limit: 1 }, ask)).review, 1);
    const next = await runCourseReview({ ...f.options, limit: 1 }, ask);
    assert.equal(next.calls, 1);
    assert.equal(next.review, 0);
  } finally { rmSync(f.directory, { recursive: true, force: true }); }
});

test('invalid call controls cannot silently skip reviews', () => {
  for (const args of [['--limit', '0'], ['--limit', 'NaN'], ['--concurrency', '-1'], ['--lessons', '11,'], ['--input'], ['--all', '--changed']]) {
    assert.throws(() => parseCourseArgs(['node', 'script', ...args]));
  }
});
