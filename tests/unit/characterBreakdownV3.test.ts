import assert from 'node:assert/strict';
import test from 'node:test';
import { presentRuntimeChild, usesShapeFallback } from '../../src/features/character-breakdown/components/v3/runtimeTreeView';
import { preferCharacterMetadata } from '../../src/features/character-breakdown/hooks/useRuntimeCharacterMetadata';
import { projectLegacyDecomposition } from '../../src/features/character-decomposition/legacyProjection';
import { groupByGrade, rankBuiltWith } from '../../src/features/character-breakdown/utils/rankBuiltWith';
import { formatSoundShift } from '../../src/features/character-breakdown/utils/soundShift';
import { mergeBreakdownWords } from '../../src/features/character-breakdown/utils/mergeBreakdownWords';
import { resolveSoundRevealPath } from '../../src/features/character-breakdown/utils/soundRevealPath';
import { hasSupportingInfo } from '../../src/features/character-breakdown/components/v3/V3SupportingInformation';
import type { DBDictionaryEntry } from '../../src/types/database';

// The dictionary service maps rows with string-array definitions at runtime.
function dictionaryEntry(traditional: string, simplified: string, pinyin: string[], definitions: string[]): DBDictionaryEntry {
  return { traditional, simplified, pinyin, definitions } as unknown as DBDictionaryEntry;
}

test('legacy projection remains isolated and preserves historical direct operands', () => {
  assert.deepEqual(projectLegacyDecomposition('⿱⿰臼爻子'), {
    operator: '⿱',
    components: ['臼', '爻', '子'],
  });
  assert.deepEqual(projectLegacyDecomposition('⿱？子'), {
    operator: '⿱',
    components: ['子'],
  });
  assert.deepEqual(projectLegacyDecomposition('一'), {
    operator: null,
    components: ['一'],
  });
});

test('V3 tree presents glyph operands as separate expandable or leaf cards', () => {
  assert.deepEqual(
    presentRuntimeChild({ kind: 'glyph', key: 'g:𦥯', glyph: '𦥯', expansion: 'expandable' }),
    { title: '𦥯', subtitle: undefined, tone: 'glyph', canExpand: true, navigable: true },
  );
  assert.deepEqual(
    presentRuntimeChild({ kind: 'glyph', key: 'g:子', glyph: '子', expansion: 'leaf' }),
    { title: '子', subtitle: undefined, tone: 'glyph', canExpand: false, navigable: true },
  );
});

test('encoded supplementary-plane glyphs never fall back to the Shape marker', () => {
  const encoded = presentRuntimeChild({ kind: 'glyph', key: 'g:𦥯', glyph: '𦥯', expansion: 'expandable' });
  const unencoded = presentRuntimeChild({ kind: 'unencoded-component', key: 'u:cjkvi:3', componentSourceId: 'cjkvi:3', label: 'No glyph', strokeCount: 3, expansion: 'unknown' });
  assert.equal(usesShapeFallback(encoded), false);
  assert.equal(usesShapeFallback(unencoded), true);
});

test('built-with rows split sound-alikes from shape-only and rank course, then level', () => {
  const members = [
    { character: '騙', grade: null },
    { character: '罵', grade: 'tone' as const, bookId: 3, lessonId: 2 },
    { character: '媽', grade: 'tone' as const, bookId: 1, lessonId: 1 },
    { character: '碼', grade: 'same' as const },
    { character: '嗎', grade: 'tone' as const, bookId: 1, lessonId: 4 },
    { character: '驢', grade: null, bookId: 2, lessonId: 1 },
  ];
  const levels: Record<string, number> = { '碼': 3, '騙': 6 };
  const { alike, shape } = rankBuiltWith(members, (character) => levels[character]);
  // Course by lesson, then the uncoursed one.
  assert.deepEqual(alike.map((member) => member.character), ['媽', '嗎', '罵', '碼']);
  assert.deepEqual(shape.map((member) => member.character), ['驢', '騙']);
});

