import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRace, applyRaceAction, DISCONNECT_GRACE_MS, enterRace, newRaceRoom, parseRaceAction, parseSelection, summarizeRoom } from '../../shared/quizRace';
import { parseLobbyMessage } from '../../shared/lobby';
import { RACE_TYPES } from '../../shared/quizRace';
import type { QuizTypeId } from '../../src/utils/vocabulary/quizDirector';

const seed = () => 'next';
const planHash = 'a'.repeat(64);
const ready = (room: ReturnType<typeof newRaceRoom>, ids: string[], now: number) => {
  for (const id of ids) applyRaceAction(room, id, { type: 'ready', planHash, round: room.round }, now++, seed);
};

test('race types stay in step with the quiz director', () => {
  const ids: readonly QuizTypeId[] = RACE_TYPES;
  assert.equal(ids.length, 6);
});

test('selection keeps only beta lessons and real parts', () => {
  assert.deepEqual(parseSelection({ lessons: { 0: [1], 8: [3, 3, 2], 9: [1], x: [1], 2: [0, 4] }, types: ['build', 'bad'] }), { lessons: { 0: [1], 8: [2, 3] }, types: ['build'] });
  assert.throws(() => parseSelection({ lessons: { 2: [] } }));
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
  applyRaceAction(room, 'b', parseRaceAction({ type: 'progress', round: 1, answered: 3, total: 3, correct: 7 }), 6, seed);
  assert.equal(room.players[1].place, 1);
  assert.equal(room.players[1].correct, 3);
  applyRaceAction(room, 'a', { type: 'leave' }, 7, seed);
  assert.equal(room.hostId, 'b');
  assert.equal(room.phase, 'race');
  applyRaceAction(room, 'c', { type: 'progress', round: 1, answered: 1, total: 4, correct: 1 }, room.deadline + 1, seed);
  assert.equal(room.phase, 'results');
  assert.equal(summarizeRoom(room).joinable, false);
});

test('lobby frames are validated and trimmed', () => {
  assert.deepEqual(parseLobbyMessage({ t: 'here', l: 101, a: 'nope' }), { t: 'here', l: 101, a: null, show: true });
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
  assert.throws(() => enterRace(room, 'a', 'A', 'blue', 5), /left/);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 1, total: 1, correct: 1 }, 5, seed), /Join/);
  assert.equal(room.hostId, 'b');
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
  applyRaceAction(room, 'a', { type: 'ready', planHash, round: 1 }, 3, seed);
  assert.equal(room.phase, 'preparing', 'one ready player cannot start the clock');
  applyRaceAction(room, 'b', { type: 'ready', planHash, round: 1 }, 4, seed);
  assert.equal(room.startedAt, 4, 'the clock starts when the final player becomes ready');
  applyRaceAction(room, 'b', { type: 'progress', round: 1, answered: 1, total: 1, correct: 1 }, room.deadline + 1, seed);
  assert.equal(room.phase, 'results');
  assert.equal(room.players[1].place, null);
  applyRaceAction(room, 'a', { type: 'rematch', round: 1 }, room.deadline + 2, seed);
  assert.equal(room.round, 2);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'start', round: 1 }, room.deadline + 3, seed), /round/);
  assert.throws(() => parseRaceAction({ type: 'start' }), /connection/);
  assert.throws(() => parseRaceAction({ type: 'ready', round: 1, planHash: 'different' }), /Invalid/);
});

test('progress freezes the deck size and cannot add correct answers without advancing', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  ready(room, ['a', 'b'], 2);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 2, total: 4, correct: 1 }, 2, seed);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 2, total: 4, correct: 2 }, 3, seed);
  assert.equal(room.players[0].correct, 1);
  assert.throws(() => applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 3, total: 5, correct: 3 }, 4, seed), /deck changed/);
  applyRaceAction(room, 'a', { type: 'progress', round: 1, answered: 1, total: 4, correct: 1 }, 5, seed);
  assert.equal(room.players[0].answered, 2);
});

test('preparation timeout removes players who never finish loading, then closes a one-player race', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  applyRaceAction(room, 'a', { type: 'ready', planHash, round: 1 }, 2, seed);
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
  applyRaceAction(room, 'a', { type: 'ready', planHash, round: 1 }, 2, seed);
  applyRaceAction(room, 'a', { type: 'leave' }, 3, seed);
  assert.equal(room.hostId, 'b');
  assert.equal(room.phase, 'results');
  assert.equal(room.prepareError, 'not-ready');
});

test('players with different quiz data return to results instead of racing different cards', () => {
  const room = newRaceRoom('ABCDEF', parseSelection({ lessons: { 1: [1] } }), false, 's', 0);
  enterRace(room, 'a', 'A', 'blue', 0); enterRace(room, 'b', 'B', 'jade', 0);
  applyRaceAction(room, 'a', { type: 'start', round: 1 }, 1, seed);
  applyRaceAction(room, 'a', { type: 'ready', planHash, round: 1 }, 2, seed);
  applyRaceAction(room, 'b', { type: 'ready', planHash: 'b'.repeat(64), round: 1 }, 3, seed);
  assert.equal(room.phase, 'results');
  assert.equal(room.prepareError, 'content-mismatch');
  assert.equal(room.startedAt, null);
});
