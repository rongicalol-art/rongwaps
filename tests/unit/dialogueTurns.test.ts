import assert from 'node:assert/strict';
import test from 'node:test';
import { dialogueTranslation, splitDialogueTurns, splitTranslationLines } from '../../src/utils/lesson/dialogueTurns';

const turnTexts = (text: string) => splitDialogueTurns(text)?.map((t) => [t.speaker, text.slice(t.start, t.end).trim()]);

test('splitDialogueTurns splits full-width and ASCII labels', () => {
  assert.deepEqual(turnTexts('A：現在幾點？ B：現在十點二十五分。'), [['A', '現在幾點？'], ['B', '現在十點二十五分。']]);
  assert.deepEqual(turnTexts('A:謝謝你？ B:不客氣。'), [['A', '謝謝你？'], ['B', '不客氣。']]);
});

test('splitDialogueTurns keeps a Han prefix and lead-in text', () => {
  assert.deepEqual(turnTexts('室友A:嘿。室友B:好。'), [['室友A', '嘿。'], ['室友B', '好。']]);
  assert.deepEqual(turnTexts('我很累。A:你怎麼了？ B:沒事。'), [[null, '我很累。'], ['A', '你怎麼了？'], ['B', '沒事。']]);
});

test('splitDialogueTurns supports Chinese role speaker labels when 2+ turns appear', () => {
  assert.deepEqual(turnTexts('小偷：我只是偷了一雙鞋？警察：偷東西就是不對。'), [
    ['小偷', '我只是偷了一雙鞋？'],
    ['警察', '偷東西就是不對。'],
  ]);
  assert.equal(splitDialogueTurns('小偷：我只是偷了一雙鞋。'), null);
});

test('splitDialogueTurns splits newline-separated multi-examples and nested dialogues', () => {
  assert.deepEqual(
    turnTexts('弟弟打破了杯子。\n妹妹：我打破了一個盤子，怎麼辦？姊姊：你趕快去跟媽媽說「對不起」。'),
    [
      ['1', '弟弟打破了杯子。'],
      ['2 · 妹妹', '我打破了一個盤子，怎麼辦？'],
      ['姊姊', '你趕快去跟媽媽說「對不起」。'],
    ],
  );
});

test('splitDialogueTurns ignores text without labels and labels inside words', () => {
  assert.equal(splitDialogueTurns('現在幾點？'), null);
  assert.equal(splitDialogueTurns('It is 3PM: late.'), null);
});

test('dialogueTranslation drops speaker labels and preserves multi-example newlines', () => {
  assert.equal(dialogueTranslation('A: What time is it now? B: It’s 10:25.'), 'What time is it now? · It’s 10:25.');
  assert.equal(
    dialogueTranslation('Teacher: Did everyone understand? Student: Teacher, please explain again.'),
    'Did everyone understand? · Teacher, please explain again.',
  );
  assert.equal(dialogueTranslation('What time is it now?'), 'What time is it now?');
  assert.deepEqual(
    splitTranslationLines('First example.\nLittle Sister: What should I do? Older Sister: Say sorry to Mom.'),
    [
      { label: '1', text: 'First example.' },
      { label: '2', text: 'What should I do? · Say sorry to Mom.' },
    ],
  );
});
