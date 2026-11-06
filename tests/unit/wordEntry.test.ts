import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { buildWordEntry, courseCardsByRow, isBoundForm, linkCourseReadings, orderReadingKeys, pickReading, readingDictionarySenses, readingHeadline, readingKey, searchRowMeaning, senseChecksum, senseTags, senseText, taiwanReadingOf, withTaiwanReading, type DictionaryRowLike } from '../../src/utils/vocabulary/wordEntry';
import { sanitizeDictionaryDefinitions } from '../../shared/dictionaryDefinitions';
import { firstPosTag, posTagsKey } from '../../shared/dictionarySearch';

const card = (front: string, pinyin: string, back: string, bookId: number, lessonId: number, pos?: string): Flashcard =>
  ({ id: `${front}-${bookId}-${lessonId}`, front, traditional: front, pinyin, back, bookId, lessonId, pos });
const row = (id: number, traditional: string, pinyin: string, definitions: string[], simplified = traditional): DictionaryRowLike =>
  ({ id, traditional, simplified, pinyin_accented: pinyin, definitions });

test('reading keys ignore spacing and keep tones', () => {
  assert.equal(readingKey('rén jia'), readingKey('rénjia'));
  assert.notEqual(readingKey('má'), readingKey('ma'));
});

test('a course card links to its own reading, never to another one', () => {
  const rows = [row(1, '嗎', 'má', ['(coll.) what?']), row(2, '嗎', 'mǎ', ['used in 嗎啡|吗啡[ma3 fei1]']), row(3, '嗎', 'ma', ['(question particle for "yes-no" questions)'])];
  const byRow = courseCardsByRow(rows, [card('嗎', 'ma', 'sentence-final particle for a question', 1, 1, 'Ptc')]);
  assert.deepEqual([...byRow.keys()], [3]);

  const scare = [row(4, '嚇', 'hè', ['to scare']), row(5, '嚇', 'xià', ['to frighten, to scare'])];
  assert.deepEqual([...courseCardsByRow(scare, [card('嚇', 'xià', 'scared, frightened', 2, 14, 'Vs-pred')]).keys()], [5]);
});

test('a card that lists two readings teaches both', () => {
  const rows = [row(15, '那', 'nà', ['that']), row(16, '那', 'nèi', ['that (colloquial)']), row(17, '那', 'nǎ', ['variant of 哪[na3]'])];
  assert.deepEqual([...courseCardsByRow(rows, [card('那', 'nà/nèi', 'that', 1, 3, 'Det')]).keys()], [15, 16]);
});

test('Taiwan tones and Taiwan-only readings still find the word', () => {
  const week = [row(6, '星期', 'xīng qī', ['week'])];
  assert.deepEqual([...courseCardsByRow(week, [card('星期', 'xīngqí', 'week', 1, 5, 'N')]).keys()], [6]);
  const trash = [row(7, '垃圾', 'lā jī', ['trash; refuse; garbage'])];
  assert.deepEqual([...courseCardsByRow(trash, [card('垃圾', 'lèsè', 'garbage', 2, 3, 'N')]).keys()], [7]);
});

test('every lesson of a polyphone lands on its own reading, earliest first', () => {
  const rows = [row(8, '長', 'cháng', ['long']), row(9, '長', 'zhǎng', ['chief', 'to grow'])];
  const links = linkCourseReadings(rows, [card('長', 'zhǎng', 'to grow, to develop, to enhance', 3, 1, 'V'), card('長', 'cháng', 'long', 1, 8, 'Vs')]);
  assert.equal(links.get('chang2')?.[0].lessonId, 8);
  assert.equal(links.get('zhang3')?.[0].bookId, 3);
  assert.deepEqual(orderReadingKeys(rows, links), ['chang2', 'zhang3']);
});

test('a variant that shares a simplified form never borrows the word or its lessons', () => {
  const rows = [row(10, '咊', 'hé', ['old variant of 和[he2]'], '和'), row(11, '和', 'hé', ['(joining two nouns) and; together with; with (Taiwan pr. [han4])'])];
  const entry = buildWordEntry('和', rows, [card('和', 'hé/hàn', 'and', 1, 3, 'Conj')]);
  assert.equal(entry?.word, '和');
  assert.equal(entry?.readings.length, 1);
  assert.equal(entry?.readings[0].cards[0].lessonId, 3);
  const variant = buildWordEntry('咊', rows, [card('和', 'hé/hàn', 'and', 1, 3, 'Conj')]);
  assert.equal(variant?.readings[0].cards.length, 0);
  assert.deepEqual(variant?.readings[0].groups[0].senses[0].ref, { word: '和', pinyin: 'hé' });
});

