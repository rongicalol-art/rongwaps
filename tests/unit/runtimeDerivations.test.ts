import test from 'node:test';
import assert from 'node:assert/strict';
import {
  joinPath,
  getShard,
  getComponentShard,
  isAtomicRecord,
  validateManifest,
  assertShard,
  extractVisibleNodes,
  toVisibleChildSync,
  RuntimePackSafetyError,
  type RuntimePackManifest,
  type RuntimePackRecord,
} from '../../src/features/character-decomposition/runtimeDerivations';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

test('joinPath: cleanly joins URL/path segments', () => {
  assert.equal(joinPath('/base/', '/sub/path'), '/base/sub/path');
  assert.equal(joinPath('/base', 'sub/path'), '/base/sub/path');
  assert.equal(joinPath('base', 'file.json'), 'base/file.json');
});

test('getShard & getComponentShard: computes unicode code point modulo', () => {
  const char = '學';
  const expectedShard = (char.codePointAt(0)! % 4);
  assert.equal(getShard(char, 4), expectedShard);

  const compKey = 'g:學' as const;
  assert.equal(getComponentShard(compKey, 4), expectedShard);
});

test('isAtomicRecord: distinguishes leaf characters from compound characters', () => {
  const leafRecord: RuntimePackRecord = {
    r: '子-rec',
    s: 0,
    t: ['g', '子'],
  };
  assert.equal(isAtomicRecord('子', leafRecord), true);

  const compoundRecord: RuntimePackRecord = {
    r: '學-rec',
    s: 0,
    t: ['s', '⿱', [['g', '𦥯'], ['g', '子']]],
  };
  assert.equal(isAtomicRecord('學', compoundRecord), false);
});

test('validateManifest: enforces schema and structural invariants', () => {
  const invalidVersionManifest = { schemaVersion: 2 } as unknown as RuntimePackManifest;
  assert.throws(
    () => validateManifest(invalidVersionManifest, 1),
    RuntimePackSafetyError,
  );

  const incompleteManifest = {
    schemaVersion: 1,
    version: '1.0',
    // missing generatorVersion, etc.
  } as unknown as RuntimePackManifest;
  assert.throws(
    () => validateManifest(incompleteManifest, 1),
    RuntimePackSafetyError,
  );
});

test('assertShard: asserts schemaVersion, shard and count match descriptor', () => {
  const descriptor = {
    shard: 0,
    count: 10,
    path: 'shard-00.json',
    bytes: 100,
    sha256: 'abc',
    gzipBytes: 50,
    brotliBytes: 40,
  };

  assert.doesNotThrow(() => {
    assertShard({ schemaVersion: 1, shard: 0, count: 10 }, descriptor, 1);
  });

  assert.throws(() => {
    assertShard({ schemaVersion: 1, shard: 1, count: 10 }, descriptor, 1);
  });
});

test('extractVisibleNodes & toVisibleChildSync: decomposes tree into visible children', () => {
  const tree: RuntimeTreeNode = ['s', '⿰', [['g', '口'], ['g', '嘗']]];
  const nodes = extractVisibleNodes(tree);
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].node[1], '口');
  assert.equal(nodes[1].node[1], '嘗');

  const child0 = toVisibleChildSync(nodes[0].node, 'found', nodes[0].layoutPath);
  assert.equal(child0.kind, 'glyph');
  assert.equal(child0.glyph, '口');
  assert.equal(child0.expansion, 'expandable');

  const unencodedNode: RuntimeTreeNode = ['u', 'foo', 3];
  const unencoded = toVisibleChildSync(unencodedNode, undefined, []);
  assert.equal(unencoded.kind, 'unencoded-component');
  assert.equal(unencoded.strokeCount, 3);
});
