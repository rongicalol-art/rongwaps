import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceGame, applyGameAction, enterGame, gameSnapshot, newGameRoom, parseGameAction, type GameRoomState } from '../../shared/wordBomb';

const connected = new Set(['a', 'b', 'c']);
function setup() {
  const room = newGameRoom('ABCDEF', 0, [
    { id: '1', hanzi: '老師', pinyin: 'lǎoshī', meaning: 'teacher' },
    { id: '2', hanzi: '學生', pinyin: 'xuéshēng', meaning: 'student' },
    { id: '3', hanzi: '朋友', pinyin: 'péngyǒu', meaning: 'friend' },
  ], 1000);
  for (const id of ['a', 'b', 'c']) { enterGame(room, id, id, 1000); applyGameAction(room, id, { type: 'ready', ready: true }, 1000, connected); }
  applyGameAction(room, 'a', { type: 'start' }, 1000, connected);
  return room;
}
function answer(room: GameRoomState, id: string, now: number, correct = true) {
  const snapshot = gameSnapshot(room, id, now, connected);
  const player = room.players.find(player => player.id === id)!;
  const meaning = room.words[player.queue[0]].meaning;
  const choice = snapshot.question!.options.findIndex(option => correct ? option === meaning : option !== meaning);
  applyGameAction(room, id, { type: 'answer', questionId: snapshot.question!.id, choice }, now, connected);
}

test('race: shared deck, server countdown, pacing and replay protection', () => {
  const room = setup();
  const first = gameSnapshot(room, 'a', 4000, connected);
  const other = gameSnapshot(room, 'b', 4000, connected);
  assert.equal(first.question?.hanzi, other.question?.hanzi);
  assert.deepEqual(first.question?.options, other.question?.options);
  assert.throws(() => answer(room, 'a', 4000), /Wait/);
  answer(room, 'a', 4400);
  assert.equal(room.players[0].cleared, 1);
  assert.throws(() => applyGameAction(room, 'a', { type: 'answer', questionId: first.question!.id, choice: 0 }, 5100, connected), /earlier question/);
  assert.equal(room.players[0].cleared, 1);
});

test('a miss returns after remaining words, costs two seconds, and survives serialized restoration', () => {
  let room = setup();
  const missed = room.players[0].queue[0];
  answer(room, 'a', 4400, false);
  assert.equal(room.players[0].cleared, 0);
  assert.equal(room.players[0].queue.at(-1), missed);
  assert.throws(() => answer(room, 'a', 6399), /Wait/);
  room = JSON.parse(JSON.stringify(room));
  answer(room, 'a', 6400);
  assert.equal(room.players[0].cleared, 1);
});

test('first finisher spectates; active racers cannot inspect opponents; final result waits for everyone', () => {
  const room = setup();
  for (const time of [4400, 5100, 5800]) answer(room, 'a', time);
  assert.equal(room.phase, 'race');
  const winner = gameSnapshot(room, 'a', 5900, connected, 'c');
  assert.equal(winner.place, 1);
  assert.equal(winner.watching, 'c');
  assert.equal(winner.question?.id.split(':')[1], 'c');
  const stillRacing = gameSnapshot(room, 'b', 5900, connected, 'c');
  assert.equal(stillRacing.watching, null);
  assert.equal(stillRacing.question?.id.split(':')[1], 'b');
  for (const time of [6500, 7200, 7900]) answer(room, 'b', time);
  assert.equal(room.phase, 'race');
  assert.equal(gameSnapshot(room, 'a', 8000, connected, 'b').watching, 'c');
  for (const time of [8500, 9200, 9900]) answer(room, 'c', time);
  assert.equal(room.phase, 'results');
  assert.equal(gameSnapshot(room, 'c', 10_000, connected).place, 3);
});

test('host readiness, capacity, membership, expiry and rematch boundaries are enforced', () => {
  const room = setup();
  assert.throws(() => enterGame(room, 'new', 'New', 2000), /already started/);
  assert.throws(() => applyGameAction(room, 'b', { type: 'start' }, 2000, connected), /host/);
  assert.throws(() => applyGameAction(room, 'b', { type: 'rematch' }, 2000, connected), /host/);
  assert.throws(() => applyGameAction(room, 'unknown', { type: 'ready', ready: true }, 2000, connected), /Join/);
  assert.throws(() => enterGame(room, 'a', 'a', room.expiresAt), /expired/);
  advanceGame(room, room.deadline);
  assert.equal(room.phase, 'results');
  assert.ok(room.players.every(player => player.forfeited));
  applyGameAction(room, 'a', { type: 'rematch' }, room.deadline + 1, new Set(['a', 'b']));
  assert.equal(room.phase, 'lobby'); assert.equal(room.players.length, 2);
  assert.ok(room.players.every(player => player.cleared === 0 && !player.ready && !player.forfeited));
  assert.throws(() => applyGameAction(room, 'a', { type: 'start' }, room.deadline + 2, connected), /ready/);
});

test('rejoining preserves progress; explicit leave forfeits and transfers host ownership', () => {
  const room = setup(); answer(room, 'a', 4400);
  enterGame(room, 'a', 'a', 5000);
  assert.equal(room.players.length, 3); assert.equal(room.players[0].cleared, 1);
  applyGameAction(room, 'a', { type: 'leave' }, 5000, connected);
  assert.equal(room.players[0].forfeited, true); assert.equal(room.hostId, 'b');
  assert.throws(() => answer(room, 'a', 6000), /Wait/);
});

test('finish order follows server acceptance even when timestamps tie', () => {
  const room = setup();
  for (const time of [4400, 5100]) { answer(room, 'a', time); answer(room, 'b', time); }
  answer(room, 'b', 5800); answer(room, 'a', 5800);
  assert.equal(gameSnapshot(room, 'b', 5900, connected).place, 1);
  assert.equal(gameSnapshot(room, 'a', 5900, connected).place, 2);
});

test('untrusted actions cannot submit scores, fractional choices or oversized identities', () => {
  for (const data of [null, {}, { type: 'answer', questionId: 'x', choice: 1.5 }, { type: 'answer', questionId: 'x', choice: 3 }, { type: 'finish', score: 20 }, { type: 'watch', playerId: 'x'.repeat(65) }]) {
    assert.throws(() => parseGameAction(data), /Invalid/);
  }
});
