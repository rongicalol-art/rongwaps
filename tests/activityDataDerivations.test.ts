import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSameCards,
  mapStarredEntriesToFlashcards,
  mapCustomCardsToFlashcards,
  filterCurriculumCards,
  deriveLocalDueCardIds,
} from '../src/utils/activityDataDerivations';
import type { Flashcard } from '../src/data/flashcards';
import type { DBDictionaryEntry } from '../src/types/database';
import type { UserFlashcard } from '../src/types/models';
import type { SRSData } from '../src/utils/srsEngine';

test('isSameCards: correctly compares flashcard arrays by identity and ids', () => {
  const c1: Flashcard = { id: '1', bookId: 1, lessonId: 1, front: '你好', back: 'hello', pinyin: 'nǐ hǎo', audio: '', notes: '' };
  const c2: Flashcard = { id: '2', bookId: 1, lessonId: 1, front: '再見', back: 'goodbye', pinyin: 'zài jiàn', audio: '', notes: '' };
  const c1Clone: Flashcard = { ...c1 };

  assert.equal(isSameCards([c1, c2], [c1, c2]), true);
  assert.equal(isSameCards([c1, c2], [c1Clone, c2]), true);
  assert.equal(isSameCards([c1], [c1, c2]), false);
  assert.equal(isSameCards([c1, c2], [c2, c1]), false);
});

test('mapStarredEntriesToFlashcards: builds cards with audio and course match', () => {
  const favorites = ['你好', '世界'];
  const batchResults = new Map<string, DBDictionaryEntry>([
    [
      '你好',
      {
        traditional: '你好',
        simplified: '你好',
        pinyin: ['nǐ hǎo'],
        definitions: ['hello', 'hi'],
        frequency_score: 1,
        curriculum_level: 1,
      },
    ],
  ]);
  const vocabMap = new Map<string, Flashcard>([
    [
      '你好',
      {
        id: '1',
        bookId: 1,
        lessonId: 1,
        front: '你好',
        back: 'hello',
        pinyin: 'nǐ hǎo',
        audio: 'nihao.mp3',
        notes: '',
      },
    ],
  ]);

  const { cards, knownIds } = mapStarredEntriesToFlashcards(favorites, batchResults, vocabMap);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].id, 'star-你好');
  assert.equal(cards[0].audio, 'nihao.mp3');
  assert.equal(cards[0].back, 'hello • hi');
  assert.equal(knownIds.has('star-你好'), true);
  assert.equal(knownIds.has('star-世界'), false);
});

test('mapCustomCardsToFlashcards: filters by folder and merges course vocab', () => {
  const customCards: UserFlashcard[] = [
    {
      id: 'c1',
      userId: 'u1',
      folderId: 'folder-a',
      traditional: '貓',
      simplified: '猫',
      translation: 'cat',
      pinyin: 'māo',
      notes: '',
      createdAt: 0,
    },
    {
      id: 'c2',
      userId: 'u1',
      folderId: 'folder-b',
      traditional: '狗',
      simplified: '狗',
      translation: 'dog',
      pinyin: 'gǒu',
      notes: '',
      createdAt: 0,
    },
  ];
  const vocabMap = new Map<string, Flashcard>([
    [
      '貓',
      {
        id: '10',
        bookId: 2,
        lessonId: 3,
        front: '貓',
        back: 'cat',
        pinyin: 'māo',
        audio: 'cat.mp3',
        notes: '',
      },
    ],
  ]);

  const filtered = mapCustomCardsToFlashcards(customCards, vocabMap, 'folder-a');
  assert.equal(filtered.cards.length, 1);
  assert.equal(filtered.cards[0].id, 'custom-c1');
  assert.equal(filtered.cards[0].bookId, 2);
  assert.equal(filtered.cards[0].lessonId, 3);
  assert.equal(filtered.cards[0].audio, 'cat.mp3');

  const allCustom = mapCustomCardsToFlashcards(customCards, vocabMap, 'custom');
  assert.equal(allCustom.cards.length, 0);
});

test('filterCurriculumCards: filters by selected lessons and lesson parts', () => {
  const cards: Flashcard[] = [
    { id: '1', bookId: 1, lessonId: 1, front: '一', back: 'one', pinyin: 'yī', audio: '', notes: '' },
    { id: '2', bookId: 1, lessonId: 2, front: '二', back: 'two', pinyin: 'èr', audio: '', notes: '' },
  ];

  const res1 = filterCurriculumCards(cards, [1], {});
  assert.equal(res1.cards.length, 1);
  assert.equal(res1.cards[0].id, '1');

  const resAll = filterCurriculumCards(cards, [], {});
  assert.equal(resAll.cards.length, 2);
});

test('deriveLocalDueCardIds: returns cards due before or at timestamp', () => {
  const now = 1000000;
  const srsData: Record<string, SRSData> = {
    due: { cardId: 'due', interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: now - 1000 },
    notDue: { cardId: 'notDue', interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: now + 500000 },
  };

  const dueIds = deriveLocalDueCardIds(srsData, now);
  assert.deepEqual(dueIds, ['due']);
});
