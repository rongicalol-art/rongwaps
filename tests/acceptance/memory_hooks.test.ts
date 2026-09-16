import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  findOrderMismatches,
  findWordOrderMismatches,
  type RuntimeLookup,
} from '../../scripts/memory-hooks/checkComponentOrder';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';
import { tokenizeHookText } from '../../src/features/character-memory-hooks/hookText';
import { PROJECT_ROOT } from '../acceptance_helpers';

interface PackItem {
  id: string;
  character: string;
  mnemonic: string;
  content_type: 'character' | 'word';
}

interface HookPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: PackItem[];
}

interface HookManifest {
  version: string;
  totalCount: number;
  books: Array<{ bookId: number; count: number; path: string; sha256: string; bytes: number }>;
}

const HOOKS_DIR = resolve(PROJECT_ROOT, 'public/data/memory-hooks');
const PACK = JSON.parse(readFileSync(resolve(HOOKS_DIR, 'book-1.json'), 'utf8')) as HookPack;
const MANIFEST = JSON.parse(readFileSync(resolve(HOOKS_DIR, 'manifest.json'), 'utf8')) as HookManifest;
const DECOMPOSITION_TREES = JSON.parse(
  readFileSync(resolve(PROJECT_ROOT, 'tests/fixtures/memory-hook-decomposition-trees.json'), 'utf8'),
) as { runtimeVersion: string; trees: Record<string, RuntimeTreeNode> };

const charRecords = PACK.items
  .filter((item) => item.content_type === 'character')
  .map((item) => ({ character: item.character, hook: item.mnemonic, acceptance: 'clean' }));
const wordRecords = PACK.items
  .filter((item) => item.content_type === 'word')
  .map((item) => ({ word: item.character, hook: item.mnemonic }));
const lookup: RuntimeLookup = (glyph) => DECOMPOSITION_TREES.trees[glyph] ?? null;

test('Memory Hook Acceptance: pack manifest matches book-1.json', () => {
  const compact = `${JSON.stringify(PACK)}\n`;
  const hash = createHash('sha256').update(compact).digest('hex');
  const book = MANIFEST.books[0];

  assert.equal(hash, MANIFEST.version, 'manifest version must be the pack content hash');
  assert.equal(book.sha256, MANIFEST.version);
  assert.equal(book.path, '/data/memory-hooks/book-1.json');
  assert.equal(book.count, PACK.count);
  assert.equal(book.count, PACK.items.length);
  assert.equal(book.bytes, Buffer.byteLength(compact));
  assert.equal(MANIFEST.totalCount, PACK.count);
  assert.equal(PACK.schemaVersion, 1);
  assert.equal(PACK.bookId, 1);
});

test('Memory Hook Acceptance: every hook renders at least one emphasis run', () => {
  const offenders = PACK.items
    .filter((item) => {
      if (item.mnemonic.includes('**')) return false;
      return !tokenizeHookText(item.mnemonic)
        .some((segment) => segment.kind === 'token' || segment.kind === 'gloss');
    })
    .map((item) => item.id);

  assert.deepEqual(offenders, [], `hooks that render no bold: ${offenders.join(', ')}`);
});

test('Memory Hook Acceptance: word hooks name every character in word order', () => {
  const mismatches = findWordOrderMismatches(wordRecords);
  assert.deepEqual(
    mismatches.map((finding) => `${finding.character} (${finding.actual.join('')} vs ${finding.expected.join('')})`),
    [],
  );
});

test('Memory Hook Acceptance: character hooks mention parts in breakdown order', () => {
  const mismatches = findOrderMismatches(charRecords, lookup);
  assert.deepEqual(
    mismatches.map((finding) => `${finding.character} (${finding.actual.join('')} vs ${finding.expected.join('')})`),
    [],
  );
});

test('Memory Hook Acceptance: retired phrasings stay gone', () => {
  for (const item of PACK.items) {
    assert.doesNotMatch(item.mnemonic, /calls with/i, `${item.id} uses the retired "calls with" phrasing`);
    assert.doesNotMatch(item.mnemonic, /hand\s*[—-]\s*also/i, `${item.id} keeps the retired bridge gloss`);
  }
});
