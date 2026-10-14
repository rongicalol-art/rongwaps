import assert from 'node:assert/strict';
import test from 'node:test';
import { getFlashcardResume, getQuizResume, resumeCopy, resumeDetail } from '../../src/utils/srs/resumeState';

const none = { sessionProgressIndex: {}, sessionCardOrder: {} };

test('flashcard resume is null for an untouched or first-card session', () => {
  assert.equal(getFlashcardResume('k', none), null);
  assert.equal(getFlashcardResume('k', { ...none, sessionProgressIndex: { k: 0 } }), null);
});

test('flashcard resume reports the card position', () => {
  const r = getFlashcardResume('k', { ...none, sessionProgressIndex: { k: 4 } });
  assert.equal(r?.kind, 'cards');
  assert.equal(r?.position, 5);
  assert.equal(resumeDetail(r!), 'Card 5');
});

test('flashcard resume prefers an unfinished review pass', () => {
  const r = getFlashcardResume('k', { sessionProgressIndex: { k: 1 }, sessionCardOrder: { 'k#review': ['a', 'b', 'c'] } });
  assert.equal(r?.kind, 'review');
  assert.equal(resumeDetail(r!), '2 words left to review');
});

test('quiz resume finds plain, picked-types and typing keys, and ignores other decks', () => {
  assert.equal(getQuizResume('k', none), null);
  const plain = getQuizResume('k', { ...none, sessionProgressIndex: { 'k|quiz': 3 } });
  assert.equal(plain?.position, 4);
  assert.deepEqual(plain?.quizTypes, []);
  assert.deepEqual(getQuizResume('k', { ...none, sessionProgressIndex: { 'k|types:a+b': 2 } })?.quizTypes, ['a', 'b']);
  assert.equal(getQuizResume('k', { ...none, sessionProgressIndex: { 'k:typing': 2 } })?.quizTypes, undefined);
  assert.equal(getQuizResume('k', { ...none, sessionProgressIndex: { other: 5 } }), null);
});

test('quiz resume inside the review round says review', () => {
  const r = getQuizResume('k', { sessionProgressIndex: { 'k|quiz': 1 }, sessionCardOrder: { 'k|quiz#review': ['a', 'b', 'c'] } });
  assert.equal(r?.kind, 'review');
  assert.equal(resumeDetail(r!), '2 words left to review');
  assert.equal(resumeCopy(r!).continueLabel, 'Continue review');
});

test('picked quiz types share one continue label', () => {
  const r = getQuizResume('k', { sessionProgressIndex: { 'k|types:listen': 2 }, sessionCardOrder: {} });
  assert.equal(resumeCopy(r!).continueLabel, 'Continue quiz');
  assert.equal(resumeCopy(getQuizResume('k', { sessionProgressIndex: { 'k|quiz': 2 }, sessionCardOrder: {} })!).continueLabel, 'Continue quiz');
});

test('flashcard progress is never read as quiz progress, and the reverse', () => {
  assert.equal(getQuizResume('k', { ...none, sessionProgressIndex: { k: 7 } }), null);
  assert.equal(getFlashcardResume('k', { ...none, sessionProgressIndex: { 'k|quiz': 7 } }), null);
});

test('each saved session knows the screen it was left in', () => {
  assert.equal(getFlashcardResume('k', { ...none, sessionProgressIndex: { k: 3 } })?.mode, 'flashcards');
  assert.equal(getQuizResume('k', { ...none, sessionProgressIndex: { 'k|quiz': 3 } })?.mode, 'quiz');
  assert.equal(getQuizResume('k', { sessionProgressIndex: { 'k|quiz': 1 }, sessionCardOrder: { 'k|quiz#review': ['a', 'b'] } })?.mode, 'quiz');
});

test('a quiz review round left on its first card still resumes, and beats a plain position', () => {
  const first = getQuizResume('k', { sessionProgressIndex: { 'k|quiz': 0 }, sessionCardOrder: { 'k|quiz#review': ['a', 'b', 'c', 'd'] } });
  assert.equal(first?.kind, 'review');
  assert.equal(first?.left, 4);
  const both = getQuizResume('k', { sessionProgressIndex: { 'k|quiz': 6, 'k|types:listen': 0 }, sessionCardOrder: { 'k|types:listen#review': ['a', 'b'] } });
  assert.equal(both?.kind, 'review');
  assert.deepEqual(both?.quizTypes, ['listen']);
  assert.equal(getQuizResume('k', { ...none, sessionProgressIndex: { 'k|quiz': 0 } })?.position, 1);
});

test('an explicitly saved first quiz question resumes across mixed, picked and typing modes', () => {
  for (const key of ['k|quiz', 'k|types:listen', 'k:typing']) {
    const result = getQuizResume('k', { ...none, sessionProgressIndex: { [key]: 0 } });
    assert.equal(result?.kind, 'quiz');
    assert.equal(result?.mode, 'quiz');
    assert.equal(result?.position, 1);
    assert.deepEqual(result?.keys, [key]);
  }
  assert.equal(getQuizResume('k', none), null, 'a picker-only visit has no saved question');
  for (const index of [-1, NaN, Infinity, 0.5]) {
    assert.equal(getQuizResume('k', { ...none, sessionProgressIndex: { 'k|quiz': index } }), null);
  }
});

test('first-position reviews remain resumable when the missed list covers the entire deck', () => {
  const cards = getFlashcardResume('k', { sessionProgressIndex: { k: 0 }, sessionCardOrder: { 'k#review': ['a', 'b', 'c', 'd'] } });
  assert.equal(cards?.kind, 'review');
  assert.equal(cards?.position, 1);
  assert.equal(cards?.left, 4);
  const quiz = getQuizResume('k', { sessionProgressIndex: { 'k|quiz': 0 }, sessionCardOrder: { 'k|quiz#review': ['a', 'b', 'c', 'd'] } });
  assert.equal(quiz?.kind, 'review');
  assert.equal(quiz?.mode, 'quiz');
  assert.equal(quiz?.position, 1);
  assert.equal(quiz?.left, 4);
  assert.deepEqual(quiz?.quizTypes, []);
});
