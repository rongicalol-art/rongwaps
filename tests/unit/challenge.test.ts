import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHALLENGE_CODE, challengeLesson, challengeName, challengeOutcome, challengePath, ghostAnswered, isValidRun, newChallengeCode,
  parseChallengeLink, parseChallengePath,
} from '../../shared/challenge';
import { serveSite } from '../../server/content';
import type { Context } from '../../server/env';

test('challenge codes are 8 unambiguous letters, evenly drawn', () => {
  for (let i = 0; i < 200; i += 1) assert.match(newChallengeCode(), CHALLENGE_CODE);
  assert.equal(newChallengeCode(() => new Uint8Array([0, 31, 32, 63, 64, 255, 1, 2])), 'A9A9A9BC');
});

test('a challenge address names its lesson, and nothing else parses as one', () => {
  assert.equal(challengePath({ book: 1, lesson: 5 }, 'K7Q2MXAB'), '/c/1-5/K7Q2MXAB');
  assert.deepEqual(parseChallengePath('/c/1-5/K7Q2MXAB'), { book: 1, lesson: 5, code: 'K7Q2MXAB', page: '/c/1-5' });
  assert.deepEqual(parseChallengePath('/c/3-16/K7Q2MXAB/'), { book: 3, lesson: 16, code: 'K7Q2MXAB', page: '/c/3-16' });
  for (const path of ['/c/1-5', '/c/1-5/k7q2mxab', '/c/1-5/K7Q2MX0B', '/c/1-0/K7Q2MXAB', '/c/0-5/K7Q2MXAB', '/c/1-5/K7Q2MXAB/x', '/join/K7Q2MXAB', null]) {
    assert.equal(parseChallengePath(path), null, String(path));
  }
});

test('a link is named after the first numbered lesson; an Introduction-only quiz has none', () => {
  assert.deepEqual(challengeLesson({ book: 1, lessons: { 0: [1], 7: [1], 3: [2] }, types: [] }), { book: 1, lesson: 3 });
  assert.equal(challengeLesson({ book: 1, lessons: { 0: [1] }, types: [] }), null);
});

test('a run is one mark per word that never goes back in time', () => {
  assert.ok(isValidRun([0, 1200, 1200, 5000], 4));
  assert.ok(!isValidRun([1200, 900], 2), 'back in time');
  assert.ok(!isValidRun([1, 2], 3), 'one mark per word');
  assert.ok(!isValidRun([1.5], 1), 'whole milliseconds');
  assert.ok(!isValidRun([3_600_001], 1), 'at most an hour');
  assert.ok(!isValidRun([], 0));
});

test('the ghost has answered every word whose mark has passed', () => {
  const run = [1000, 2000, 2000, 4000];
  assert.equal(ghostAnswered(run, 0), 0);
  assert.equal(ghostAnswered(run, 999), 0);
  assert.equal(ghostAnswered(run, 1000), 1);
  assert.equal(ghostAnswered(run, 2500), 3);
  assert.equal(ghostAnswered(run, 9999), 4);
});

test('the better score wins; the same score goes to the faster run', () => {
  assert.equal(challengeOutcome({ correct: 11, total: 12, ms: 90_000 }, { correct: 10, total: 12, ms: 60_000 }), 'won');
  assert.equal(challengeOutcome({ correct: 10, total: 12, ms: 50_000 }, { correct: 11, total: 12, ms: 90_000 }), 'lost');
  assert.equal(challengeOutcome({ correct: 10, total: 12, ms: 50_000 }, { correct: 10, total: 12, ms: 60_000 }), 'won');
  assert.equal(challengeOutcome({ correct: 10, total: 12, ms: 60_000 }, { correct: 10, total: 12, ms: 60_000 }), 'tied');
  // A deck that changed size since the link was made compares by share.
  assert.equal(challengeOutcome({ correct: 10, total: 10, ms: 1 }, { correct: 11, total: 12, ms: 1 }), 'won');
});

test('a challenge card from the database is checked before it is played', () => {
  const card = { name: 'Mia', color: 'jade', selection: { book: 1, lessons: { 5: [1, 2, 3] }, types: ['meaning'] }, correct: 2, total: 3, run: [1, 2, 3], mine: false, friends: true };
  assert.deepEqual(parseChallengeLink('K7Q2MXAB', card), { code: 'K7Q2MXAB', ...card, selection: { book: 1, lessons: { 5: [1, 2, 3] }, types: ['meaning'] } });
  assert.equal(parseChallengeLink('K7Q2MXAB', null), null);
  assert.equal(parseChallengeLink('K7Q2MXAB', { ...card, run: [3, 2, 1] }), null);
  assert.equal(parseChallengeLink('K7Q2MXAB', { ...card, correct: 4 }), null);
  assert.equal(parseChallengeLink('K7Q2MXAB', { ...card, selection: { book: 4, lessons: { 1: [1] } } }), null, 'a locked book');
  assert.equal(parseChallengeLink('K7Q2MXAB', { ...card, color: 'neon' })?.color, 'blue');
  assert.equal(challengeName('  Mia  '), 'Mia');
  assert.equal(challengeName(''), 'A classmate');
});

test('a challenge link gets its lesson preview page, never indexed; a missing page falls back to the app', async () => {
  const served: string[] = [];
  const assets = {
    fetch: async (request: Request) => {
      const path = new URL(request.url).pathname;
      served.push(path);
      if (path === '/c/1-5') return new Response('<title>Book 1 Lesson 5 · Can you beat my score?</title>', { status: 200 });
      if (path === '/') return new Response('<title>app</title>', { status: 200 });
      return new Response('missing', { status: 404 });
    },
  };
  const context = { env: { ASSETS: assets }, report: () => {} } as unknown as Context;
  const preview = await serveSite(context, new Request('https://app.test/c/1-5/K7Q2MXAB'), new URL('https://app.test/c/1-5/K7Q2MXAB'));
  assert.equal(preview.status, 200);
  assert.match(await preview.text(), /Can you beat my score/);
  assert.equal(preview.headers.get('x-robots-tag'), 'noindex');
  assert.equal(preview.headers.get('cache-control'), 'no-cache');
  const fallback = await serveSite(context, new Request('https://app.test/c/2-20/K7Q2MXAB'), new URL('https://app.test/c/2-20/K7Q2MXAB'));
  assert.equal(fallback.status, 200, 'a valid link always opens the app');
  assert.equal(await fallback.text(), '<title>app</title>');
  const bad = await serveSite(context, new Request('https://app.test/c/1-5/nope'), new URL('https://app.test/c/1-5/nope'));
  assert.equal(bad.status, 404, 'anything else under /c is not a page');
  assert.deepEqual(served.slice(0, 2), ['/c/1-5/K7Q2MXAB', '/c/1-5']);
});
