import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  countFileLines,
  isStrictAcceptance,
  listFilesRecursive,
  PROJECT_ROOT,
} from '../acceptance_helpers';

test('Static Data Acceptance: src/data/dialogueAlignment.ts does not exist', (t) => {
  const tsPath = path.join(PROJECT_ROOT, 'src/data/dialogueAlignment.ts');
  const tsExists = fs.existsSync(tsPath);

  if (!isStrictAcceptance() && tsExists) {
    t.skip('Extraction pending: src/data/dialogueAlignment.ts still exists');
    return;
  }

  assert.equal(
    tsExists,
    false,
    'src/data/dialogueAlignment.ts must not exist as TypeScript source',
  );
});

test('Static Data Acceptance: content/dialogueAlignment.json exists and is valid JSON', (t) => {
  const jsonPath = path.join(PROJECT_ROOT, 'content/dialogueAlignment.json');
  if (!fs.existsSync(jsonPath)) {
    if (!isStrictAcceptance()) {
      t.skip('Extraction pending: content/dialogueAlignment.json does not exist yet');
      return;
    }
    assert.fail('content/dialogueAlignment.json must exist');
  }

  let data: Record<string, unknown> = {};
  assert.doesNotThrow(() => {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    data = JSON.parse(raw) as Record<string, unknown>;
  }, 'content/dialogueAlignment.json must be valid JSON');

  assert.ok(data !== null && typeof data === 'object', 'dialogue alignment must be an object');
  // Check either keyed by dialogue ID or root alignment object
  const sampleDialogue = (data.lines ? data : Object.values(data)[0]) as Record<string, unknown> | undefined;
  assert.ok(sampleDialogue, 'dialogue alignment data must contain entries');
  const lines = sampleDialogue.lines as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(lines), 'dialogue alignment must contain lines array');
  assert.ok(lines.length > 0, 'dialogue alignment must contain at least one line');
  assert.ok('text' in lines[0], 'dialogue lines must contain text');
  assert.ok('start' in lines[0], 'dialogue lines must contain start time');
  assert.ok('end' in lines[0], 'dialogue lines must contain end time');
});

test('Static Data Acceptance: Grammar lesson data files are converted to JSON or line count reduced', (t) => {
  const grammarTsDir = path.join(PROJECT_ROOT, 'src/data/grammar');
  const grammarJsonDir = path.join(PROJECT_ROOT, 'content/grammar');

  const jsonExists = fs.existsSync(grammarJsonDir);
  const tsFiles = fs.existsSync(grammarTsDir)
    ? fs.readdirSync(grammarTsDir).filter((f) => f.startsWith('lesson') && f.endsWith('.ts'))
    : [];

  let totalTsLines = 0;
  for (const f of tsFiles) {
    totalTsLines += countFileLines(path.join(grammarTsDir, f));
  }

  if (!isStrictAcceptance() && (!jsonExists || totalTsLines > 5000)) {
    t.skip(`Grammar data extraction pending: total TS lines = ${totalTsLines}, content/grammar exists = ${jsonExists}`);
    return;
  }

  // If converted, json directory must exist and contain JSON files
  assert.ok(jsonExists, 'content/grammar/ directory must exist');
  const jsonFiles = fs.readdirSync(grammarJsonDir).filter((f) => f.endsWith('.json'));
  assert.ok(jsonFiles.length > 0, 'content/grammar/ must contain JSON files');
  assert.ok(
    totalTsLines < 2000,
    `src/data/grammar/ line count should be reduced to < 2000 lines (current: ${totalTsLines})`,
  );
});

test('Static Data Acceptance: All extracted JSON files are valid and loadable at runtime', (t) => {
  const contentDir = path.join(PROJECT_ROOT, 'content');
  if (!fs.existsSync(contentDir)) {
    if (!isStrictAcceptance()) {
      t.skip('content/ directory does not exist yet');
      return;
    }
    assert.fail('content/ directory must exist');
  }

  const jsonFiles = listFilesRecursive(contentDir, (f) => f.endsWith('.json'));
  if (!isStrictAcceptance() && jsonFiles.length === 0) {
    t.skip('No JSON files found under content/ yet');
    return;
  }

  for (const jsonFile of jsonFiles) {
    assert.doesNotThrow(() => {
      const content = fs.readFileSync(jsonFile, 'utf-8');
      JSON.parse(content);
    }, `Failed to parse JSON file: ${path.relative(PROJECT_ROOT, jsonFile)}`);
  }
});
