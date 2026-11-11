import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import test from 'node:test';

// The hook runs after every file edit an AI session makes: it must stay silent
// unless the edited file really has a lint problem.

function lintEdited(file_path: string) {
  return spawnSync('node', ['.claude/hooks/lint-edited.mjs'], {
    input: JSON.stringify({ tool_name: 'Edit', cwd: process.cwd(), tool_input: { file_path } }),
    encoding: 'utf8',
  });
}

test('lint-on-edit hook is silent for clean code and for files ESLint does not cover', () => {
  for (const file of ['tests/unit/lintEditedHook.test.ts', 'docs/INDEX.md', 'AGENTS.md', 'src/missing-file.ts']) {
    const run = lintEdited(file);
    assert.equal(run.status, 0, `${file}: ${run.stderr}`);
    assert.equal(run.stderr, '', file);
  }
});

test('lint-on-edit hook reports the problems of the edited file', () => {
  const trial = 'tests/unit/__lintEditedTrial.ts';
  writeFileSync(trial, 'const unused = 1;\n');
  try {
    const run = lintEdited(trial);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /__lintEditedTrial\.ts:1:7 .*no-unused-vars/);
  } finally {
    rmSync(trial, { force: true });
  }
});
