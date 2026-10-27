import assert from 'node:assert/strict';
import test from 'node:test';
import { dialogueTranslation, splitDialogueTurns } from '../../src/utils/lesson/dialogueTurns';

const turnTexts = (text: string) => splitDialogueTurns(text)?.map((t) => [t.speaker, text.slice(t.start, t.end).trim()]);

test('splitDialogueTurns splits full-width and ASCII labels', () => {
  assert.deepEqual(turnTexts('A：現在幾點？ B：現在十點二十五分。'), [['A', '現在幾點？'], ['B', '現在十點二十五分。']]);
  assert.deepEqual(turnTexts('A:謝謝你？ B:不客氣。'), [['A', '謝謝你？'], ['B', '不客氣。']]);
});

test('splitDialogueTurns keeps a Han prefix and lead-in text', () => {
  assert.deepEqual(turnTexts('室友A:嘿。室友B:好。'), [['室友A', '嘿。'], ['室友B', '好。']]);
  assert.deepEqual(turnTexts('我很累。A:你怎麼了？ B:沒事。'), [[null, '我很累。'], ['A', '你怎麼了？'], ['B', '沒事。']]);
});

test('splitDialogueTurns ignores text without labels and labels inside words', () => {
  assert.equal(splitDialogueTurns('現在幾點？'), null);
  assert.equal(splitDialogueTurns('It is 3PM: late.'), null);
});

test('dialogueTranslation drops speaker labels', () => {
  assert.equal(dialogueTranslation('A: What time is it now? B: It’s 10:25.'), 'What time is it now? · It’s 10:25.');
  assert.equal(dialogueTranslation('What time is it now?'), 'What time is it now?');
});
