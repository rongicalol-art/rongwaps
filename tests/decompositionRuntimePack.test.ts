import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedDecompositionNode } from '../src/types/decomposition';
import {
  encodeRuntimeTree,
  getRuntimeDirectComponentKeys,
  runtimeComponentKey,
  walkRuntimeTree,
} from '../src/features/character-decomposition/runtimePack';

const source = {
  id: 'fixture',
  name: 'fixture',
  version: 'v1',
  recordId: '學',
};

function node(
  kind: NormalizedDecompositionNode['kind'],
  rawToken: string,
  children: NormalizedDecompositionNode[] = [],
): NormalizedDecompositionNode {
  if (kind === 'structure') return {
    id: rawToken,
    kind,
    glyph: null,
    operator: rawToken as '⿱',
    rawToken,
    source,
    children,
  };
  if (kind === 'glyph') return {
    id: rawToken,
    kind,
    glyph: rawToken,
    rawToken,
    source,
    children,
  };
  if (kind === 'unencoded-component') return {
    id: rawToken,
    kind,
    glyph: null,
    componentSourceId: rawToken,
    rawToken,
    source,
    children,
  };
  if (kind === 'unknown-component') return {
    id: rawToken,
    kind,
    glyph: null,
    rawToken,
    source,
    children,
  };
  return {
    id: rawToken,
    kind,
    glyph: null,
    entity: rawToken,
    rawToken,
    source,
    children,
  };
}

test('runtime trees retain structure and independently addressable glyph operands', () => {
  const tree = node('structure', '⿱', [node('glyph', '𦥯'), node('glyph', '子')]);
  const encoded = encodeRuntimeTree(tree);
  assert.deepEqual(encoded, ['s', '⿱', [['g', '𦥯'], ['g', '子']]]);
  assert.deepEqual(getRuntimeDirectComponentKeys(encoded), ['g:𦥯', 'g:子']);
  assert.equal(walkRuntimeTree(encoded).length, 3);
  // The pack tree contains no descendant tree for 𦥯; a loader looks it up by key.
  assert.deepEqual((encoded as unknown as ['s', string, unknown[]])[2][0], ['g', '𦥯']);
});

test('nested layout nodes are traversed without becoming component cards', () => {
  const tree = encodeRuntimeTree(node('structure', '⿱', [
    node('structure', '⿰', [node('glyph', '臼'), node('glyph', '爻')]),
    node('glyph', '子'),
  ]));
  assert.deepEqual(getRuntimeDirectComponentKeys(tree), ['g:臼', 'g:爻', 'g:子']);
  assert.equal(walkRuntimeTree(tree).filter((item) => item[0] === 's').length, 2);
});

test('No glyph, Unknown component, and source entities retain distinct keys', () => {
  const noGlyph = encodeRuntimeTree(node('unencoded-component', 'circled-1'));
  const unknown = encodeRuntimeTree(node('unknown-component', '？'));
  const entity = encodeRuntimeTree(node('source-entity', '&foo;'));
  assert.deepEqual(noGlyph, ['u', 'circled-1']);
  assert.deepEqual(unknown, ['?']);
  assert.deepEqual(entity, ['e', '&foo;']);
  assert.equal(runtimeComponentKey(noGlyph), 'u:circled-1');
  assert.equal(runtimeComponentKey(unknown), '?');
  assert.equal(runtimeComponentKey(entity), 'e:&foo;');
});