test('sound shift shows the reading change, or one reading when they match', () => {
  assert.equal(formatSoundShift('mǎ', 'mā'), 'mǎ → mā');
  assert.equal(formatSoundShift('ma3', 'ma1'), 'mǎ → mā');
  assert.equal(formatSoundShift('qīng', 'qīng'), 'qīng');
  assert.equal(formatSoundShift('mǎ', undefined), 'mǎ');
  assert.equal(formatSoundShift(undefined, 'mā'), undefined);
});

test('breakdown words keep course entries first and add deduplicated dictionary coverage', () => {
  const course = [{ id: 'course-love', bookId: 1, lessonId: 1, front: '愛心', back: 'love', pinyin: 'ài xīn' }];
  const dictionary = [
    { word: '愛心', traditional: '愛心', simplified: '爱心', pinyin: 'ài xīn', definition: 'love' },
    { word: '愛好', traditional: '愛好', simplified: '爱好', pinyin: 'ài hào', definition: 'hobby' },
  ];
  assert.deepEqual(
    mergeBreakdownWords(course, dictionary).map(({ front, source }) => ({ front, source })),
    [{ front: '愛心', source: 'course' }, { front: '愛好', source: 'dictionary' }],
  );
});

test('V3 tree keeps No glyph and Unknown component distinct', () => {
  assert.deepEqual(
    presentRuntimeChild({ kind: 'unencoded-component', key: 'u:cjkvi:3', componentSourceId: 'cjkvi:3', label: 'No glyph', strokeCount: 3, expansion: 'unknown' }),
    { title: 'Unencoded part', subtitle: '3 strokes', tone: 'unencoded', canExpand: false, navigable: false },
  );
  assert.deepEqual(
    presentRuntimeChild({ kind: 'unknown-component', key: '?', label: 'Unknown component', expansion: 'unknown' }),
    { title: 'Unknown part', subtitle: undefined, tone: 'unknown', canExpand: false, navigable: false },
  );
});

test('V3 glyph cards can add short learner metadata without changing their runtime state', () => {
  assert.deepEqual(
    presentRuntimeChild(
      { kind: 'glyph', key: 'g:親', glyph: '親', expansion: 'leaf' },
      { pinyin: 'qin1', meaning: 'relative' },
    ),
    { title: '親', subtitle: undefined, pinyin: 'qin1', meaning: 'relative', tone: 'glyph', canExpand: false, navigable: true },
  );
});

test('V3 tree keeps neutral source entities out of No glyph semantics', () => {
  assert.deepEqual(
    presentRuntimeChild({ kind: 'source-entity', key: 'e:&foo;', entity: '&foo;', label: 'Unresolved source component', expansion: 'unknown' }),
    { title: 'Source-only part', subtitle: undefined, tone: 'entity', canExpand: false, navigable: false },
  );
});

test('tree metadata prefers the breakdown record over the dictionary entry', () => {
  // 覀: breakdown record exists (xī / west...) but the dictionary has no row.
  assert.deepEqual(
    preferCharacterMetadata(
      { pinyin: ['xī'], definition: 'west, western, westward' },
      undefined,
    ),
    { pinyin: 'xī', meaning: 'west, western, westward' },
  );
  // 单: both sources exist but disagree; the breakdown reading must win.
  assert.deepEqual(
    preferCharacterMetadata(
      { pinyin: ['dān'], definition: 'single; alone' },
      dictionaryEntry('單', '单', ['Shàn'], ['surname Shan']),
    ),
    { pinyin: 'dān', meaning: 'single; alone' },
  );
});

test('tree metadata falls back to the dictionary only without a breakdown record', () => {
  assert.deepEqual(
    preferCharacterMetadata(null, dictionaryEntry('方', '方', ['fāng'], ['square; direction'])),
    { pinyin: 'fāng', meaning: 'square' },
  );
  assert.deepEqual(
    preferCharacterMetadata({ pinyin: null, definition: null }, dictionaryEntry('方', '方', ['fāng'], ['square; direction'])),
    { pinyin: 'fāng', meaning: 'square' },
  );
  assert.deepEqual(
    preferCharacterMetadata(null, undefined),
    {},
  );
});

test('tree metadata keeps per-field fallback for partial breakdown records', () => {
  // 惠: breakdown record has pinyin but no definition.
  assert.deepEqual(
    preferCharacterMetadata(
      { pinyin: ['huì'], definition: null },
      dictionaryEntry('惠', '惠', ['huì'], ['favor; benefit; kindness']),
    ),
    { pinyin: 'huì', meaning: 'favor' },
  );
});