test('the entry leads with the book sense, then only the dictionary senses it does not teach', () => {
  const rows = [row(12, '河', 'hé', ['surname He', 'river (CL:條|条[tiao2],道[dao4])', '(bound form) the Yellow River'])];
  const entry = buildWordEntry('河', rows, [card('河', 'hé', 'river (M: 條 tiáo)', 1, 15, 'N')]);
  const reading = entry!.readings[0];
  assert.equal(reading.headline, 'river');
  assert.deepEqual(reading.groups.map((group) => group.pos), ['N', null]);
  assert.deepEqual(reading.groups[1].senses.map((sense) => sense.text), ['(bound form) the Yellow River']);
  assert.deepEqual(reading.measureWords.map((measure) => measure.char), ['條', '道']);
});

test('the opened reading leads, matched by dictionary or course reading', () => {
  const rows = [row(8, '長', 'cháng', ['long']), row(9, '長', 'zhǎng', ['to grow'])];
  const entry = buildWordEntry('長', rows, [])!;
  assert.equal(pickReading(entry, 'zhǎng')?.key, 'zhang3');
  assert.equal(pickReading(entry, 'zhang3')?.key, 'zhang3');
  assert.equal(pickReading(entry, null)?.key, 'chang2');
});

test('word types group dictionary senses and join the book group of the same type', () => {
  const rows = [row(8, '長', 'cháng', ['long', 'long (in time)', '(bound form) length', '(bound form) strong point; forte'])];
  const { senses } = readingDictionarySenses(rows);
  const pack = new Map([[posTagsKey('長', 'cháng'), `${senseChecksum(senses)}|Vs,Vs,N,N`]]);
  const entry = buildWordEntry('長', rows, [card('長', 'cháng', 'long', 1, 8, 'Vs')], [], { posTags: (key) => pack.get(key) })!;
  const groups = entry.readings[0].groups.map((group) => [group.pos, group.senses.map((sense) => sense.text)]);
  assert.deepEqual(groups, [
    ['Vs', ['long', 'long (in time)']],
    ['N', ['(bound form) length', '(bound form) strong point; forte']],
  ]);
});

test('word types are ignored once the dictionary lists other senses', () => {
  const rows = [row(8, '長', 'cháng', ['long', 'length'])];
  const stale = new Map([[posTagsKey('長', 'cháng'), 'abc123|Vs,N']]);
  const entry = buildWordEntry('長', rows, [], [], { posTags: (key) => stale.get(key) })!;
  assert.deepEqual(entry.readings[0].groups.map((group) => group.pos), [null]);
  assert.equal(senseTags('abc123|Vs,N', [{ text: 'long' }, { text: 'length' }]), null);
  assert.equal(firstPosTag(`${senseChecksum([{ text: 'x' }])}|,N,V`), 'N');
});

test('Taiwan reading order breaks ties when no lesson teaches the word', () => {
  const rows = [row(13, '血', 'xuè', ['blood']), row(14, '血', 'xiě', ['blood'])];
  assert.deepEqual(orderReadingKeys(rows, new Map(), ['xiě', 'xuè']), ['xie3', 'xue4']);
});

test('a Taiwan-reading note is a note on the reading, never a numbered meaning', () => {
  // The page shows the Taiwan reading (the book's lèsè): the note names the Mainland one.
  const trash = buildWordEntry('垃圾', [row(30, '垃圾', 'lā jī', ['trash', 'garbage', 'Taiwan pr. [le4 se4]'])], [card('垃圾', 'lèsè', 'garbage, trash', 2, 2, 'N')]);
  const lese = trash!.readings[0];
  assert.ok(lese.groups.every((group) => group.senses.every((sense) => !sense.text.startsWith('Taiwan pr.'))));
  assert.deepEqual(lese.otherReading, { region: 'Mainland', pinyin: 'lājī' });

  // The page shows the dictionary reading: the note names the Taiwan one.
  const dozen = buildWordEntry('打', [row(31, '打', 'dá', ['(loanword) dozen', 'Taiwan pr. [da3]'])], []);
  assert.deepEqual(dozen!.readings[0].groups.flatMap((group) => group.senses.map((sense) => sense.text)), ['(loanword) dozen']);
  assert.deepEqual(dozen!.readings[0].otherReading, { region: 'Taiwan', pinyin: 'dǎ' });

  // A note inside a real meaning belongs to that meaning and stays where it is.
  const chess = buildWordEntry('著', [row(32, '著', 'zhāo', ['a move in chess (Taiwan pr. [zhao2])'])], []);
  assert.equal(chess!.readings[0].otherReading, undefined);
});

