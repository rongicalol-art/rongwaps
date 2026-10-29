import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRace, applyRaceAction, DISCONNECT_GRACE_MS, enterRace, newRaceRoom, parseRaceAction, parseSelection, REVIEW_GRACE_MS, socialImage, summarizeRoom } from '../../shared/quizRace';
import { chatText, nextChatRate, parseLobbyMessage, type ChatRate } from '../../shared/lobby';
import { RACE_TYPES } from '../../shared/quizRace';
import type { QuizTypeId } from '../../src/utils/vocabulary/quizDirector';

const seed = () => 'next';
const planHash = 'a'.repeat(64);
const ready = (room: ReturnType<typeof newRaceRoom>, ids: string[], now: number) => {
  for (const id of ids) applyRaceAction(room, id, { type: 'ready', planHash, reviewFlow: 1, round: room.round }, now++, seed);
};

test('race types stay in step with the quiz director', () => {
  const ids: readonly QuizTypeId[] = RACE_TYPES;
  assert.equal(ids.length, 6);
});

test('selection keeps only beta lessons and real parts', () => {
  assert.deepEqual(parseSelection({ lessons: { 0: [1], 8: [3, 3, 2], 9: [1], 16: [1, 2, 3], 17: [1], x: [1], 2: [0, 4] }, types: ['build', 'bad'] }), { book: 1, lessons: { 0: [1], 8: [2, 3], 9: [1], 16: [1, 2, 3] }, types: ['build'] });
  assert.throws(() => parseSelection({ lessons: { 2: [] } }));
});

test('social profile images only allow Google avatars and signed profile avatar URLs', () => {
  const storage = 'https://project.supabase.co';
  assert.equal(socialImage('https://lh3.googleusercontent.com/a/photo=s96-c', storage), 'https://lh3.googleusercontent.com/a/photo=s96-c');
  assert.equal(socialImage('https://project.supabase.co/storage/v1/object/sign/profile-media/user/avatar.webp?token=secret', storage), 'https://project.supabase.co/storage/v1/object/sign/profile-media/user/avatar.webp?token=secret');
  assert.equal(socialImage('http://lh3.googleusercontent.com/a/photo', storage), undefined);
  assert.equal(socialImage('https://evil.example/avatar.png', storage), undefined);
  assert.equal(socialImage('https://project.supabase.co/storage/v1/object/sign/profile-media/user/cover.webp?token=secret', storage), undefined);
  assert.equal(socialImage(`https://lh3.googleusercontent.com/${'a'.repeat(2100)}`, storage), undefined);
});

test('visit cards may carry only a signed profile cover URL', () => {
  const storage = 'https://project.supabase.co';
  const cover = 'https://project.supabase.co/storage/v1/object/sign/profile-media/user/cover.webp?token=secret';
  assert.equal(socialImage(cover, storage, 'cover'), cover);
  assert.equal(socialImage('https://project.supabase.co/storage/v1/object/sign/profile-media/user/avatar.webp?token=secret', storage, 'cover'), undefined);
  assert.equal(socialImage('https://lh3.googleusercontent.com/a/photo=s96-c', storage, 'cover'), undefined);
});

test('visit card messages keep only bounded, known fields', () => {
  const card = { cv: 'jade', b: 1, w: 214, k: 168, st: 12, s: 1788220800000, ci: 'https://x.test/cover.webp', extra: 'dropped' };
  assert.deepEqual(parseLobbyMessage({ t: 'card', to: 'user-b', v: card }), { t: 'card', to: 'user-b', v: { cv: 'jade', b: 1, w: 214, k: 168, st: 12, s: 1788220800000, ci: 'https://x.test/cover.webp' } });
  assert.deepEqual(parseLobbyMessage({ t: 'card', to: 'user-b', v: { ...card, cv: 'neon' } }), { t: 'card', to: 'user-b', v: null });
  assert.deepEqual(parseLobbyMessage({ t: 'card', to: 'user-b', v: { ...card, w: -1 } }), { t: 'card', to: 'user-b', v: null });
  assert.deepEqual(parseLobbyMessage({ t: 'card-ask', u: 'user-b' }), { t: 'card-ask', u: 'user-b' });
  assert.throws(() => parseLobbyMessage({ t: 'card-ask', u: '' }));
  assert.throws(() => parseLobbyMessage({ t: 'card', to: 'x'.repeat(65), v: card }));
});

test('race places are awarded only after all missed words are corrected', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 2, total: 2, correct: 1, reviewComplete: false }, 5, seed);
  assert.equal(room.players[0].finishedAt, null);
  assert.equal(room.players[0].place, null);
  assert.equal(room.phase, 'race');
  applyRaceAction(room, 'b', { type: 'progress', round: 1, answered: 2, total: 2, correct: 2, reviewComplete: true }, 6, seed);
  assert.equal(room.players[1].place, 1);
  assert.equal(room.phase, 'race', 'another player remains in review');
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 2, total: 2, correct: 1, reviewComplete: true }, 7, seed);
  assert.equal(room.players[0].place, 2);
  assert.equal(room.phase, 'results');
});

