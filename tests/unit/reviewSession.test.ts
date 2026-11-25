import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { buildReviewSession, createDailyReviewPlan, FRESH_INTERVAL_DAYS, isExtraDailyReview, REVIEW_SESSION_CAP } from '../../src/utils/srs/reviewSession';
import type { SRSData } from '../../src/utils/srs/srsEngine';

function card(id: string): Flashcard {
  return {
    id,
    bookId: 1,
    lessonId: 1,
    front: id,
    back: '',
    pinyin: '',
    audio: '',
    notes: '',
  };
}

function srs(overrides: Partial<SRSData>): SRSData {
  return {
    cardId: 'x',
    interval: 1,
    repetition: 1,
    efactor: 2.5,
    nextReviewDate: 0,
    ...overrides,
  };
}

test('review session is capped at the configured limit', () => {
  const dueCards = Array.from({ length: 250 }, (_, i) => card(`b01l01p01w${String(i).padStart(3, '0')}`));
  const srsData: Record<string, SRSData> = {};
  for (let i = 0; i < 250; i += 1) {
    srsData[`b01l01p01w${String(i).padStart(3, '0')}`] = srs({ cardId: `w${i}`, nextReviewDate: i });
  }

  const session = buildReviewSession(dueCards, srsData);
  assert.equal(session.length, REVIEW_SESSION_CAP);
  assert.ok(REVIEW_SESSION_CAP <= 100);
});

test('learning-phase cards come first, then most-overdue reviews', () => {
  const srsData: Record<string, SRSData> = {
    learning_a: srs({ cardId: 'learning_a', nextReviewDate: 5_000, learningStep: 1 }),
    learning_b: srs({ cardId: 'learning_b', nextReviewDate: 1_000, learningStep: 0 }),
    review_old: srs({ cardId: 'review_old', nextReviewDate: 100 }),
    review_new: srs({ cardId: 'review_new', nextReviewDate: 900 }),
  };
  const dueCards = ['review_new', 'learning_a', 'review_old', 'learning_b'].map(card);

  const session = buildReviewSession(dueCards, srsData);
  assert.deepEqual(
    session.map((c) => c.id),
    ['learning_b', 'learning_a', 'review_old', 'review_new'],
  );
});

test('due-date ties prefer the weakest card (lowest ease factor)', () => {
  const srsData: Record<string, SRSData> = {
    strong: srs({ cardId: 'strong', nextReviewDate: 100, efactor: 2.8 }),
    weak: srs({ cardId: 'weak', nextReviewDate: 100, efactor: 1.4 }),
  };
  const session = buildReviewSession([card('strong'), card('weak')], srsData);
  assert.deepEqual(session.map((c) => c.id), ['weak', 'strong']);
});

test('under the cap the full due pool is returned in priority order', () => {
  const srsData: Record<string, SRSData> = {};
  const ids = ['a', 'b', 'c'];
  for (const [index, id] of ids.entries()) {
    srsData[id] = srs({ cardId: id, nextReviewDate: (3 - index) * 1000 });
  }
  const session = buildReviewSession(ids.map(card), srsData);
  assert.deepEqual(session.map((c) => c.id), ['c', 'b', 'a']);
});

function backlog(prefix: string, count: number, interval: number, dueFrom: number, srsData: Record<string, SRSData>): Flashcard[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `${prefix}${String(i).padStart(3, '0')}`;
    srsData[id] = srs({ cardId: id, interval, nextReviewDate: dueFrom + i });
    return card(id);
  });
}

test('fresh words get half of a session even behind a big, more overdue backlog', () => {
  const srsData: Record<string, SRSData> = {};
  const old = backlog('old', 120, 30, 0, srsData);
  const fresh = backlog('new', 40, 2, 10_000, srsData);
  const session = buildReviewSession([...old, ...fresh], srsData, 20);
  const ids = session.map(c => c.id);
  assert.equal(ids.filter(id => id.startsWith('new')).length, 10);
  assert.equal(ids.filter(id => id.startsWith('old')).length, 10);
  // Alternating, fresh first, each group most overdue first.
  assert.deepEqual(ids.slice(0, 4), ['new000', 'old000', 'new001', 'old001']);
});

