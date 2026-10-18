import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import type { ReadingsIndex } from '../../src/utils/pinyin/pronunciation';
import { recordingLookupKey } from '../../src/utils/pinyin/pronunciationMatching';
import { resolveWordBuildTileAudio, wordBuildTileReading } from '../../src/screens/quiz/utils/wordBuildAudio';

const card = (front: string, pinyin: string, audio = 'word.mp3'): Flashcard => ({ id: front, bookId: 1, lessonId: 1, front, pinyin, audio, back: 'meaning' });
const recordings = new Map<string, Flashcard>();
for (const [front, pinyin] of [['可', 'kě'], ['愛', 'ài'], ['大', 'dà'], ['家', 'jiā'], ['行', 'xíng'], ['重', 'zhòng'], ['亮', 'liàng'], ['女', 'nǚ']]) {
  const recording = card(front, pinyin, `${front}.mp3`);
  recordings.set(recordingLookupKey(front, pinyin)!, recording);
}

test('tapping 可 and 愛 plays their own reading, including citation tone three before tone four', () => {
  const word = card('可愛', 'kě’ài');
  assert.equal(resolveWordBuildTileAudio(word, '可', recordings), '可.mp3');
  assert.equal(resolveWordBuildTileAudio(word, '愛', recordings), '愛.mp3');
  // The sound belongs to the character, even if 愛 is put in the first slot.
  assert.equal(resolveWordBuildTileAudio(word, '愛', recordings), '愛.mp3');
});

test('polyphonic tiles require the word reading; missing audio never reveals the whole word', () => {
  const word = card('銀行', 'yínháng');
  assert.equal(resolveWordBuildTileAudio(word, '行', recordings), undefined);
  assert.equal(resolveWordBuildTileAudio(word, '行', recordings, new Map([['hang2', 'hang2.mp3']])), 'hang2.mp3');
  assert.equal(resolveWordBuildTileAudio(card('重量', 'zhòngliàng'), '重', recordings), '重.mp3');
});

test('duplicate characters are safe only when every occurrence has the same usable reading', () => {
  assert.equal(resolveWordBuildTileAudio(card('重重', 'zhòngchóng'), '重', recordings), undefined);
  assert.equal(resolveWordBuildTileAudio(card('大家家', 'dàjiājiā'), '家', recordings), '家.mp3');
});

test('source-labelled neutral sounds play only their exact reading; sandhi remains conservative', () => {
  const sounds = new Map([['ni3', 'ni3.mp3'], ['liang4', 'liang4.mp3'], ['liang5', 'liang5.mp3'], ['yi2', 'yi2.mp3'], ['bu2', 'bu2.mp3']]);
  for (const [front, pinyin, char] of [['你好', 'nǐhǎo', '你'], ['一個', 'yíge', '一'], ['不是', 'búshì', '不']]) {
    assert.equal(resolveWordBuildTileAudio(card(front, pinyin), char, recordings, sounds), undefined);
  }
  assert.equal(resolveWordBuildTileAudio(card('女王', 'nǚwáng'), '女', recordings), '女.mp3');
  assert.equal(resolveWordBuildTileAudio(card('漂亮', 'piàoliang'), '亮', recordings), undefined);
  assert.equal(resolveWordBuildTileAudio(card('漂亮', 'piàoliang'), '亮', recordings, sounds), 'liang5.mp3');
});

test('ambiguous pinyin, misalignment, missing recordings and placeholders stay silent', () => {
  for (const pinyin of ['dà/jiā', 'dà', '', 'da4jia1jia1']) {
    assert.equal(resolveWordBuildTileAudio(card('大家', pinyin), '大', recordings), undefined);
  }
  const invalid = new Map([[recordingLookupKey('大', 'dà')!, card('大', 'dà', '大')]]);
  assert.equal(resolveWordBuildTileAudio(card('大家', 'dàjiā'), '大', invalid), undefined);
});

test('distractors may play a single verified indexed reading, never a guessed polyphonic reading', () => {
  const index: ReadingsIndex = new Map([
    ['女', [{ pinyin: 'nǚ', kind: 'primary' }]],
    ['行', [{ pinyin: 'xíng', kind: 'primary' }, { pinyin: 'háng', kind: 'other' }]],
  ]);
  assert.equal(resolveWordBuildTileAudio(card('大家', 'dàjiā'), '女', recordings, undefined, index), '女.mp3');
  assert.equal(wordBuildTileReading(card('大家', 'dàjiā'), '行', index), undefined);
  assert.equal(wordBuildTileReading(card('大家', 'dàjiā'), 'X', index), undefined);
});

test('a distractor plays the single course-taught reading; a course alternation stays silent', () => {
  // 可 is polyphonic in the dictionary (kě|kè) but the course only teaches kě.
  assert.equal(resolveWordBuildTileAudio(card('知道', 'zhīdào'), '可', recordings), '可.mp3');
  const alternate = new Map(recordings);
  alternate.set(recordingLookupKey('還', 'hái')!, card('還', 'hái', '還-hai.mp3'));
  alternate.set(recordingLookupKey('還', 'huán')!, card('還', 'huán', '還-huan.mp3'));
  assert.equal(resolveWordBuildTileAudio(card('知道', 'zhīdào'), '還', alternate), undefined);
});

test('licensed clips fill exact gaps and preserve textbook priority and ü', () => {
  const sounds = new Map([['piao4', 'piao4.mp3'], ['liang4', 'other-liang4.mp3'], ['lü3', 'lv3.mp3']]);
  assert.equal(resolveWordBuildTileAudio(card('漂亮', 'piàoliàng'), '漂', recordings, sounds), 'piao4.mp3');
  assert.equal(resolveWordBuildTileAudio(card('漂亮', 'piàoliàng'), '亮', recordings, sounds), '亮.mp3');
  assert.equal(resolveWordBuildTileAudio(card('旅遊', 'lǚyóu'), '旅', recordings, sounds), 'lv3.mp3');
});