test('race deadline starts a bounded review window; old clients fail preparation safely', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  applyRaceAction(room, 'a', parseRaceAction({ type: 'ready', planHash, round: 1 }), 2, seed);
  applyRaceAction(room, 'b', parseRaceAction({ type: 'ready', planHash, round: 1 }), 3, seed);
  assert.equal(room.phase, 'results');
  assert.equal(room.prepareError, 'client-mismatch');

  const current = newRaceRoom('GHJKLM', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(current, 'a', 'A', 'blue', 0); enterRace(current, 'b', 'B', 'jade', 0);
  applyRaceAction(current, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(current, ['a', 'b'], 2);
  advanceRace(current, current.deadline);
  assert.equal(current.phase, 'review');
  assert.equal(current.reviewDeadline, current.deadline + REVIEW_GRACE_MS);
  advanceRace(current, current.reviewDeadline!);
  assert.equal(current.phase, 'results');

  const delayed = newRaceRoom('NPQRST', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(delayed, 'a', 'A', 'blue', 0); enterRace(delayed, 'b', 'B', 'jade', 0);
  applyRaceAction(delayed, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(delayed, ['a', 'b'], 2);
  advanceRace(delayed, delayed.deadline + REVIEW_GRACE_MS + 1);
  assert.equal(delayed.phase, 'results', 'a delayed alarm cannot extend the review deadline');
});

test('host leaving hands the room on; finishing order sets places; deadline ends the race', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0); enterRace(room, 'c', 'C', 'plum', 0);
  assert.throws(() => applyRaceAction(room, 'b', { type: 'start', round: 1 }, 1, seed));
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  assert.equal(room.phase, 'preparing');
  assert.equal(room.deadline, 0, 'the race clock waits for every player to prepare');
  assert.throws(() => enterRace(room, 'd', 'D', 'ink', 2), /started/);
  ready(room, ['a', 'b', 'c'], 3);
  assert.equal(room.phase, 'race');
  applyRaceAction(room, 'b', parseRaceAction({ type: 'progress', round: 1, answered: 3, total: 3, correct: 7, reviewComplete: true }), 6, seed);
  assert.equal(room.players[1].place, 1);
  assert.equal(room.players[1].correct, 3);
  applyRaceAction(room, 'a', { type: 'leave' }, 7, seed);
  assert.equal(room.hostId, 'b');
  assert.equal(room.phase, 'race');
  applyRaceAction(room, 'c', { type: 'progress', round: 1, answered: 1, total: 4, correct: 1, reviewComplete: false }, room.deadline + REVIEW_GRACE_MS + 1, seed);
  assert.equal(room.phase, 'results');
  assert.equal(summarizeRoom(room).joinable, false);
});

test('lobby frames are validated and trimmed', () => {
  assert.deepEqual(parseLobbyMessage({ t: 'here', l: 101, a: 'nope' }), { t: 'here', l: 101, a: null, show: true });
  assert.equal((parseLobbyMessage({ t: 'here', l: 101, a: 'lesson', i: 'https://lh3.googleusercontent.com/photo' }) as { i?: string }).i, 'https://lh3.googleusercontent.com/photo');
  assert.equal((parseLobbyMessage({ t: 'here', l: 101, a: 'lesson', i: 'x'.repeat(2050) }) as { i?: string }).i, undefined);
  assert.equal((parseLobbyMessage({ t: 'say', l: 1, text: `  ${'字'.repeat(400)}\u0007 ` }) as { text: string }).text.length, 300);
  assert.throws(() => parseLobbyMessage({ t: 'say', l: 1, text: '   ' }));
  assert.throws(() => parseLobbyMessage({ t: 'cheer', to: ['x'], p: 9 }));
  assert.throws(() => parseLobbyMessage({ t: 'cheer', to: 'x', p: 1 }));
  assert.throws(() => parseLobbyMessage({ t: 'invite', to: ['x'], code: 'abc' }));
});


test('a disconnected host keeps its seat for a minute, then ownership passes to a connected player', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), true, 's', 0);
  enterRace(room, 'a', 'A', 'jade', 0); enterRace(room, 'b', 'B', 'jade', 0);
  room.players[0].disconnectedAt = 10;
  enterRace(room, 'a', 'A', 'jade', 20);
  assert.equal(room.players[0].disconnectedAt, 10, 'HTTP ticket retries do not extend the grace period');
  advanceRace(room, DISCONNECT_GRACE_MS);
  assert.equal(room.hostId, 'a');
  advanceRace(room, DISCONNECT_GRACE_MS + 10);
  assert.equal(room.hostId, 'b');
  assert.deepEqual(room.players.map(p => p.id), ['b']);
  applyRaceAction(room, 'b', { type: 'leave' }, DISCONNECT_GRACE_MS + 11, seed);
  assert.equal(room.expiresAt, DISCONNECT_GRACE_MS + 11);
  assert.equal(summarizeRoom(room).joinable, false);
});

