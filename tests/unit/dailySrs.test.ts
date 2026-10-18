import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateNextReview } from '../../src/utils/srs/srsEngine';
import { applyCardReview, createEmptySessionProgress, type ReviewProgressState } from '../../src/utils/srs/reviewProgress';
import { mergeReviewEvents, type ReviewContext, type ReviewEvent } from '../../src/utils/srs/reviewEvents';
import { createDailyReviewPlan, DAILY_REVIEW_MS, dailyReviewCapacity, dailyReviewGoal, reviewDay } from '../../src/utils/srs/reviewSession';
import { isSameSrsData, rowToSrsData, srsDataToUpsert } from '../../src/utils/srs/srsRowMapping';
import type { Flashcard } from '../../src/data/flashcards';
import { createLearningSlice } from '../../src/store/slices/learningSlice';

const context = (source: ReviewContext['source'] = 'daily'): ReviewContext => ({
  id: crypto.randomUUID(), sessionId: 'test-session', source, durationMs: 20_000,
});
const empty = (): ReviewProgressState => ({ srsData: {}, learnedCards: [], sessionProgress: createEmptySessionProgress(), reviewEvents: [] });

test('quality 3 is correct recall with a different FSRS outcome than quality 1', () => {
  const now = Date.now();
  const forgot = calculateNextReview(undefined, 'word', 1, now);
  const effort = calculateNextReview(undefined, 'word', 3, now);
  assert.equal(forgot.repetition, 0);
  assert.equal(effort.repetition, 1);
  assert.ok(effort.nextReviewDate > forgot.nextReviewDate);
  assert.ok(effort.fsrs!.stability > forgot.fsrs!.stability);
});

test('an immediate quiz and optional tricky practice preserve the scheduled memory', () => {
  const initial = empty();
  const first = applyCardReview(initial, 'word', 3, context('flashcards'));
  const quiz = applyCardReview({ ...initial, ...first }, 'word', 4, context('quiz'));
  const practice = applyCardReview({ ...initial, ...quiz }, 'word', 4, { ...context('practice'), practiceOnly: true });
  assert.equal(first.reviewEvents!.at(-1)!.scheduled, true);
  assert.equal(quiz.reviewEvents!.at(-1)!.scheduled, false);
  assert.equal(practice.reviewEvents!.at(-1)!.scheduled, false);
  assert.deepEqual(first.srsData, practice.srsData);
  assert.equal(practice.reviewEvents!.length, 3);
  assert.deepEqual(practice.learnedCards, ['word']);
});

test('a practice success after a miss does not overwrite the failure schedule', () => {
  const initial = empty();
  const failed = applyCardReview(initial, 'word', 1, context());
  const replay = applyCardReview({ ...initial, ...failed }, 'word', 4, { ...context('practice'), practiceOnly: true });
  assert.deepEqual(failed.srsData, replay.srsData);
  assert.equal(replay.reviewEvents!.at(-1)!.scheduled, false);
  assert.equal(replay.reviewEvents![0].quality, 1);
});

test('duplicate attempt IDs neither reschedule nor add history', () => {
  const initial = empty();
  const attempt = context();
  const first = applyCardReview(initial, 'word', 3, attempt);
  const duplicate = applyCardReview({ ...initial, ...first }, 'word', 3, attempt);
  assert.equal(duplicate.srsData, first.srsData);
  assert.equal(duplicate.sessionProgress.cardsReviewed, 1);
});

test('FSRS state survives cloud round trips and participates in sync deltas', () => {
  const state = calculateNextReview(undefined, 'word', 3);
  const wire = srsDataToUpsert(state, 'word', true);
  const restored = rowToSrsData(wire);
  assert.deepEqual(restored, state);
  assert.ok(isSameSrsData(state, restored));
  const jsonbOrder = Object.fromEntries(Object.entries(state.fsrs!).reverse()) as typeof state.fsrs;
  assert.ok(isSameSrsData(state, { ...restored, fsrs: jsonbOrder }));
  assert.equal(isSameSrsData(state, { ...state, fsrs: { ...state.fsrs!, stability: state.fsrs!.stability + 1 } }), false);
});

