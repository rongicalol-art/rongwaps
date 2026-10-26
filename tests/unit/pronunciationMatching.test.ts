import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { pronunciationKey, matchesRecording, recordingLookupKey, findReadingMatch } from '../../src/utils/pinyin/pronunciationMatching';
import { mapCustomCardsToFlashcards, mapStarredEntriesToFlashcards } from '../../src/utils/vocabulary/activityDataDerivations';
import { mapVocabularyRows } from '../../src/utils/vocabulary/vocabularyMapping';
import type { Flashcard } from '../../src/data/flashcards';

test('recording identity preserves tones, neutral tones, ü, boundaries and polyphones', () => {
  for (const [a, b] of [['lǎoshī', 'lao3shi1'], ['chang2an1', 'cháng ān'], ['lǜ', 'lu:4'], ['lü4', 'lv4'], ['ma', 'ma5'], ['ma0', 'ma5'], ["xī'ān", 'xi1 an1']]) {
    assert.equal(pronunciationKey(a), pronunciationKey(b), `${a} = ${b}`);
    assert.ok(pronunciationKey(a));
  }
  for (const [a, b] of [['xíng', 'háng'], ['zhòng', 'chóng'], ['le', 'liǎo'], ['ma', 'mā'], ['lǜ', 'lù'], ['xian1', 'xi1 an1'], ['chang2an1', 'chan2gan1'], ['huār', 'huā er']]) {
    assert.notEqual(pronunciationKey(a), pronunciationKey(b), `${a} ≠ ${b}`);
  }
  for (const value of ['', 'nǎ/něi', 'hé, hàn', 'yi1(dian3)', 'ma11', 'unknown']) assert.equal(pronunciationKey(value), null);
});

test('matching requires exact word aliases and the intended reading', () => {
  const card: Flashcard = { id: '1', bookId: 1, lessonId: 1, front: '種', simplified: '种', pinyin: 'zhǒng', back: 'kind', audio: 'kind.mp3' };
  assert.equal(matchesRecording(card, '种', 'zhong3'), true);
  assert.equal(matchesRecording(card, '種', 'zhòng'), false);
  assert.equal(matchesRecording(card, '中', 'zhǒng'), false);
  assert.equal(matchesRecording(card, '種'), false);
  const other = { ...card, id: '2', pinyin: 'zhòng', audio: 'plant.mp3' };
  const map = new Map([['種', card], [recordingLookupKey('種', 'zhòng')!, other]]);
  assert.equal(findReadingMatch(map, ['種'], 'zhòng'), other);
});

test('custom and starred cards reject conflicting or missing pinyin', () => {
  const map = new Map<string, Flashcard>([['行', { id: '1', front: '行', pinyin: 'xíng', audio: 'walk.mp3', back: 'walk', bookId: 1, lessonId: 1 }]]);
  for (const pinyin of ['háng', undefined]) {
    const { cards } = mapCustomCardsToFlashcards([{ id: 'c', userId: 'u', folderId: 'f', simplified: '行', pinyin, translation: 'trade', createdAt: 0 }], map, 'f');
    assert.equal(cards[0].audio, '');
    assert.equal(cards[0].source, 'dictionary');
  }
  const { cards } = mapStarredEntriesToFlashcards(['行'], new Map([['行', { traditional: '行', simplified: '行', pinyin: ['háng'], definitions: ['trade'] }]]), map);
  assert.equal(cards[0].audio, '');
});

test('all 4,061 textbook cards retain recording names and explicit missing-audio markers', () => {
  let count = 0;
  for (let book = 1; book <= 4; book++) {
    const pack = JSON.parse(readFileSync(`public/data/vocabulary/book-${book}.json`, 'utf8'));
    for (const [index, card] of mapVocabularyRows(pack.items).entries()) {
      const row = pack.items[index];
      assert.equal(card.audio, row.audio !== undefined ? row.audio || '' : `modernchinese-${card.id}.mp3`);
      count++;
    }
  }
  assert.equal(count, 4061);
});
