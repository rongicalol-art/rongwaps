import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaryCache } from '../../src/utils/cache';
import { dereferenceEntries } from '../../src/services/dictionaryService';

test('dereferenceEntries resolves variant definitions to informative target meanings', async () => {
  dictionaryCache.set('令爱', [{
    traditional: '令愛',
    simplified: '令爱',
    pinyin: ['lìng ài'],
    definitions: ['(courteous) your daughter'],
    frequency_score: 1,
    curriculum_level: null,
  }]);

  const rawVariantEntry = [{
    traditional: '令嬡',
    simplified: '令嫒',
    pinyin: ['lìng ài'],
    definitions: ['variant of 令愛|令爱[ling4 ai4]'],
    frequency_score: 1,
    curriculum_level: null,
  }];

  const dereferenced = await dereferenceEntries(rawVariantEntry);
  const defs = Array.isArray(dereferenced[0]?.definitions) ? dereferenced[0].definitions : [];
  assert.equal(
    defs[0],
    '(courteous) your daughter (variant of 令爱)',
  );

  // Cache the dereferenced 令嫒 to test chained resolution (嫒 -> 令嫒 -> 令爱)
  dictionaryCache.set('令嫒', dereferenced);

  const rawBoundMorpheme = [{
    traditional: '嬡',
    simplified: '嫒',
    pinyin: ['ài'],
    definitions: ['used in 令嬡|令嫒[ling4 ai4]'],
    frequency_score: 1,
    curriculum_level: null,
  }];

  const dereferencedMorpheme = await dereferenceEntries(rawBoundMorpheme);
  const morphemeDefs = Array.isArray(dereferencedMorpheme[0]?.definitions)
    ? dereferencedMorpheme[0].definitions
    : [];
  assert.equal(
    morphemeDefs[0],
    'used in 令嫒 (your daughter)',
  );
});

test('dereferenceEntries preserves non-pointer definitions unchanged', async () => {
  const normalEntry = [{
    traditional: '猫',
    simplified: '猫',
    pinyin: ['māo'],
    definitions: ['cat', 'CL:隻|只[zhi1]'],
    frequency_score: 1,
    curriculum_level: null,
  }];

  const result = await dereferenceEntries(normalEntry);
  assert.deepEqual(result[0].definitions, ['cat', 'CL:隻|只[zhi1]']);
});
