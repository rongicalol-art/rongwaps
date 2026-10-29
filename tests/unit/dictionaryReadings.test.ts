import assert from 'node:assert/strict';
import test from 'node:test';
import { sensesForReading } from '../../src/utils/vocabulary/dictionaryDefinitions';

const a = {
  pinyin: ['ā'],
  definitions: [
    'interjection of surprise', 'Ah!', 'Oh!',
    'interjection expressing doubt or requiring answer', 'Eh?', 'what?',
    '[á]: interjection expressing doubt or requiring answer, Eh?, what?',
    'modal particle ending sentence, showing affirmation, approval, or consent',
    '[a]: modal particle ending sentence, showing affirmation, approval, or consent',
  ],
};

test('sensesForReading picks a later reading of a merged row', () => {
  assert.deepEqual(sensesForReading(a, 'a'), ['modal particle ending sentence, showing affirmation, approval, or consent']);
  assert.deepEqual(sensesForReading(a, 'á'), ['interjection expressing doubt or requiring answer', 'Eh?', 'what?']);
});

test('sensesForReading keeps only untagged senses for the row reading', () => {
  assert.deepEqual(sensesForReading(a, 'ā'), ['interjection of surprise', 'Ah!', 'Oh!']);
  assert.equal(sensesForReading(a, 'à'), null);
});

test('sensesForReading prefers a tagged group that repeats the row reading', () => {
  const dou = {
    pinyin: ['dōu'],
    definitions: ['surname Du', 'all; both; entirely', 'already', '[dōu]: all; both; entirely, already', 'capital city', '[dū]: capital city'],
  };
  assert.deepEqual(sensesForReading(dou, 'dōu'), ['all; both; entirely', 'already']);
  assert.deepEqual(sensesForReading(dou, 'dū'), ['capital city']);
});
