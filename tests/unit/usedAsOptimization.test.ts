import assert from 'node:assert/strict';
import test from 'node:test';
import { isStandardHanzi } from '../../src/utils/hanzi';
import { isPureVariantDefinition } from '../../src/utils/dictionaryDefinitions';
import { deriveUsedAsItems } from '../../src/features/character-breakdown/utils/deriveUsedAsItems';

test('isStandardHanzi accepts CJK Unified Ideographs and rejects rare extensions', () => {
  assert.equal(isStandardHanzi('好'), true);
  assert.equal(isStandardHanzi('口'), true);
  assert.equal(isStandardHanzi('學'), true);
  assert.equal(isStandardHanzi('一'), true);

  // Extension A (U+3400..U+4DBF)
  assert.equal(isStandardHanzi('㲋'), false);
  assert.equal(isStandardHanzi('㡭'), false);
  assert.equal(isStandardHanzi('㕡'), false);

  // Extension B (U+20000..U+2A6DF)
  assert.equal(isStandardHanzi('𤰇'), false);
  assert.equal(isStandardHanzi('𠈌'), false);

  // Radicals or symbols
  assert.equal(isStandardHanzi('⺀'), false);
  assert.equal(isStandardHanzi('⿰'), false);

  // Empty or multi-character
  assert.equal(isStandardHanzi(''), false);
  assert.equal(isStandardHanzi('你好'), false);
});

test('isPureVariantDefinition correctly flags pure variant entries', () => {
  assert.equal(isPureVariantDefinition('variant of 最[zui4]'), true);
  assert.equal(isPureVariantDefinition('old variant of 國|国[guo2]'), true);
  assert.equal(isPureVariantDefinition('archaic variant of 似[si4]'), true);
  assert.equal(isPureVariantDefinition('popular variant of 嘴[zui3]'), true);
  assert.equal(isPureVariantDefinition(['old variant of 膝[xi1]']), true);

  // Real definitions with distinct meanings
  assert.equal(isPureVariantDefinition('good; well; proper; good to'), false);
  assert.equal(isPureVariantDefinition('mouth; classifier for things with mouths'), false);
  assert.equal(isPureVariantDefinition([]), false);
  assert.equal(isPureVariantDefinition(null), false);
});

test('deriveUsedAsItems filters rare characters from outOfCourseItems', () => {
  const result = deriveUsedAsItems(['好', '㲋', '𤰇', '木']);
  assert.equal(result.outOfCourseItems.some((item) => item.char === '㲋'), false);
  assert.equal(result.outOfCourseItems.some((item) => item.char === '𤰇'), false);
});
