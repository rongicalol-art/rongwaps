import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SystemOneResult, Questions } from '@typesafe-ai/sdk';
import type { AskJevFn } from '../scripts/jev/lintRules';
import {
  buildState,
  evaluateHandoff,
  filesFromDiff,
  formatMarkdown,
  parseArgs,
  readCrew,
  runVerify,
  type VerifyOptions,
} from '../scripts/jev/verifyHandoff';

const CREW = {
  name: 'worker_m2',
  briefing: 'Ship the grammar button divider.',
  handoff: 'Changed LessItem to add a divider. Ran npm test, all pass.',
  progress: 'Step 1 done.',
  filesChanged: ['src/screens/curriculum/LessonItem.tsx'],
};

test('filesFromDiff lists the target path of each file', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    'diff --git a/src/b.tsx b/src/b.tsx',
    '',
  ].join('\n');
  assert.deepEqual(filesFromDiff(diff), ['src/a.ts', 'src/b.tsx']);
});

test('buildState caps docs and keeps files_changed', () => {
  const state = buildState({ ...CREW, handoff: 'x'.repeat(30_000) }, 'diff');
  assert.equal(state.crew.name, 'worker_m2');
  assert.deepEqual(state.crew.files_changed, CREW.filesChanged);
  assert.match(state.crew.handoff, /truncated/);
  assert.ok(state.crew.handoff.length <= 8_100);
});

test('evaluateHandoff compares each probability to its threshold', () => {
  const verdicts = evaluateHandoff({
    claimsMatchDiff: { noul: 0.9 },
    noUnclaimedChanges: { noul: 0.4 },
    evidenceGrounded: { noul: 0.6 },
    verificationSupported: { noul: 0.2 },
  });
  assert.deepEqual(verdicts.map((verdict) => verdict.pass), [true, false, true, false]);
});

test('readCrew requires a handoff and falls back on missing docs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'jev-crew-'));
  try {
    writeFileSync(join(dir, 'handoff.md'), 'done');
    const docs = readCrew(dir, (path) => readFileSync(path, 'utf8'));
    assert.equal(docs.handoff, 'done');
    assert.equal(docs.briefing, '');
    assert.equal(docs.progress, '');

    rmSync(join(dir, 'handoff.md'));
    assert.throws(() => readCrew(dir, (path) => readFileSync(path, 'utf8')), /No handoff/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('formatMarkdown renders a verdict table', () => {
  const markdown = formatMarkdown({
    schemaVersion: 1,
    crew: 'worker_m2',
    mode: 'worktree',
    model: 'jev-1.13.0',
    generatedAt: '2026-09-22T00:00:00.000Z',
    strict: false,
    thresholds: { claimsMatchDiff: 0.6, noUnclaimedChanges: 0.6, evidenceGrounded: 0.5, verificationSupported: 0.5 },
    totals: { calls: 1, failures: 0, inputTokens: 10, outputTokens: 0 },
    verdicts: [{ id: 'claimsMatchDiff', title: 'Handoff claims match the diff', probability: 0.9, threshold: 0.6, pass: true }],
  });
  assert.match(markdown, /result: PASS/);
  assert.match(markdown, /Handoff claims match the diff \| 0.90 \| 0.6 \| pass/);
});

test('runVerify judges a crew in one call and writes both reports', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jev-crew-'));
  const diff = [
    'diff --git a/src/screens/curriculum/LessonItem.tsx b/src/screens/curriculum/LessonItem.tsx',
    '--- a/src/screens/curriculum/LessonItem.tsx',
    '+++ b/src/screens/curriculum/LessonItem.tsx',
    '@@ -1 +1 @@',
    '-const a = 1;',
    '+const a = 2;',
    '',
  ].join('\n');
  try {
    writeFileSync(join(dir, 'BRIEFING.md'), CREW.briefing);
    writeFileSync(join(dir, 'handoff.md'), CREW.handoff);
    writeFileSync(join(dir, 'progress.md'), CREW.progress);

    const calls: Questions[] = [];
    const fakeAsk: AskJevFn = async (_state, questions, model) => {
      calls.push(questions);
      return {
        model: model ?? 'fake-model',
        usage: { input_tokens: 42, output_tokens: 0 },
        answers: {
          claimsMatchDiff: { noul: 0.9 },
          noUnclaimedChanges: { noul: 0.8 },
          evidenceGrounded: { noul: 0.7 },
          verificationSupported: { noul: 0.3 },
        },
      } as unknown as SystemOneResult<Questions>;
    };

    const options: VerifyOptions = { ...parseArgs(['node', 'script', '--dir', dir]), model: 'fake-model' };
    const report = await runVerify(options, {
      askJev: fakeAsk,
      runGit: () => diff,
      readFile: (path) => readFileSync(path, 'utf8'),
      writeFile: (path, contents) => writeFileSync(path, contents),
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(Object.keys(calls[0]), ['claimsMatchDiff', 'noUnclaimedChanges', 'evidenceGrounded', 'verificationSupported']);
    assert.equal(report.totals.failures, 1);
    assert.equal(report.verdicts.find((verdict) => verdict.id === 'verificationSupported')?.pass, false);

    const written = JSON.parse(readFileSync(join(dir, 'verification.json'), 'utf8')) as { crew: string; totals: { failures: number } };
    assert.equal(written.crew, report.crew);
    assert.ok(report.crew.length > 0);
    assert.equal(written.totals.failures, 1);
    assert.match(readFileSync(join(dir, 'verification.md'), 'utf8'), /result: FAIL/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runVerify --dry makes no calls and writes nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jev-crew-'));
  try {
    writeFileSync(join(dir, 'handoff.md'), CREW.handoff);
    const options: VerifyOptions = { ...parseArgs(['node', 'script', '--dir', dir, '--dry']), model: 'fake-model' };
    const report = await runVerify(options, {
      askJev: async () => {
        throw new Error('dry run must not call Jev');
      },
      runGit: () => '',
      readFile: (path) => readFileSync(path, 'utf8'),
      writeFile: () => {
        throw new Error('dry run must not write');
      },
    });
    assert.equal(report.totals.calls, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
