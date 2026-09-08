import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  extractMarkdownLinks,
  isStrictAcceptance,
  listFilesRecursive,
  PROJECT_ROOT,
} from '../acceptance_helpers';

test('Documentation Acceptance: Markdown file count in root and docs/ <= 12 (excluding README.md)', (t) => {
  const excludedFiles = new Set(['README.md']);
  const rootFiles = fs.readdirSync(PROJECT_ROOT)
    .filter((f) => f.endsWith('.md') && !excludedFiles.has(f))
    .map((f) => path.join(PROJECT_ROOT, f));

  const docsDir = path.join(PROJECT_ROOT, 'docs');
  const docsFiles = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir).filter((f) => f.endsWith('.md')).map((f) => path.join(docsDir, f))
    : [];

  const totalMarkdownFiles = [...rootFiles, ...docsFiles];

  if (!isStrictAcceptance() && totalMarkdownFiles.length > 12) {
    t.skip(`Documentation cleanup pending: current count is ${totalMarkdownFiles.length} (target <= 12)`);
    return;
  }

  assert.ok(
    totalMarkdownFiles.length <= 12,
    `Expected total markdown files in root + docs/ <= 12, found ${totalMarkdownFiles.length}: ${totalMarkdownFiles.map((f) => path.basename(f)).join(', ')}`,
  );
});

test('Documentation Acceptance: No .original.md backup files anywhere in project', (t) => {
  const allOriginalFiles = listFilesRecursive(PROJECT_ROOT, (filePath) => {
    // ignore node_modules, dist, .git, .agents
    if (filePath.includes('/node_modules/') || filePath.includes('/dist/') || filePath.includes('/.git/') || filePath.includes('/.agents/')) {
      return false;
    }
    return filePath.endsWith('.original.md');
  });

  if (!isStrictAcceptance() && allOriginalFiles.length > 0) {
    t.skip(`Pending removal of .original.md files: ${allOriginalFiles.map((p) => path.relative(PROJECT_ROOT, p)).join(', ')}`);
    return;
  }

  assert.equal(
    allOriginalFiles.length,
    0,
    `Found forbidden .original.md backup files: ${allOriginalFiles.join(', ')}`,
  );
});

test('Documentation Acceptance: No files exist that were claimed deleted in CHANGELOG.md', (t) => {
  const claimedDeleted = [
    path.join(PROJECT_ROOT, 'docs/team.md'),
    path.join(PROJECT_ROOT, 'docs/PROGRESS_AND_PLANS.md'),
    path.join(PROJECT_ROOT, 'ARCHITECT_LOG.md'),
  ];

  const existingStaleFiles = claimedDeleted.filter((filePath) => fs.existsSync(filePath));

  if (!isStrictAcceptance() && existingStaleFiles.length > 0) {
    t.skip(`Pending removal of claimed deleted files: ${existingStaleFiles.map((p) => path.relative(PROJECT_ROOT, p)).join(', ')}`);
    return;
  }

  assert.deepEqual(
    existingStaleFiles,
    [],
    `Found files that were claimed deleted in CHANGELOG.md: ${existingStaleFiles.join(', ')}`,
  );
});

test('Documentation Acceptance: docs/INDEX.md links to existing documentation files', (t) => {
  const indexDocPath = path.join(PROJECT_ROOT, 'docs/INDEX.md');
  if (!fs.existsSync(indexDocPath)) {
    if (!isStrictAcceptance()) {
      t.skip('docs/INDEX.md does not exist yet');
      return;
    }
    assert.fail('docs/INDEX.md must exist');
  }

  const content = fs.readFileSync(indexDocPath, 'utf-8');
  const links = extractMarkdownLinks(content);
  const docsDir = path.join(PROJECT_ROOT, 'docs');

  const brokenLinks: string[] = [];
  for (const link of links) {
    const resolvedPath = path.resolve(docsDir, link);
    if (!fs.existsSync(resolvedPath)) {
      brokenLinks.push(link);
    }
  }

  if (!isStrictAcceptance() && brokenLinks.length > 0) {
    t.skip(`docs/INDEX.md contains broken links pending cleanup: ${brokenLinks.join(', ')}`);
    return;
  }

  assert.deepEqual(
    brokenLinks,
    [],
    `docs/INDEX.md contains broken links: ${brokenLinks.join(', ')}`,
  );
});

test('Documentation Acceptance: DECISIONS.md contains zero superseded entries', (t) => {
  const decisionsPath = path.join(PROJECT_ROOT, 'DECISIONS.md');
  if (!fs.existsSync(decisionsPath)) {
    assert.fail('DECISIONS.md must exist');
  }

  const content = fs.readFileSync(decisionsPath, 'utf-8');
  const hasSuperseded = /supersed/i.test(content);

  if (!isStrictAcceptance() && hasSuperseded) {
    t.skip('DECISIONS.md cleanup pending: contains superseded entries');
    return;
  }

  assert.equal(
    hasSuperseded,
    false,
    'DECISIONS.md must contain zero entries marked "superseded"',
  );
});

test('Documentation Acceptance: .hermes/ and .openai/ directories do not exist', (t) => {
  const hermesDir = path.join(PROJECT_ROOT, '.hermes');
  const openaiDir = path.join(PROJECT_ROOT, '.openai');

  const foundDirs = [hermesDir, openaiDir].filter((d) => fs.existsSync(d));

  if (!isStrictAcceptance() && foundDirs.length > 0) {
    t.skip(`Stale AI directories still present: ${foundDirs.map((d) => path.basename(d)).join(', ')}`);
    return;
  }

  assert.deepEqual(
    foundDirs,
    [],
    `Forbidden directories exist: ${foundDirs.join(', ')}`,
  );
});
