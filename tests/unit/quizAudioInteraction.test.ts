import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuizMixed } from '../../src/screens/quiz/QuizMixed';
import type { Flashcard } from '../../src/data/flashcards';

const cards: Flashcard[] = [
  { id: 'audio-fixture-teacher', bookId: 1, lessonId: 1, front: '老師', back: 'teacher', pinyin: 'lao3 shi1', audio: 'teacher.mp3' },
  { id: 'audio-fixture-student', bookId: 1, lessonId: 1, front: '學生', back: 'student', pinyin: 'xue2 sheng1', audio: 'student.mp3' },
];

test('word building and listening render before any audio preparation completes', () => {
  // Server rendering runs no effects: no recording or pronunciation index has loaded.
  // Rendering does not grade cards or write learning progress.
  for (const type of ['build', 'listen'] as const) {
    const html = renderToStaticMarkup(createElement(QuizMixed, {
      cards, types: [type], sessionKey: `audio-fixture-${type}`, activeBookId: 1, onEnd: () => {},
    }));
    assert.match(html, type === 'build' ? /Build the Chinese word/ : /What did you hear\?/);
    assert.doesNotMatch(html, /Getting audio ready|Skip audio preparation/);
  }
});