test('the Taiwan-reading note keeps its place in the list word types are keyed on', () => {
  const { senses } = readingDictionarySenses([row(33, '打', 'dá', ['(loanword) dozen', 'Taiwan pr. [da3]'])]);
  assert.deepEqual(senses.map((sense) => sense.text), ['(loanword) dozen', 'Taiwan pr. dǎ']);
});

test('longer words on a page use its Taiwan reading only where the dictionary notes one', () => {
  const trash = buildWordEntry('垃圾', [row(35, '垃圾', 'lā jī', ['trash', 'Taiwan pr. [le4 se4]'])], [card('垃圾', 'lèsè', 'garbage, trash', 2, 2, 'N')])!;
  const taiwan = taiwanReadingOf(trash, trash.readings[0]);
  assert.deepEqual(taiwan, { word: '垃圾', pinyin: 'lèsè' });
  assert.equal(withTaiwanReading('垃圾堆', 'lā jī duī', taiwan), 'lè sè duī');
  assert.equal(withTaiwanReading('洋垃圾', 'yáng lā jī', taiwan), 'yáng lè sè');
  assert.equal(withTaiwanReading('坷垃', 'kē lā', taiwan), 'kē lā', 'shares a character, not the word');
  assert.equal(withTaiwanReading('垃圾 郵件', 'lā jī yóu', taiwan), 'lā jī yóu', 'syllables that do not line up stay as they were');

  // The book's tone differs from the dictionary's (Taiwan says lǐ, the dictionary li): the book's wins too.
  const luggage = buildWordEntry('行李', [row(37, '行李', 'xíng li', ['luggage'])], [card('行李', 'xínglǐ', 'luggage', 2, 7, 'N')])!;
  assert.equal(withTaiwanReading('行李箱', 'xíng li xiāng', taiwanReadingOf(luggage, luggage.readings[0])), 'xíng lǐ xiāng');

  // 東西 dōngxi "thing" reads the same in the book and the dictionary, so 東西方 "east and west" keeps its own reading.
  const thing = buildWordEntry('東西', [row(36, '東西', 'dōng xi', ['thing; stuff'])], [card('東西', 'dōngxi', 'thing', 1, 4, 'N')])!;
  assert.equal(taiwanReadingOf(thing, thing.readings[0]), null);
  assert.equal(withTaiwanReading('東西方', 'dōng xī fāng', taiwanReadingOf(thing, thing.readings[0])), 'dōng xī fāng');
});

test('"(bound form)" is shown as "only in words", never as jargon', () => {
  const entry = buildWordEntry('行', [row(34, '行', 'xíng', ['(bound form) to walk; to go', 'capable; competent'])], [])!;
  const [walk, capable] = entry.readings[0].groups.flatMap((group) => group.senses);
  assert.equal(senseText(walk), 'to walk; to go');
  assert.equal(isBoundForm(walk), true);
  assert.equal(isBoundForm(capable), false);
  assert.equal(readingHeadline(entry.readings[0]), 'to walk; to go');
  assert.equal(searchRowMeaning({ definitions: ['(bound form) to walk; to go', 'capable'] }), 'to walk; to go; capable');
});

test('lists never show a Taiwan-reading note as a meaning', () => {
  const cleaned = sanitizeDictionaryDefinitions(['(loanword) dozen', 'Taiwan pr. [da3]']);
  assert.deepEqual(cleaned.definitions, ['(loanword) dozen']);
  assert.equal(cleaned.taiwan_pronunciation, 'dǎ');
  assert.equal(searchRowMeaning({ definitions: ['Taiwan pr. dǎ', '(loanword) dozen'] }), '(loanword) dozen');
});
