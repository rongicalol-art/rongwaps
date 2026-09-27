import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SystemOneResult, Questions } from '@typesafe-ai/sdk';
import {
  buildState,
  changedLines,
  evaluateAnswers,
  globToRegExp,
  parseArgs,
  parseFileDiffs,
  runLint,
  selectRules,
  truncate,
  type AskJevFn,
  type LintOptions,
} from '../scripts/jev/lintRules';
import { LINT_RULES } from '../scripts/jev/lintRuleSet';

test('globToRegExp matches brace expansions with and without nested directories', () => {
  const ui = globToRegExp('src/**/*.{ts,tsx}');
  assert.equal(ui.test('src/screens/curriculum/LessonItem.tsx'), true);
  assert.equal(ui.test('src/App.tsx'), true);
  assert.equal(ui.test('server/index.ts'), false);
  assert.equal(ui.test('docs/notes.md'), false);

  const root = globToRegExp('*.config.js');
  assert.equal(root.test('vite.config.js'), true);
  assert.equal(root.test('nested/vite.config.js'), false);
});

test('parseFileDiffs splits a diff into per-file chunks', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1 +1 @@',
    '-const a = 1;',
    '+const a = 2;',
    'diff --git a/src/b.ts b/src/b.ts',
    '--- a/src/b.ts',
    '+++ b/src/b.ts',
    '@@ -1 +1 @@',
    '+const b = 1;',
    '',
  ].join('\n');
  const files = parseFileDiffs(diff);
  assert.deepEqual(files.map((file) => file.path), ['src/a.ts', 'src/b.ts']);
  assert.match(files[0].diff, /const a = 2/);
  assert.match(files[1].diff, /const b = 1/);
});

test('changedLines keeps only added and removed lines', () => {
  const diff = [
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1 +1 @@',
    '-const a = 1;',
    '+const a = 2;',
    ' const context = true;',
  ].join('\n');
  assert.equal(changedLines(diff), '-const a = 1;\n+const a = 2;');
});

test('selectRules requires both the file glob and a changed-line trigger', () => {
  const uiDiff = [
    'diff --git a/src/screens/x/Y.tsx b/src/screens/x/Y.tsx',
    '--- a/src/screens/x/Y.tsx',
    '+++ b/src/screens/x/Y.tsx',
    '@@ -1 +1 @@',
    '-const cls = "text-sm";',
    '+const cls = "text-gray-500";',
  ].join('\n');
  const uiRules = selectRules('src/screens/x/Y.tsx', uiDiff).map((rule) => rule.id);
  assert.ok(uiRules.includes('semantic-token-palette'));
  assert.ok(!uiRules.includes('no-direct-data-access'));

  assert.deepEqual(selectRules('server/index.ts', uiDiff), []);

  const contextOnly = 'diff --git a/src/a.ts b/src/a.ts\n@@ -1 +1 @@\n const a = 1;';
  assert.deepEqual(selectRules('src/a.ts', contextOnly), []);
});

test('truncate caps long text and marks the cut', () => {
  assert.equal(truncate('short', 10), 'short');
  const capped = truncate('x'.repeat(50), 10);
  assert.match(capped, /^x{10}\n…\[truncated 40 chars\]$/);
});

test('buildState caps the diff and drops oversized content', () => {
  const small = buildState('src/a.ts', 'diff', 'const a = 1;');
  assert.equal(small.file.content, 'const a = 1;');
  assert.equal(small.file.content_truncated, false);

  const large = buildState('src/a.ts', 'diff', 'x'.repeat(40_000));
  assert.equal(large.file.content_truncated, true);
  assert.ok(large.file.content?.startsWith('x'.repeat(20_000)));

  const hugeDiff = buildState('src/a.ts', 'x'.repeat(40_000), 'const a = 1;');
  assert.match(hugeDiff.file.diff, /truncated/);
  assert.equal(hugeDiff.file.content, 'const a = 1;');
  assert.equal(hugeDiff.file.content_truncated, false);

  const squeezed = buildState('src/a.ts', 'x'.repeat(40_000), 'y'.repeat(20_000));
  assert.equal(squeezed.file.content_truncated, true);
  assert.ok((squeezed.file.diff.length + (squeezed.file.content?.length ?? 0)) <= 30_100);
});