test('the split holds when the session is cut short', () => {
  const srsData: Record<string, SRSData> = {};
  const cards = [...backlog('old', 50, 20, 0, srsData), ...backlog('new', 50, 1, 5_000, srsData)];
  const firstSix = buildReviewSession(cards, srsData, 20).slice(0, 6).map(c => c.id.slice(0, 3));
  assert.deepEqual(firstSix, ['new', 'old', 'new', 'old', 'new', 'old']);
});

test('when one group runs short the other fills the session', () => {
  const srsData: Record<string, SRSData> = {};
  const fewFresh = [...backlog('old', 60, 30, 0, srsData), ...backlog('new', 3, 2, 10_000, srsData)];
  const a = buildReviewSession(fewFresh, srsData, 20).map(c => c.id);
  assert.equal(a.length, 20);
  assert.equal(a.filter(id => id.startsWith('new')).length, 3);

  const srsData2: Record<string, SRSData> = {};
  const fewOld = [...backlog('old', 2, 30, 0, srsData2), ...backlog('new', 60, 2, 10_000, srsData2)];
  const b = buildReviewSession(fewOld, srsData2, 20).map(c => c.id);
  assert.equal(b.length, 20);
  assert.equal(b.filter(id => id.startsWith('old')).length, 2);
});

test(`fresh means last scheduled ${FRESH_INTERVAL_DAYS} days ahead or fewer`, () => {
  const srsData: Record<string, SRSData> = {
    oldA: srs({ cardId: 'oldA', interval: FRESH_INTERVAL_DAYS + 1, nextReviewDate: 1 }),
    oldB: srs({ cardId: 'oldB', interval: 40, nextReviewDate: 2 }),
    edge: srs({ cardId: 'edge', interval: FRESH_INTERVAL_DAYS, nextReviewDate: 50 }),
  };
  const session = buildReviewSession(['oldA', 'oldB', 'edge'].map(card), srsData);
  assert.deepEqual(session.map(c => c.id), ['edge', 'oldA', 'oldB']);
});

test('learning-phase cards still come before fresh and older words', () => {
  const srsData: Record<string, SRSData> = {
    old: srs({ cardId: 'old', interval: 30, nextReviewDate: 1 }),
    fresh: srs({ cardId: 'fresh', interval: 2, nextReviewDate: 2 }),
    step: srs({ cardId: 'step', interval: 10, nextReviewDate: 3, learningStep: 1 }),
  };
  const session = buildReviewSession(['old', 'fresh', 'step'].map(card), srsData);
  assert.deepEqual(session.map(c => c.id), ['step', 'fresh', 'old']);
});

test('the daily review plan gives fresh words their share', () => {
  const srsData: Record<string, SRSData> = {};
  const cards = [...backlog('old', 100, 25, 0, srsData), ...backlog('new', 30, 3, 9_000, srsData)];
  const plan = createDailyReviewPlan(cards, srsData, [], null, new Date(2026, 10, 25, 12).getTime());
  const fresh = plan.cardIds.filter(id => id.startsWith('new')).length;
  assert.ok(plan.cardIds.length > 0);
  assert.ok(Math.abs(fresh - (plan.cardIds.length - fresh)) <= 1, `fresh ${fresh} of ${plan.cardIds.length}`);
  assert.equal(plan.cardIds[0], 'new000');
});

test('an empty due pool yields an empty session', () => {
  assert.deepEqual(buildReviewSession([], {}), []);
});

test('only "Review more" after a finished day is extra; every other review deck counts as the daily review', () => {

  const plan = { day: '2026-11-23', cardIds: ['a', 'b'], answers: {}, activeMs: 0, completed: false };
  assert.equal(isExtraDailyReview(null, null), false);
  assert.equal(isExtraDailyReview(plan, ['c']), false, 'today not done yet: still the daily review');
  const done = { ...plan, completed: true };
  assert.equal(isExtraDailyReview(done, null), false);
  assert.equal(isExtraDailyReview(done, ['a', 'b']), false, 'reopening today\'s own words');
  assert.equal(isExtraDailyReview(done, ['c', 'd']), true);
});