test('explicit departure during a race cannot be undone by a late reconnect', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  applyRaceAction(room, 'a', { type: 'leave' }, 4, seed);
  assert.throws(() => enterRace(room, 'a', 'A', 'blue', 5), /underway/);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 1, total: 1, correct: 1, reviewComplete: true }, 5, seed), /Join/);
  assert.equal(room.hostId, 'b');
});

test('a recently left participant can reclaim their results seat but cannot interrupt an active round', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 1, total: 1, correct: 1, reviewComplete: true }, 5, seed);
  applyRaceAction(room, 'a', { type: 'leave' }, 6, seed);
  assert.throws(() => enterRace(room, 'a', 'A', 'blue', 7), /underway/);
  applyRaceAction(room, 'b', { type: 'progress', round: 1, answered: 1, total: 1, correct: 1, reviewComplete: true }, 8, seed);
  assert.equal(room.phase, 'results');
  const restored = enterRace(room, 'a', 'A new name', 'plum', 9);
  assert.equal(restored.left, false);
  assert.equal(restored.place, 1);
  assert.equal(room.hostId, 'b', 'rejoining does not reclaim transferred host ownership');
});

test('a race needs two connected players; deadlines and round numbers reject late frames', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed), /two players/);
  enterRace(room, 'b', 'B', 'blue', 0);
  room.players[1].disconnectedAt = 0;
  assert.throws(() => applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed), /connect/);
  room.players[1].disconnectedAt = null;
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 2, seed);
  applyRaceAction(room, 'a', { type: 'ready', planHash, reviewFlow: 1, round: 1 }, 3, seed);
  assert.equal(room.phase, 'preparing', 'one ready player cannot start the clock');
  applyRaceAction(room, 'b', { type: 'ready', planHash, reviewFlow: 1, round: 1 }, 4, seed);
  assert.equal(room.startedAt, 4, 'the clock starts when the final player becomes ready');
  applyRaceAction(room, 'b', { type: 'progress', round: 1, answered: 1, total: 1, correct: 1, reviewComplete: true }, room.deadline + REVIEW_GRACE_MS + 1, seed);
  assert.equal(room.phase, 'results');
  assert.equal(room.players[1].place, null);
  applyRaceAction(room, 'a', { type: 'rematch', round: 1 }, room.deadline + 2, seed);
  assert.equal(room.round, 2);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'start', round: 1 }, room.deadline + 3, seed), /round/);
  assert.throws(() => parseRaceAction({ type: 'start' }), /connection/);
  assert.throws(() => parseRaceAction({ type: 'ready', round: 1, planHash: 'different' }), /Invalid/);
});

test('progress freezes the deck size and never lets correct pass answered', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 2, total: 4, correct: 1, reviewComplete: false }, 2, seed);
  // A late frame for an answer already counted still adds its point.
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 2, total: 4, correct: 2, reviewComplete: false }, 3, seed);
  assert.equal(room.players[0].correct, 2);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 3, total: 5, correct: 3, reviewComplete: false }, 4, seed), /deck changed/);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 1, total: 4, correct: 1, reviewComplete: false }, 5, seed);
  assert.deepEqual([room.players[0].answered, room.players[0].correct], [2, 2]);
  applyRaceAction(room, 'a', parseRaceAction({ type: 'progress', round: 1, answered: 3, total: 4, correct: 4, reviewComplete: false }), 6, seed);
  assert.equal(room.players[0].correct, 3);
});

test('lost or merged progress frames never cost points: the final score is the phone\'s count', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  // Answered ran ahead of correct (frames for those answers were lost on a reconnect)…
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 30, total: 44, correct: 18, reviewComplete: false }, 3, seed);
  // …then the review finished with 42 first-pass answers right.
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 44, total: 44, correct: 42, reviewComplete: true }, 4, seed);
  assert.deepEqual([room.players[0].correct, room.players[0].finishedAt], [42, 4]);
});

test('preparation timeout removes players who never finish loading, then closes a one-player race', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  applyRaceAction(room, 'a', { type: 'ready', planHash, reviewFlow: 1, round: 1 }, 2, seed);
  advanceRace(room, room.prepareDeadline!);
  assert.equal(room.phase, 'results');
  assert.equal(room.players.find(player => player.id === 'b')?.left, true);
  assert.equal(room.players.find(player => player.id === 'a')?.left, false);
  assert.equal(room.deadline, 0, 'the abandoned preparation did not start a timed race');
});

