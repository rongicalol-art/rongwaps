import assert from 'node:assert/strict';
import test from 'node:test';
import { presenceFor } from '../../src/features/social/presence';

const base = { activeActivity: null, activeBookId: 1, racePlaying: false, race: null, selectedLessonParts: {}, socialStudying: null, socialViewingLesson: null } as unknown as Parameters<typeof presenceFor>[0];

test('an open reading or grammar window shows as Reading or Grammar, not Browsing', () => {
  assert.deepEqual(presenceFor({ ...base, socialStudying: { a: 'reading', lesson: 112 } }), { lesson: 112, a: 'reading' });
  assert.deepEqual(presenceFor({ ...base, socialStudying: { a: 'grammar', lesson: 112 }, socialViewingLesson: 105 }), { lesson: 112, a: 'grammar' });
});

test('the lesson window alone still shows as browsing that lesson', () => {
  assert.deepEqual(presenceFor({ ...base, socialViewingLesson: 105 }), { lesson: 105, a: 'lesson' });
  assert.deepEqual(presenceFor(base), { lesson: null, a: null });
});

test('a study activity wins over an open window, and a race wins over both', () => {
  const studying = { ...base, activeActivity: 'flashcards', socialStudying: { a: 'reading', lesson: 112 }, socialViewingLesson: 112 } as typeof base;
  assert.equal(presenceFor(studying).a, 'cards');
  const race = { ...studying, racePlaying: true, race: { selection: { book: 2, lessons: { 3: [1] } } } } as unknown as typeof base;
  assert.deepEqual(presenceFor(race), { lesson: 203, a: 'race' });
});
