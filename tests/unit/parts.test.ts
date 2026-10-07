import assert from 'node:assert/strict';
import test from 'node:test';
import { builtWith, formatMembers, parseMembers, soundFamily, resolveSoundClue, soundAlikes, type PartsIndex } from '../../src/utils/characters/parts';

const index: PartsIndex = {
  parents: new Map([
    ['馬', parseMembers('碼=螞=嗎~媽~罵~騎驗')],
    ['門', parseMembers('們~悶~閩≈問開')],
    ['女', parseMembers('媽好')],
    ['口', parseMembers('嗎吃')],
  ]),
  phonetic: new Map([
    ['碼', '馬'], ['螞', '馬'], ['嗎', '馬'], ['媽', '馬'], ['罵', '馬'],
    ['們', '門'], ['悶', '門'], ['閩', '門'],
  ]),
};

test('parseMembers reads grade marks in order and leaves shape-only characters ungraded', () => {
  assert.deepEqual(parseMembers('碼=嗎~閩≈騎'), [
    { character: '碼', grade: 'same' },
    { character: '嗎', grade: 'tone' },
    { character: '閩', grade: 'close' },
    { character: '騎', grade: null },
  ]);
  assert.deepEqual(parseMembers(''), []);
});

test('parseMembers keeps supplementary-plane characters whole and ignores a leading mark', () => {
  assert.deepEqual(parseMembers('=𠀀=好'), [
    { character: '𠀀', grade: 'same' },
    { character: '好', grade: null },
  ]);
});

test('formatMembers is the inverse of parseMembers', () => {
  const value = '碼=螞=嗎~媽~罵~騎驗';
  assert.equal(formatMembers(parseMembers(value)), value);
});

test('builtWith returns the graded list for a part, sound-alikes first, and [] for unknown parts', () => {
  assert.deepEqual(builtWith('門', index).map((member) => member.character), ['們', '悶', '閩', '問', '開']);
  assert.deepEqual(builtWith('門', index).slice(3).map((member) => member.grade), [null, null]);
  assert.deepEqual(builtWith('龘', index), []);
  assert.deepEqual(soundAlikes(builtWith('門', index)).map((member) => member.grade), ['tone', 'tone', 'close']);
});

test('resolveSoundClue returns the part, its grade and graded siblings without the character itself', () => {
  assert.deepEqual(resolveSoundClue('媽', index), {
    part: '馬',
    grade: 'tone',
    siblings: [
      { character: '碼', grade: 'same' },
      { character: '螞', grade: 'same' },
      { character: '嗎', grade: 'tone' },
      { character: '罵', grade: 'tone' },
    ],
  });
});

test('resolveSoundClue is null without a graded phonetic part', () => {
  assert.equal(resolveSoundClue('馬', index), null);
  assert.equal(resolveSoundClue('好', index), null);
  // A phonetic entry whose character lost its grade mark is not a clue.
  assert.equal(resolveSoundClue('騎', { ...index, phonetic: new Map([['騎', '馬']]) }), null);
});

test('a character can both give and get sound: it has a clue and builds other characters', () => {
  const both: PartsIndex = {
    parents: new Map([['青', parseMembers('清=請~')], ['請', parseMembers('諸')]]),
    phonetic: new Map([['請', '青'], ['清', '青']]),
  };
  assert.equal(resolveSoundClue('請', both)?.part, '青');
  assert.deepEqual(builtWith('請', both).map((member) => member.character), ['諸']);
});

test('soundFamily: a character that borrows its sound gets the part and its siblings', () => {
  const family = soundFamily('嗎', index);
  assert.equal(family?.from?.part, '馬');
  assert.ok(!family?.from?.siblings.some((member) => member.character === '嗎'));
  assert.deepEqual(family?.lends, []);
});

test('soundFamily: a sound part lends to its graded members; a character with neither is null', () => {
  assert.deepEqual(soundFamily('馬', index)?.lends.map((member) => member.character), ['碼', '螞', '嗎', '媽', '罵']);
  assert.equal(soundFamily('馬', index)?.from, undefined);
  assert.equal(soundFamily('好', index), null);
});

test('soundFamily: a character can both borrow and lend (星 ← 生, 星 → 醒)', () => {
  const chain: PartsIndex = {
    parents: new Map([['生', parseMembers('星~性~')], ['星', parseMembers('醒~猩=')]]),
    phonetic: new Map([['星', '生'], ['性', '生'], ['醒', '星'], ['猩', '星']]),
  };
  const family = soundFamily('星', chain);
  assert.equal(family?.from?.part, '生');
  assert.deepEqual(family?.from?.siblings.map((member) => member.character), ['性']);
  assert.deepEqual(family?.lends.map((member) => member.character), ['醒', '猩']);
});

test('soundFamily: a part with a single borrower is not a family (大 → 馱), but the borrower still has its clue', () => {
  const lone: PartsIndex = { parents: new Map([['大', parseMembers('馱=太美')]]), phonetic: new Map([['馱', '大']]) };
  assert.equal(soundFamily('大', lone), null);
  assert.equal(soundFamily('馱', lone)?.from?.part, '大');
});
