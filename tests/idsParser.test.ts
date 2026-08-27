import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DecompositionSourceRef,
  IdsParsingDialect,
  LearnerDecompositionNode,
  NormalizedDecompositionNode,
} from '../src/types/decomposition';
import {
  IdsParseError,
  STRICT_IDS_OPERAND_ADAPTER,
  collectLearnerCards,
  getDecompositionLookupKey,
  getVisibleCardChildren,
  normalizeIdsExpression,
  parseIdsExpression,
  projectLearnerDecomposition,
  resolveExplorableCharacterTree,
  type IdsOperandAdapter,
} from '../src/utils/idsParser';
import {
  CJKVI_OPERAND_ADAPTER,
  MAKE_ME_A_HANZI_OPERAND_ADAPTER,
} from '../src/features/character-decomposition';

interface Example {
  character: string;
  raw: string;
  dialect: IdsParsingDialect;
  adapter: IdsOperandAdapter;
  recordId: string;
  sourceId: string;
}

const examples = {
  traditionalStudy: {
    character: '學', raw: '⿱𦥯子', dialect: 'unicode-ids-with-entities',
    adapter: CJKVI_OPERAND_ADAPTER, recordId: 'U+5B78', sourceId: 'cjkvi-ids',
  },
  simplifiedStudy: {
    character: '学', raw: '⿱⿱⺍冖子', dialect: 'unicode-ids',
    adapter: MAKE_ME_A_HANZI_OPERAND_ADAPTER, recordId: '学', sourceId: 'makemeahanzi',
  },
  encodedIntermediate: {
    character: '𦥯', raw: '⿶⿱𦥑冖爻', dialect: 'unicode-ids-with-entities',
    adapter: CJKVI_OPERAND_ADAPTER, recordId: 'U+2696F', sourceId: 'cjkvi-ids',
  },
  actualUnencoded: {
    character: '不', raw: '⿱一③', dialect: 'unicode-ids-with-entities',
    adapter: CJKVI_OPERAND_ADAPTER, recordId: 'U+4E0D', sourceId: 'cjkvi-ids',
  },
  unknown: {
    character: '万', raw: '⿱一？', dialect: 'unicode-ids',
    adapter: MAKE_ME_A_HANZI_OPERAND_ADAPTER, recordId: '万', sourceId: 'makemeahanzi',
  },
  anonymousStructure: {
    character: '冠', raw: '⿱冖⿺元寸', dialect: 'unicode-ids',
    adapter: MAKE_ME_A_HANZI_OPERAND_ADAPTER, recordId: '冠', sourceId: 'makemeahanzi',
  },
} as const satisfies Record<string, Example>;

function source(example: Example): DecompositionSourceRef {
  return {
    id: example.sourceId,
    name: example.sourceId,
    version: 'fixture-2026-08-10',
    recordId: example.recordId,
  };
}

function normalize(example: Example) {
  return normalizeIdsExpression(example.raw, {
    character: example.character,
    locale: 'zh-Hant-TW',
    dialect: example.dialect,
    operandAdapter: example.adapter,
    source: source(example),
  });
}

function learner(example: Example) {
  const normalized = normalize(example);
  return projectLearnerDecomposition(resolveExplorableCharacterTree(normalized, new Map()));
}

function countStructures(node: NormalizedDecompositionNode | LearnerDecompositionNode): number {
  return (node.kind === 'structure' ? 1 : 0)
    + node.children.reduce((sum, child) => sum + countStructures(child), 0);
}

function learnerLabels(example: Example): string[] {
  return collectLearnerCards(learner(example).root).map((node) => node.label);
}

test('parsing dialect is source-neutral and 學 preserves 𦥯 as a glyph operand', () => {
  const ast = parseIdsExpression(examples.traditionalStudy.raw, { dialect: 'unicode-ids' });
  assert.deepEqual(ast, {
    kind: 'structure',
    operator: '⿱',
    tokenIndex: 0,
    children: [
      { kind: 'operand', token: '𦥯', tokenIndex: 1, tokenKind: 'unicode-codepoint' },
      { kind: 'operand', token: '子', tokenIndex: 2, tokenKind: 'unicode-codepoint' },
    ],
  });

  const normalized = normalize(examples.traditionalStudy);
  assert.equal(normalized.tree.kind, 'structure');
  assert.equal(normalized.tree.children[0].kind, 'glyph');
  assert.ok(!('renderStatus' in normalized.tree.children[0]));
});

test('学 preserves structural parent-child layers while exposing only the next card layer', () => {
  const normalized = normalize(examples.simplifiedStudy);
  assert.equal(countStructures(normalized.tree), 2);

  const projection = learner(examples.simplifiedStudy);
  const outer = projection.root.children[0];
  assert.equal(outer.kind, 'structure');
  const inner = outer.children[0];
  assert.equal(inner.kind, 'structure');
  assert.deepEqual(getVisibleCardChildren(inner).map((node) => node.label), ['⺍', '冖']);
  assert.deepEqual(getVisibleCardChildren(projection.root).map((node) => node.label), ['⺍', '冖', '子']);
  assert.ok(getVisibleCardChildren(projection.root).every((node) => node.kind !== 'unencoded-component'));
});