test('tree metadata shortens only dictionary-sourced meanings', () => {
  const long = 'to demand; to request; to coerce; (used before a verb) to want; to ask for';
  assert.deepEqual(
    preferCharacterMetadata(null, dictionaryEntry('要', '要', ['yāo'], [long])),
    { pinyin: 'yāo', meaning: 'to demand' },
  );
  // Breakdown definitions stay whole, matching the pressed summary card.
  assert.deepEqual(
    preferCharacterMetadata({ pinyin: ['yào'], definition: long }, undefined),
    { pinyin: 'yào', meaning: long },
  );
});

function parentIndex(edges: Record<string, string[]>) {
  return async (componentKey: string) =>
    edges[componentKey]
      ? { status: 'found', parents: edges[componentKey] }
      : { status: 'missing', parents: [] };
}

test('sound reveal path is empty when the sound glyph is a direct component', async () => {
  const path = await resolveSoundRevealPath({
    character: '新',
    soundGlyph: '亲',
    getParents: parentIndex({ 'g:亲': ['新'] }),
  });
  assert.deepEqual(path, []);
});

test('sound reveal path walks up to the main component (師 → 㠯 inside 𠂤)', async () => {
  const path = await resolveSoundRevealPath({
    character: '師',
    soundGlyph: '㠯',
    getParents: parentIndex({ 'g:㠯': ['𠂤'], 'g:𠂤': ['師'] }),
  });
  assert.deepEqual(path, ['𠂤']);
});

test('sound reveal path returns outer ancestors first for deeper nesting', async () => {
  const path = await resolveSoundRevealPath({
    character: '甲',
    soundGlyph: '丁',
    getParents: parentIndex({ 'g:丁': ['乙'], 'g:乙': ['丙'], 'g:丙': ['甲'] }),
  });
  assert.deepEqual(path, ['丙', '乙']);
});

test('sound reveal path stays empty for missing glyphs and cycles', async () => {
  assert.deepEqual(
    await resolveSoundRevealPath({
      character: '師',
      soundGlyph: '㠯',
      getParents: parentIndex({}),
    }),
    [],
  );
  assert.deepEqual(
    await resolveSoundRevealPath({
      character: '師',
      soundGlyph: '㠯',
      getParents: parentIndex({ 'g:㠯': ['𠂤'], 'g:𠂤': ['㠯'] }),
    }),
    [],
  );
});

test('hasSupportingInfo is true for words, used-in characters or a sound family', () => {
  assert.equal(hasSupportingInfo([], [], { lends: [{ character: '媽', grade: 'tone' }] }), true);
  assert.equal(hasSupportingInfo([], [{ character: '騎', grade: null }], null), true);
  assert.equal(hasSupportingInfo([], [], null), false);
});

test('groupByGrade splits sound-alikes into same, tone and close, dropping empty grades', () => {
  const groups = groupByGrade([
    { character: '罵', grade: 'tone' as const },
    { character: '碼', grade: 'same' as const },
    { character: '騎', grade: null },
  ], () => undefined);
  assert.deepEqual(groups.map(({ grade, members }) => [grade, members.map((member) => member.character)]), [['same', ['碼']], ['tone', ['罵']]]);
});

test('breakdown words drop vulgar, slang, neologism and hidden dictionary entries', () => {
  const dictionary = [
    { word: '你媽', traditional: '你媽', simplified: '你妈', pinyin: 'nǐ mā', definition: '(interjection) fuck you' },
    { word: '約嗎', traditional: '約嗎', simplified: '约吗', pinyin: 'yuē ma', definition: '(neologism, attested by 2014) Are you interested?' },
    { word: '嗎哪', traditional: '嗎哪', simplified: '吗哪', pinyin: 'mǎ nǎ', definition: 'manna (Israelite food)' },
    { word: '亂', traditional: '亂', simplified: '乱', pinyin: 'luàn', definition: 'in confusion or disorder' },
  ];
  assert.deepEqual(mergeBreakdownWords([], dictionary).map(({ front }) => front), ['亂']);
});
