import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedDecompositionNode } from '../src/types/decomposition';
import { getVisibleCardChildren, projectLearnerDecomposition, resolveExplorableCharacterTree } from '../src/utils/idsParser';
import {
  LazyDecompositionResolver,
  adaptCjkviRecord,
  adaptCjkviText,
  adaptCns11643Bulk,
  adaptMakeMeAHanziRecord,
  parseCjkviLine,
} from '../src/features/character-decomposition';

const CJKVI_OPTIONS = { sourceVersion: 'fixture-sha', locale: 'zh-Hant-TW' } as const;

function nodeKinds(node: NormalizedDecompositionNode): string[] {
  return [node.kind, ...node.children.flatMap(nodeKinds)];
}

test('CJKVI preserves every alternative and prefers an explicit Taiwan variant', () => {
  const raw = parseCjkviLine('U+4E30\t丰\t⿻三丨[GJK]\t⿻丿⿻二丨[TV]');
  assert.ok(raw);
  const adapted = adaptCjkviRecord(raw, CJKVI_OPTIONS);

  assert.equal(adapted.alternatives.length, 2);
  assert.equal(adapted.selectionReason, 'explicit-taiwan');
  assert.equal(adapted.selected?.rawIdsExpression, '⿻丿⿻二丨');
  assert.deepEqual(adapted.selected?.regionalQualifiers, ['T', 'V']);
  assert.equal(adapted.alternatives[0].rawIdsExpression, '⿻三丨');
});

test('CJKVI falls back to neutral but never silently selects a G-only variant', () => {
  const neutral = parseCjkviLine('U+4E1F\t丟\t⿱王厶\t⿱一去');
  assert.ok(neutral);
  assert.equal(adaptCjkviRecord(neutral, CJKVI_OPTIONS).selectionReason, 'neutral');

  const gOnly = parseCjkviLine('U+fixture\t學\t⿱𦥯子[G]');
  assert.ok(gOnly);
  const adapted = adaptCjkviRecord(gOnly, CJKVI_OPTIONS);
  assert.equal(adapted.selected, null);
  assert.equal(adapted.selectionReason, 'no-taiwan-compatible-variant');
  assert.equal(adapted.diagnostics[0].code, 'no-taiwan-compatible-variant');
});

test('CJKVI adapter handles unencoded markers, CDP entities, neutral entities, and non-BMP glyphs', () => {
  const records = adaptCjkviText([
    'U+4E0D\t不\t⿱一③',
    'U+fixture1\t甲\t⿰𦥯&CDP-8BF1;',
    'U+fixture2\t乙\t⿰木&vendor-thing;',
  ].join('\n'), CJKVI_OPTIONS);

  assert.equal(records[0].selected?.normalized?.tree.kind, 'structure');
  assert.ok(nodeKinds(records[0].selected!.normalized!.tree).includes('unencoded-component'));
  assert.ok(nodeKinds(records[1].selected!.normalized!.tree).includes('unencoded-component'));
  assert.ok(nodeKinds(records[2].selected!.normalized!.tree).includes('source-entity'));
  assert.equal(records[1].selected?.normalized?.tree.children[0].kind, 'glyph');
});

test('Make Me a Hanzi keeps internal ？ as unknown and rejects a wholly unknown expression', () => {
  const internal = adaptMakeMeAHanziRecord({
    character: '万', decomposition: '⿱一？', definition: 'ten thousand',
  }, { sourceVersion: 'fixture' });
  assert.ok(internal.normalized);
  assert.ok(nodeKinds(internal.normalized.tree).includes('unknown-component'));

  const whole = adaptMakeMeAHanziRecord({ character: 'fixture', decomposition: '？' }, {
    sourceVersion: 'fixture',
  });
  assert.equal(whole.normalized, null);
  assert.equal(whole.diagnostics[0].code, 'unknown-whole-decomposition');
  assert.deepEqual(whole.rawRecord, { character: 'fixture', decomposition: '？' });
});