test('𦥯 preserves nested grouping without inventing a component card', () => {
  const normalized = normalize(examples.encodedIntermediate);
  assert.equal(countStructures(normalized.tree), 2);
  assert.deepEqual(getVisibleCardChildren(learner(examples.encodedIntermediate).root).map((node) => node.label), [
    '𦥑', '冖', '爻',
  ]);
  assert.ok(!learnerLabels(examples.encodedIntermediate).includes('No glyph'));
});

test('CJKVI adapter interprets a circled-number operand as a genuine unencoded component', () => {
  const normalized = normalize(examples.actualUnencoded);
  assert.equal(normalized.tree.kind, 'structure');
  assert.deepEqual(normalized.tree.children[1], {
    id: 'cjkvi-ids:fixture-2026-08-10:U%2B4E0D:1',
    kind: 'unencoded-component',
    glyph: null,
    componentSourceId: 'cjkvi:unencoded:3-stroke',
    strokeCount: 3,
    rawToken: '③',
    source: source(examples.actualUnencoded),
    children: [],
  });
  assert.deepEqual(learnerLabels(examples.actualUnencoded), ['不', '一', 'No glyph']);
});

test('Make Me a Hanzi adapter interprets ？ as unknown, not unencoded', () => {
  const normalized = normalize(examples.unknown);
  assert.equal(normalized.tree.kind, 'structure');
  assert.equal(normalized.tree.children[1].kind, 'unknown-component');
  assert.deepEqual(learnerLabels(examples.unknown), ['万', '一', 'Unknown component']);
  assert.ok(!learnerLabels(examples.unknown).includes('No glyph'));
});

test('nested IDS with no encoded intermediate retains layout relationships without a No glyph card', () => {
  const projection = learner(examples.anonymousStructure);
  const outer = projection.root.children[0];
  assert.equal(outer.kind, 'structure');
  assert.equal(outer.presentation, 'layout-only');
  assert.equal(outer.children[1].kind, 'structure');
  assert.deepEqual(getVisibleCardChildren(outer).map((node) => node.label), ['冖', '元', '寸']);
  assert.ok(!learnerLabels(examples.anonymousStructure).includes('No glyph'));
});

test('only recognized CDP entities become unencoded; arbitrary entities stay neutral', () => {
  const cdp = normalizeIdsExpression('⿰木&CDP-8BF1;', {
    character: 'fixture', locale: 'zh-Hant-TW', dialect: 'unicode-ids-with-entities',
    operandAdapter: CJKVI_OPERAND_ADAPTER,
    source: { id: 'cjkvi-ids', name: 'CJKVI IDS', version: 'fixture', recordId: 'fixture-cdp' },
  });
  assert.equal(cdp.tree.kind, 'structure');
  assert.equal(cdp.tree.children[1].kind, 'unencoded-component');

  const arbitrary = normalizeIdsExpression('⿰木&vendor-thing;', {
    character: 'fixture', locale: 'zh-Hant-TW', dialect: 'unicode-ids-with-entities',
    operandAdapter: CJKVI_OPERAND_ADAPTER,
    source: { id: 'cjkvi-ids', name: 'CJKVI IDS', version: 'fixture', recordId: 'fixture-neutral' },
  });
  assert.equal(arbitrary.tree.kind, 'structure');
  assert.deepEqual(arbitrary.tree.children[1].kind, 'source-entity');
  assert.ok(!collectLearnerCards(projectLearnerDecomposition(
    resolveExplorableCharacterTree(arbitrary, new Map()),
  ).root).some((node) => node.label === 'No glyph'));
});

test('glyph expansion is resolved separately from the source-record tree', () => {
  const study = normalize(examples.traditionalStudy);
  const intermediate = normalize(examples.encodedIntermediate);
  const records = new Map([
    [getDecompositionLookupKey(intermediate.locale, intermediate.character), {
      character: intermediate.character,
      locale: intermediate.locale,
      source: intermediate.source,
    }],
  ]);

  assert.equal(study.tree.kind, 'structure');
  assert.equal(study.tree.children[0].kind, 'glyph');
  assert.ok(!('expansion' in study.tree.children[0]));

  const resolved = resolveExplorableCharacterTree(study, records);
  assert.equal(resolved.tree.children[0].sourceNode.kind, 'glyph');
  assert.deepEqual(resolved.tree.children[0].expansion, {
    kind: 'expandable',
    target: {
      character: '𦥯',
      locale: 'zh-Hant-TW',
      source: intermediate.source,
    },
  });
  const visibleIntermediate = getVisibleCardChildren(projectLearnerDecomposition(resolved).root)[0];
  assert.equal(visibleIntermediate.kind, 'glyph');
  if (visibleIntermediate.kind !== 'glyph') throw new Error('Expected 𦥯 glyph card');
  assert.equal(visibleIntermediate.expansion.kind, 'expandable');
});