test('preparation timeout starts the ready players and removes only the slow player', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0); enterRace(room, 'c', 'C', 'plum', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  const deadline = room.prepareDeadline!;
  advanceRace(room, deadline);
  assert.equal(room.phase, 'race');
  assert.equal(room.startedAt, deadline);
  assert.equal(room.players.find(player => player.id === 'c')?.leftReason, 'preparation-timeout');
  assert.ok(room.players.filter(player => !player.left).every(player => player.preparedAt != null));
});

test('a host leaving during preparation ends the round cleanly and identifies the failure', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  applyRaceAction(room, 'a', { type: 'ready', planHash, reviewFlow: 1, round: 1 }, 2, seed);
  applyRaceAction(room, 'a', { type: 'leave' }, 3, seed);
  assert.equal(room.hostId, 'b');
  assert.equal(room.phase, 'results');
  assert.equal(room.prepareError, 'not-ready');
});

test('players with different quiz data return to results instead of racing different cards', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  applyRaceAction(room, 'a', { type: 'ready', planHash, reviewFlow: 1, round: 1 }, 2, seed);
  applyRaceAction(room, 'b', { type: 'ready', planHash: 'b'.repeat(64), reviewFlow: 1, round: 1 }, 3, seed);
  assert.equal(room.phase, 'results');
  assert.equal(room.prepareError, 'content-mismatch');
  assert.equal(room.startedAt, null);
});


test('chat normalizes controls, preserves emoji boundaries and treats markup as text', () => {
  assert.equal(chatText('  hi\nthere\u202e\u0007  '), 'hi there');
  assert.equal(Array.from(chatText('😀'.repeat(400))).length, 300);
  assert.equal(chatText('<script>alert(1)</script>'), '<script>alert(1)</script>');
  assert.equal(chatText({ text: 'injected' }), '');
  assert.deepEqual(parseLobbyMessage({ t: 'say', l: 0, text: 'Hello everyone' }), { t: 'say', l: 0, text: 'Hello everyone' });
});

test('chat cooldown, burst and duplicate limits survive serialized state', () => {
  let rate: ChatRate | null = nextChatRate(null, 'first', 100_000);
  assert.equal(nextChatRate(rate, 'too soon', 100_999), null);
  for (let index = 1; index < 5; index++) rate = nextChatRate(rate, `line ${index}`, 100_000 + index * 1000);
  assert.ok(rate);
  assert.equal(nextChatRate(rate, 'sixth', 105_000), null);
  const restored = JSON.parse(JSON.stringify(rate)) as ChatRate;
  assert.equal(nextChatRate(restored, 'line 4', 111_000), null);
  assert.ok(nextChatRate(restored, 'new line', 111_000));
  assert.ok(nextChatRate(restored, 'line 4', 135_000));
});

test('a race uses one book everyone can open; older frames default to Book 1', () => {
  assert.deepEqual(parseSelection({ lessons: { 1: [1] } }), { book: 1, lessons: { 1: [1] }, types: [] });
  assert.deepEqual(parseSelection({ book: 3, lessons: { 0: [1], 2: [1, 2], 17: [1] } }), { book: 3, lessons: { 2: [1, 2] }, types: [] });
  assert.throws(() => parseSelection({ book: 2, lessons: { 1: [1] } }));
  assert.throws(() => parseSelection({ book: 4, lessons: { 1: [1] } }));
});

test('six players fit a room; the seventh is turned away', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) enterRace(room, id, id, 'blue', 0);
  assert.throws(() => enterRace(room, 'g', 'g', 'blue', 0), /full/);
});

test('only the host removes players, between rounds, and a removed player cannot rejoin', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'host', 'Host', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0); enterRace(room, 'c', 'C', 'plum', 0);
  assert.throws(() => applyRaceAction(room, 'b', { type: 'remove', id: 'c', round: 1 }, 1, seed), /Only the host/);
  assert.throws(() => applyRaceAction(room, 'host', { type: 'remove', id: 'host', round: 1 }, 1, seed));
  applyRaceAction(room, 'host', { type: 'remove', id: 'c', round: 1 }, 1, seed);
  assert.deepEqual(room.players.map(player => player.id), ['host', 'b']);
  assert.throws(() => enterRace(room, 'c', 'C', 'plum', 2), /removed you/);
  assert.deepEqual(parseRaceAction({ type: 'remove', id: 'c', round: 1 }), { type: 'remove', id: 'c', round: 1 });
  assert.throws(() => parseRaceAction({ type: 'remove', id: '', round: 1 }));
});
