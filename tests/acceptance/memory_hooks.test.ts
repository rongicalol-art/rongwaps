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
const MANIFEST = JSON.parse(readFileSync(resolve(HOOKS_DIR, 'manifest.json'), 'utf8')) as HookManifest;
const DECOMPOSITION_TREES = JSON.parse(
  readFileSync(resolve(PROJECT_ROOT, 'tests/fixtures/memory-hook-decomposition-trees.json'), 'utf8'),
) as { runtimeVersion: string; trees: Record<string, RuntimeTreeNode> };

const lookup: RuntimeLookup = (glyph) => DECOMPOSITION_TREES.trees[glyph] ?? null;

function loadPack(book: HookManifest['books'][number]): HookPack {
  const packPath = resolve(PROJECT_ROOT, 'public/data', book.path.replace(/^\/data\//, ''));
  return JSON.parse(readFileSync(packPath, 'utf8')) as HookPack;
}

test('Memory Hook Acceptance: every manifest pack matches its hash, count, and schema', () => {
  assert.ok(MANIFEST.books.length > 0, 'manifest must list at least one book');
  assert.equal(
    MANIFEST.totalCount,
    MANIFEST.books.reduce((total, book) => total + book.count, 0),
    'totalCount must equal the sum of book counts',
  );
  for (const book of MANIFEST.books) {
    const pack = loadPack(book);
    const compact = `${JSON.stringify(pack)}\n`;
    assert.equal(
      createHash('sha256').update(compact).digest('hex'),
      book.sha256,
      `book ${book.bookId} pack hash mismatch`,
    );
    assert.equal(book.bytes, Buffer.byteLength(compact), `book ${book.bookId} byte size mismatch`);
    assert.equal(pack.schemaVersion, 1);
    assert.equal(pack.bookId, book.bookId);
    assert.equal(pack.count, pack.items.length);
    assert.equal(pack.count, book.count);
  }
});

test('Memory Hook Acceptance: every hook renders at least one emphasis run', () => {
  const offenders: string[] = [];
  for (const book of MANIFEST.books) {
    for (const item of loadPack(book).items) {
      if (item.mnemonic.includes('**')) continue;
      const emphasized = tokenizeHookText(item.mnemonic)
        .some((segment) => segment.kind === 'token' || segment.kind === 'gloss');
      if (!emphasized) offenders.push(`${book.bookId}:${item.id}`);
    }
  }
  assert.deepEqual(offenders, [], `hooks that render no bold: ${offenders.join(', ')}`);
});

test('Memory Hook Acceptance: word hooks name every character in word order', () => {
  const offenders: string[] = [];
  for (const book of MANIFEST.books) {
    const wordRecords = loadPack(book).items
      .filter((item) => item.content_type === 'word')
      .map((item) => ({ word: item.character, hook: item.mnemonic }));
    for (const mismatch of findWordOrderMismatches(wordRecords)) {
      offenders.push(`${book.bookId}:${mismatch.character} (${mismatch.actual.join('')} vs ${mismatch.expected.join('')})`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('Memory Hook Acceptance: character hooks mention parts in breakdown order', () => {
  const offenders: string[] = [];
  for (const book of MANIFEST.books) {
    const charRecords = loadPack(book).items
      .filter((item) => item.content_type === 'character')
      .map((item) => ({ character: item.character, hook: item.mnemonic, acceptance: 'clean' }));
    for (const mismatch of findOrderMismatches(charRecords, lookup)) {
      offenders.push(`${book.bookId}:${mismatch.character} (${mismatch.actual.join('')} vs ${mismatch.expected.join('')})`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('Memory Hook Acceptance: retired phrasings stay gone', () => {
  for (const book of MANIFEST.books) {
    for (const item of loadPack(book).items) {
      assert.doesNotMatch(item.mnemonic, /calls with/i, `${item.id} uses the retired "calls with" phrasing`);
      assert.doesNotMatch(item.mnemonic, /hand\s*[—-]\s*also/i, `${item.id} keeps the retired bridge gloss`);
      // Meaning-only policy applies to Book 1; Book 3 migrates through the same
      // pipeline next and still carries the pre-2026-09-22 sound-cue hooks.
      if (book.bookId !== 1) continue;
      assert.doesNotMatch(
        item.mnemonic,
        /\b(?:lends? the sound|sound component|sound cue|sound shifts?)\b/i,
        `${item.id} keeps sound-cue language; sound belongs in the Sound block`,
      );
      assert.doesNotMatch(
        item.mnemonic,
        /\b(?:variant|archaic|ancient)\b|old\s+(?:form|version)|the\s+name\s+of/i,
        `${item.id} uses variant/archaic framing`,
      );
    }
  }
});