test('an atomic self-expression is a leaf and never produces 一 → 一', () => {
  const atomic = normalizeIdsExpression('一', {
    character: '一', locale: 'zh-Hant-TW', dialect: 'unicode-ids',
    operandAdapter: STRICT_IDS_OPERAND_ADAPTER,
    source: { id: 'fixture', name: 'Fixture', version: '1', recordId: 'U+4E00' },
  });
  const resolved = resolveExplorableCharacterTree(atomic, new Map());
  assert.deepEqual(resolved.tree.expansion, { kind: 'self-reference-suppressed' });
  const projection = projectLearnerDecomposition(resolved);
  assert.deepEqual(getVisibleCardChildren(projection.root), []);
  assert.deepEqual(collectLearnerCards(projection.root).map((node) => node.label), ['一']);
});

test('renderability exists only in learner projection', () => {
  const normalized = normalize(examples.traditionalStudy);
  assert.ok(!('renderStatus' in normalized.tree));
  const projection = projectLearnerDecomposition(
    resolveExplorableCharacterTree(normalized, new Map()),
    { getGlyphRenderStatus: (glyph) => glyph === '𦥯' ? 'font-missing' : 'renderable' },
  );
  const visibleIntermediate = getVisibleCardChildren(projection.root)[0];
  assert.equal(visibleIntermediate.kind, 'glyph');
  if (visibleIntermediate.kind !== 'glyph') throw new Error('Expected 𦥯 glyph card');
  assert.equal(visibleIntermediate.renderStatus, 'font-missing');
});

test('operand validation is adapter-aware and returns structured diagnostics', () => {
  assert.throws(
    () => normalizeIdsExpression('A', {
      character: 'A', locale: 'zh-Hant-TW', dialect: 'unicode-ids',
      operandAdapter: STRICT_IDS_OPERAND_ADAPTER,
      source: { id: 'fixture', name: 'Fixture', version: '1', recordId: 'A' },
    }),
    (error: unknown) => error instanceof IdsParseError
      && error.code === 'invalid-operand'
      && error.tokenIndex === 0
      && error.adapterId === 'strict-unicode-ids',
  );

  assert.throws(
    () => normalizeIdsExpression('？', {
      character: 'fixture', locale: 'zh-Hant-TW', dialect: 'unicode-ids',
      operandAdapter: STRICT_IDS_OPERAND_ADAPTER,
      source: { id: 'fixture', name: 'Fixture', version: '1', recordId: 'question' },
    }),
    (error: unknown) => error instanceof IdsParseError && error.code === 'invalid-operand',
  );
  assert.equal(normalize(examples.unknown).tree.kind, 'structure');

  assert.throws(
    () => normalizeIdsExpression('③', {
      character: 'fixture', locale: 'zh-Hant-TW', dialect: 'unicode-ids',
      operandAdapter: STRICT_IDS_OPERAND_ADAPTER,
      source: { id: 'fixture', name: 'Fixture', version: '1', recordId: 'circled-three' },
    }),
    (error: unknown) => error instanceof IdsParseError && error.code === 'invalid-operand',
  );
  assert.equal(normalize(examples.actualUnencoded).tree.kind, 'structure');
});

test('Unicode 17 operator arities and malformed-expression diagnostics remain enforced', () => {
  assert.equal(parseIdsExpression('⿾正', { dialect: 'unicode-ids' }).kind, 'structure');
  const surrounded = parseIdsExpression('⿼叉丶', { dialect: 'unicode-ids' });
  assert.equal(surrounded.kind, 'structure');
  assert.equal(surrounded.children.length, 2);

  assert.throws(
    () => parseIdsExpression('⿱木', { dialect: 'unicode-ids' }),
    (error: unknown) => error instanceof IdsParseError && error.code === 'unexpected-end',
  );
  assert.throws(
    () => parseIdsExpression('木火', { dialect: 'unicode-ids' }),
    (error: unknown) => error instanceof IdsParseError && error.code === 'trailing-token',
  );
  assert.throws(
    () => parseIdsExpression('&CDP-8BF1;', { dialect: 'unicode-ids' }),
    (error: unknown) => error instanceof IdsParseError && error.code === 'source-entity-not-allowed',
  );
  assert.throws(
    () => parseIdsExpression('&CDP-8BF1', { dialect: 'unicode-ids-with-entities' }),
    (error: unknown) => error instanceof IdsParseError && error.code === 'unterminated-entity',
  );
});