test('CNS bulk adapter preserves authoritative flat attributes without inventing an IDS tree', () => {
  const records = adaptCns11643Bulk({
    unicodeMappings: ['1-7050\t5B78\n'],
    component: '1-7050\t395,54,54,72,162\n',
    componentRef: '395\t1-2F47\tF618A\t󶆊\n54\t1-2B6A\tF6035\t󶀵\n',
    phonetic: '1-7050\tㄒㄩㄝˊ\n',
    pinyinTables: ['ㄒㄩㄝˊ\txue2\thsue2\n'],
    radical: '1-7050\t39\n',
    source: '1-7050\t常用國字標準字體表\n',
    stroke: '1-7050\t16\n',
    strokeSequence: '1-7050\t3434321151145551\n',
  }, { sourceVersion: '2026-08-05' });

  assert.equal(records.length, 1);
  assert.equal(records[0].character, '學');
  assert.equal(records[0].normalized, null);
  assert.equal(records[0].rawIdsExpression, null);
  assert.deepEqual(records[0].zhuyin, ['ㄒㄩㄝˊ']);
  assert.deepEqual(records[0].strokeCounts, [16]);
  assert.equal(records[0].components.length, 5);
  assert.equal(records[0].diagnostics[0].code, 'no-recursive-decomposition');
});

test('lazy resolver expands 𦥯 separately without mutating the 學 source record', async () => {
  const records = adaptCjkviText([
    'U+5B78\t學\t⿱𦥯子',
    'U+2696F\t𦥯\t⿶⿱𦥑冖爻',
  ].join('\n'), CJKVI_OPTIONS);
  const study = records[0].selected!.normalized!;
  const intermediate = records[1].selected!.normalized!;
  const original = JSON.stringify(study);
  const providerCalls: string[] = [];
  const resolver = new LazyDecompositionResolver({
    lookup(character) {
      providerCalls.push(character);
      return character === '𦥯'
        ? { status: 'available', record: intermediate }
        : { status: 'missing-decomposition', reason: 'record-not-found' };
    },
  }, 4);

  const root = resolver.createRoot(study);
  const intermediateNode = root.tree.children[0];
  assert.equal(intermediateNode.sourceNode.kind, 'glyph');
  assert.deepEqual(intermediateNode.resolution, { kind: 'unresolved' });

  const expanded = await resolver.expandGlyph(intermediateNode, 'zh-Hant-TW', {
    ancestry: ['學'], depth: 1,
  });
  assert.equal(expanded.resolution.kind, 'expandable');
  assert.equal(expanded.record?.sourceRecord.character, '𦥯');
  assert.deepEqual(providerCalls, ['𦥯']);
  assert.equal(JSON.stringify(study), original);

  const visible = projectLearnerDecomposition(resolveExplorableCharacterTree(study, new Map([
    ['zh-Hant-TW:𦥯', {
      character: '𦥯', locale: 'zh-Hant-TW', source: intermediate.source,
    }],
  ])));
  assert.deepEqual(getVisibleCardChildren(visible.root).map((node) => (
    node.kind === 'glyph' ? [node.glyph, node.expansion.kind] : [node.label, 'card']
  )), [['𦥯', 'expandable'], ['子', 'leaf']]);
});

test('lazy resolver distinguishes deferred, missing, leaf, cycle, and maximum depth states', async () => {
  const [studyRecord] = adaptCjkviText('U+5B78\t學\t⿱𦥯子', CJKVI_OPTIONS);
  const study = studyRecord.selected!.normalized!;
  const node = new LazyDecompositionResolver({ lookup: () => ({ status: 'deferred' }) }).createRoot(study).tree.children[0];

  assert.equal((await new LazyDecompositionResolver({ lookup: () => ({ status: 'deferred' }) })
    .expandGlyph(node, 'zh-Hant-TW', { ancestry: ['學'], depth: 0 })).resolution.kind, 'unresolved');
  assert.equal((await new LazyDecompositionResolver({
    lookup: () => ({ status: 'missing-decomposition', reason: 'no-expression' }),
  }).expandGlyph(node, 'zh-Hant-TW', { ancestry: ['學'], depth: 0 })).resolution.kind, 'missing-decomposition');
  assert.equal((await new LazyDecompositionResolver({ lookup: () => ({ status: 'deferred' }) })
    .expandGlyph(node, 'zh-Hant-TW', { ancestry: ['學', '𦥯'], depth: 0 })).resolution.kind, 'cycle');
  assert.equal((await new LazyDecompositionResolver({ lookup: () => ({ status: 'deferred' }) }, 1)
    .expandGlyph(node, 'zh-Hant-TW', { ancestry: ['學'], depth: 1 })).resolution.kind, 'max-depth');

  const [atomicRecord] = adaptCjkviText('U+4E00\t一\t一', CJKVI_OPTIONS);
  assert.equal(new LazyDecompositionResolver({ lookup: () => ({ status: 'deferred' }) })
    .createRoot(atomicRecord.selected!.normalized!).tree.resolution?.kind, 'leaf');
});
