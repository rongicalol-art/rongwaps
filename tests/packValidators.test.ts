import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidMemoryHookItem,
  isValidMemoryHookPack,
  isValidSoundHookItem,
  isValidSoundHookPack,
  isValidReadingsPack,
  isValidGrammarPack,
  isValidDialogueAlignmentPack,
  packItemsToMnemonicMap,
  resolveMnemonicFromMap,
  getBreakdownShard,
  recordsToExampleCards,
} from '../src/utils/packValidators';

test('isValidMemoryHookItem & isValidMemoryHookPack: validates structure and content_type', () => {
  const validItem = {
    id: '媽',
    character: '媽',
    mnemonic: 'A mother gives birth.',
    content_type: 'character',
  };
  assert.equal(isValidMemoryHookItem(validItem), true);
  assert.equal(isValidMemoryHookItem({ ...validItem, content_type: 'invalid' }), false);

  const validPack = {
    schemaVersion: 1,
    bookId: 1,
    count: 1,
    items: [validItem],
  };
  assert.equal(isValidMemoryHookPack(validPack, 1, 1), true);
  assert.equal(isValidMemoryHookPack(validPack, 2, 1), false);
  assert.equal(isValidMemoryHookPack(validPack, 1, 2), false);

  const mnemonicMap = packItemsToMnemonicMap([validItem]);
  assert.equal(mnemonicMap.get('媽'), 'A mother gives birth.');
});

test('resolveMnemonicFromMap: resolves with word_ prefix fallback', () => {
  const map = new Map<string, string>([
    ['word_你好', 'Hello mnemonic'],
    ['媽', 'Mother mnemonic'],
  ]);

  assert.equal(resolveMnemonicFromMap(map, 'word_你好'), 'Hello mnemonic');
  assert.equal(resolveMnemonicFromMap(map, 'word_媽'), 'Mother mnemonic');
  assert.equal(resolveMnemonicFromMap(map, '你好'), null);
});

test('isValidSoundHookItem & isValidSoundHookPack: validates phonetic piece and family', () => {
  const validSound = {
    id: '媽',
    character: '媽',
    meaning: 'mother',
    pinyin: 'mā',
    phonetic: { glyph: '馬', reading: 'mǎ', shift: 'exact' },
    family: [{ character: '媽', pinyin: 'mā', reading: 'mā' }],
    needsHuman: false,
  };
  assert.equal(isValidSoundHookItem(validSound), true);

  const validPack = {
    schemaVersion: 1,
    bookId: 1,
    count: 1,
    items: [validSound],
  };
  assert.equal(isValidSoundHookPack(validPack, 1, 1), true);
});

test('getBreakdownShard: computes modulo for unicode character', () => {
  const shard = getBreakdownShard('學', 4);
  assert.equal(shard, '學'.codePointAt(0)! % 4);
  assert.equal(getBreakdownShard('', 4), -1);
});

test('recordsToExampleCards: builds flashcards with matching examples', () => {
  const records = [
    {
      id: 'r1',
      sourceCardId: 'c1',
      sourceFront: '同學',
      sourceMeaning: 'classmate',
      bookId: 1,
      lessonId: 1,
      partId: 1,
      traditional: '他是新同學。',
      simplified: '他是新同学。',
      pinyin: 'Tā shì xīn tóngxué.',
      english: 'He is the new classmate.',
      sourceOcrId: 'v1',
      provenance: 'authored' as const,
      confidence: 'high' as const,
    },
  ];

  const cards = recordsToExampleCards(records, ['同學']);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].id, 'c1');
  assert.equal(cards[0].front, '同學');
  assert.equal(cards[0].examples?.length, 1);
  assert.equal(cards[0].examples?.[0].chinese, '他是新同學。');
});

test('isValidReadingsPack: validates reading pack structure', () => {
  const validReading = {
    id: 'B1L01-R01',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 1,
    title: 'Dialogue 1',
    dialogueLines: [{ id: 'l1', index: 0, speaker: '中明', text: '你好' }],
  };
  const pack = { schemaVersion: 1, bookId: 1, count: 1, items: [validReading] };
  assert.equal(isValidReadingsPack(pack, 1, 1), true);
  assert.equal(isValidReadingsPack(pack, 2, 1), false);
  assert.equal(isValidReadingsPack({ ...pack, items: [{ invalid: true }] }, 1, 1), false);
});

test('isValidGrammarPack: validates grammar pack structure', () => {
  const validPart = {
    id: 'B1L01-P01-D01',
    bookId: 1,
    lessonId: 1,
    partId: 1,
    title: 'Part 1',
    grammarPages: [{ id: 'p1' }],
  };
  const pack = { schemaVersion: 1, bookId: 1, count: 1, items: [validPart] };
  assert.equal(isValidGrammarPack(pack, 1, 1), true);
  assert.equal(isValidGrammarPack(pack, 2, 1), false);
});

test('isValidDialogueAlignmentPack: validates dialogue alignment pack structure', () => {
  const pack = {
    schemaVersion: 1,
    bookId: 1,
    count: 1,
    items: { 'B1L01-R01': { audioFile: 'test.mp3', lessonId: 1, dialogueNumber: 1, lines: [] } },
  };
  assert.equal(isValidDialogueAlignmentPack(pack, 1, 1), true);
  assert.equal(isValidDialogueAlignmentPack(pack, 2, 1), false);
});