test('200 overdue words form a small stable daily plan, not a rescheduled backlog', () => {
  const now = Date.now();
  const cards = Array.from({ length: 200 }, (_, i) => ({ id: `word${i}`, front: `word${i}` } as Flashcard));
  const srs = Object.fromEntries(cards.map(card => [card.id, { cardId: card.id, repetition: 1, efactor: 2.5, interval: 1, nextReviewDate: now - 1000 }]));
  const snapshot = JSON.stringify(srs);
  const plan = createDailyReviewPlan(cards, srs, [], null, now);
  assert.ok(plan.cardIds.length > 0 && plan.cardIds.length <= 15);
  assert.equal(createDailyReviewPlan(cards, srs, [], plan, now), plan);
  assert.equal(JSON.stringify(srs), snapshot);
  assert.equal(plan.activeMs, 0);
  assert.equal(plan.completed, false);
  assert.ok(DAILY_REVIEW_MS === 300_000);
});

test('daily capacity adapts to actual active pace and recovery survives overlapping pulls', () => {
  const initial = empty();
  const result = applyCardReview(initial, 'word', 3, context());
  const event = result.reviewEvents![0];
  const slow: ReviewEvent[] = Array.from({length: 8}, () => ({ ...event, id: crypto.randomUUID(), durationMs: 60_000 }));
  assert.ok(dailyReviewCapacity(slow) < dailyReviewCapacity([]));
  const merged = mergeReviewEvents([event], [event, slow[0]]);
  assert.equal(merged.length, 2);
  assert.equal(mergeReviewEvents(merged, [], event.reviewedAt).length, 0);
  const plan = createDailyReviewPlan([], {}, [event], null);
  assert.equal(plan.answers.word, 3);
  const fullDay = Array.from({length: dailyReviewCapacity([])}, (_, i) => ({ ...event, id: crypto.randomUUID(), cardId: `done-${i}` }));
  const finished = createDailyReviewPlan([{id:'remaining'} as Flashcard], {}, fullDay, null);
  assert.equal(finished.completed, true);
  assert.deepEqual(finished.cardIds, []);
});

test('upload acknowledgement preserves newer attempts and reset clears private history', () => {
  const state: ReturnType<typeof createLearningSlice> & { isReviewMode: boolean; activeReviewSessionCards: string[] | null; swipeFeedback: null } = {
    ...createLearningSlice(update => { Object.assign(state, typeof update === 'function' ? update(state) : update); }),
    isReviewMode: false, activeReviewSessionCards: null, swipeFeedback: null };
  const first = context();
  const later = context();
  state.markCardReviewed('first', 3, first);
  const uploading = state.pendingReviewEvents.map(event => event.id);
  state.markCardReviewed('later', 1, later);
  state.acknowledgeReviewEvents(uploading);
  assert.deepEqual(state.pendingReviewEvents.map(event => event.id), [later.id]);
  state.markCardReviewed('later', 1, later);
  assert.equal(state.reviewEvents.length, 2);
  assert.equal(state.pendingReviewEvents.length, 1);
  state.resetProgress();
  assert.deepEqual(state.reviewEvents, []);
  assert.deepEqual(state.pendingReviewEvents, []);
  assert.equal(state.dailyReviewPlan, null);
});

test('a short completed daily goal survives sync and repeat observations do not fill it', () => {
  const result = applyCardReview(empty(), 'word', 3, context());
  const event = { ...result.reviewEvents![0], dailyTarget: 2 };
  const repeated = { ...event, id: crypto.randomUUID(), quality: 4 as const };
  assert.equal(dailyReviewGoal([event, repeated]).completed, false);
  assert.equal(dailyReviewGoal([event, repeated]).answers.word, 3);
  const second = { ...event, id: crypto.randomUUID(), cardId: 'second' };
  const plan = createDailyReviewPlan([{id:'backlog'} as Flashcard], {}, [event, second], null);
  assert.equal(plan.completed, true);
  assert.deepEqual(plan.cardIds, []);
});

test('study days roll over at 04:00, including a resumed session', () => {
  assert.equal(reviewDay(new Date(2026,9,18,3,30).getTime()), '2026-10-17');
  assert.equal(reviewDay(new Date(2026,9,18,4,0).getTime()), '2026-10-18');
});

test('lesson learning and its quiz retain the same small batch', async () => {
  const { selectLearningBatch } = await import('../../src/utils/srs/learningBatch');
  const cards = Array.from({length: 30}, (_, i) => ({id:`lesson-${i}`} as Flashcard));
  const first = selectLearningBatch(cards, {}, []);
  assert.equal(first.length, 5);
  const ids = first.map(card => card.id);
  assert.deepEqual(selectLearningBatch(cards, {}, ids, ids), first);
  const next = selectLearningBatch(cards, {}, ids);
  assert.equal(next[0].id, 'lesson-5');
  assert.equal(next.length, 5);
});