test('evaluateAnswers flags probabilities below each rule threshold', () => {
  const rule = LINT_RULES[0];
  const fail = evaluateAnswers([rule], { [rule.id]: { noul: rule.threshold - 0.01 } });
  assert.equal(fail[0].pass, false);
  const pass = evaluateAnswers([rule], { [rule.id]: { noul: rule.threshold + 0.01 } });
  assert.equal(pass[0].pass, true);
});

test('runLint batches one call per file and reports violations', async () => {
  const gitOutput = [
    'diff --git a/src/screens/x/Y.tsx b/src/screens/x/Y.tsx',
    '--- a/src/screens/x/Y.tsx',
    '+++ b/src/screens/x/Y.tsx',
    '@@ -1 +1 @@',
    '-const cls = "text-sm";',
    '+const cls = "text-gray-500";',
    'diff --git a/server/index.ts b/server/index.ts',
    '--- a/server/index.ts',
    '+++ b/server/index.ts',
    '@@ -1 +1 @@',
    '-const a = 1;',
    '+const a = 2;',
    '',
  ].join('\n');

  const calls: Array<{ questions: Questions; model?: string }> = [];
  const fakeAsk: AskJevFn = async (_state, questions, model) => {
    calls.push({ questions, model });
    return {
      model: model ?? 'fake-model',
      usage: { input_tokens: 11, output_tokens: 0 },
      answers: { 'semantic-token-palette': { noul: 0.1 } },
    } as unknown as SystemOneResult<Questions>;
  };

  const directory = mkdtempSync(join(tmpdir(), 'jev-lint-'));
  const outputPath = join(directory, 'latest.json');
  try {
    const options: LintOptions = {
      ...parseArgs(['node', 'script']),
      outputPath,
      model: 'fake-model',
    };
    const report = await runLint(options, {
      askJev: fakeAsk,
      runGit: () => gitOutput,
      readFile: () => '',
      writeFile: (path, contents) => writeFileSync(path, contents),
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(Object.keys(calls[0].questions), ['semantic-token-palette']);
    assert.equal(report.totals.candidateFiles, 2);
    assert.equal(report.totals.lintedFiles, 1);
    assert.equal(report.totals.violations, 1);
    assert.equal(report.totals.inputTokens, 11);
    assert.deepEqual(report.totals.skippedNoRules, ['server/index.ts']);
    assert.equal(report.files[0].path, 'src/screens/x/Y.tsx');
    assert.equal(report.files[0].rules[0].pass, false);

    const written = JSON.parse(readFileSync(outputPath, 'utf8')) as { totals: { violations: number } };
    assert.equal(written.totals.violations, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('runLint --dry makes no calls and writes no report', async () => {
  const gitOutput = [
    'diff --git a/src/screens/x/Y.tsx b/src/screens/x/Y.tsx',
    '--- a/src/screens/x/Y.tsx',
    '+++ b/src/screens/x/Y.tsx',
    '@@ -1 +1 @@',
    '-const cls = "text-sm";',
    '+const cls = "text-gray-500";',
    '',
  ].join('\n');
  const fakeAsk: AskJevFn = async () => {
    throw new Error('dry run must not call Jev');
  };
  const options: LintOptions = { ...parseArgs(['node', 'script', '--dry']), outputPath: '/dev/null/unused' };
  const report = await runLint(options, {
    askJev: fakeAsk,
    runGit: () => gitOutput,
    readFile: () => '',
    writeFile: () => {
      throw new Error('dry run must not write a report');
    },
  });
  assert.equal(report.totals.calls, 0);
});
