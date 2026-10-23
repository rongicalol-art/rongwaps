/** Multiplayer state is independent of personal review/SRS data. */
export interface GameWord { id: string; hanzi: string; pinyin: string; meaning: string }
export interface GameQuestion { id: string; hanzi: string; options: string[] }
export interface GameFeedback { correct: boolean; hanzi: string; pinyin: string; meaning: string; until: number }
export interface GamePlayer {
  id: string; name: string; ready: boolean; queue: number[]; cleared: number;
  availableAt: number; revision: number; finishedAt: number | null; place: number | null; forfeited: boolean;
  feedback: GameFeedback | null;
}
export interface GameRoomState {
  code: string; hostId: string; lesson: number; words: GameWord[]; options: string[][];
  players: GamePlayer[]; phase: 'lobby' | 'race' | 'results';
  startedAt: number | null; deadline: number; expiresAt: number; round: number;
}
export interface GameSnapshot {
  code: string; hostId: string; lesson: number; phase: GameRoomState['phase'];
  startedAt: number | null; deadline: number; serverTime: number; round: number; total: number;
  players: Array<Pick<GamePlayer, 'id' | 'name' | 'ready' | 'cleared' | 'finishedAt' | 'place' | 'forfeited'> & { connected: boolean }>;
  question: GameQuestion | null; feedback: GameFeedback | null;
  watching: string | null; place: number | null; availableAt: number;
}
export type GameAction = { type: 'ready'; ready: boolean } | { type: 'start' | 'rematch' | 'leave' }
  | { type: 'answer'; questionId: string; choice: number } | { type: 'watch'; playerId: string };

export function parseGameAction(value: unknown): GameAction {
  if (!value || typeof value !== 'object') throw new Error('Invalid game action.');
  const data = value as Record<string, unknown>;
  if (data.type === 'ready' && typeof data.ready === 'boolean') return { type: 'ready', ready: data.ready };
  if (data.type === 'start' || data.type === 'rematch' || data.type === 'leave') return { type: data.type };
  if (data.type === 'watch' && typeof data.playerId === 'string' && data.playerId.length <= 64) return { type: 'watch', playerId: data.playerId };
  if (data.type === 'answer' && typeof data.questionId === 'string' && data.questionId.length <= 128
    && Number.isInteger(data.choice) && Number(data.choice) >= 0 && Number(data.choice) < 3) {
    return { type: 'answer', questionId: data.questionId, choice: Number(data.choice) };
  }
  throw new Error('Invalid game action.');
}

export function newGameRoom(code: string, lesson: number, input: GameWord[], now: number): GameRoomState {
  const unique = [...new Map(input.map(word => [word.meaning.toLowerCase(), word])).values()];
  if (unique.length < 3) throw new Error('This lesson needs at least three different meanings.');
  // Crypto shuffle: every player receives the same ordered deck and choices.
  for (let i = unique.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  const words = unique.slice(0, 20);
  const options = words.map((word, i) => {
    const choices = [word.meaning, words[(i + 1) % words.length].meaning, words[(i + 2) % words.length].meaning];
    const offset = crypto.getRandomValues(new Uint32Array(1))[0] % 3;
    return choices.slice(offset).concat(choices.slice(0, offset));
  });
  return { code, hostId: '', lesson, words, options, players: [], phase: 'lobby', startedAt: null,
    deadline: 0, expiresAt: now + 30 * 60_000, round: 1 };
}

export function enterGame(room: GameRoomState, id: string, name: string, now: number): GamePlayer {
  if (now >= room.expiresAt) throw new Error('This room has expired. Create another room.');
  const existing = room.players.find(player => player.id === id);
  if (existing) return existing;
  if (room.phase !== 'lobby') throw new Error('This race has already started.');
  if (room.players.length >= 4) throw new Error('This room is full.');
  const player: GamePlayer = { id, name, ready: false, queue: room.words.map((_, i) => i), cleared: 0,
    availableAt: 0, revision: 0, finishedAt: null, place: null, forfeited: false, feedback: null };
  room.players.push(player);
  room.hostId ||= id;
  return player;
}

function questionFor(room: GameRoomState, player: GamePlayer): GameQuestion | null {
  if (player.finishedAt !== null || player.forfeited || !player.queue.length) return null;
  const index = player.queue[0];
  return { id: `${room.round}:${player.id}:${player.revision}`, hanzi: room.words[index].hanzi, options: room.options[index] };
}

export function gameStandings<T extends Pick<GamePlayer, 'finishedAt' | 'forfeited' | 'cleared' | 'place'>>(players: readonly T[]): T[] {
  return [...players].sort((a, b) => {
    if (a.finishedAt !== null && b.finishedAt !== null) return (a.place ?? Infinity) - (b.place ?? Infinity);
    if (a.finishedAt !== null) return -1;
    if (b.finishedAt !== null) return 1;
    return Number(a.forfeited) - Number(b.forfeited) || b.cleared - a.cleared;
  });
}

export function advanceGame(room: GameRoomState, now: number): void {
  if (room.phase !== 'race') return;
  if (now >= room.deadline) room.players.forEach(player => { if (player.finishedAt === null) player.forfeited = true; });
  if (room.players.every(player => player.finishedAt !== null || player.forfeited)) room.phase = 'results';
}

export function applyGameAction(room: GameRoomState, id: string, action: GameAction, now: number, connected: Set<string>): void {
  advanceGame(room, now);
  const player = room.players.find(candidate => candidate.id === id);
  if (!player) throw new Error('Join this room first.');
  if (action.type === 'leave') {
    if (room.phase === 'lobby') {
      room.players = room.players.filter(candidate => candidate.id !== id);
      if (room.hostId === id) room.hostId = room.players[0]?.id ?? '';
    } else { player.forfeited = player.finishedAt === null; advanceGame(room, now); }
    if (room.hostId === id) room.hostId = room.players.find(candidate => candidate.id !== id && connected.has(candidate.id) && !candidate.forfeited)?.id ?? room.hostId;
    return;
  }
  if (action.type === 'watch') return;
  if (action.type === 'ready') {
    if (room.phase !== 'lobby') throw new Error('The race has already started.');
    player.ready = action.ready;
    return;
  }
  if (action.type === 'rematch') {
    if (id !== room.hostId || room.phase !== 'results') throw new Error('The host can start a rematch after everyone finishes.');
    room.players = room.players.filter(candidate => connected.has(candidate.id));
    room.round++;
    room.phase = 'lobby'; room.startedAt = null; room.deadline = 0;
    for (const candidate of room.players) Object.assign(candidate, { ready: false, queue: room.words.map((_, i) => i), cleared: 0,
      availableAt: 0, revision: 0, finishedAt: null, place: null, forfeited: false, feedback: null });
    room.expiresAt = now + 30 * 60_000;
    return;
  }
  if (action.type === 'start') {
    if (id !== room.hostId || room.phase !== 'lobby') throw new Error('Only the host can start this race.');
    if (room.players.length < 2 || room.players.some(candidate => !candidate.ready || !connected.has(candidate.id))) {
      throw new Error('At least two connected players must be ready.');
    }
    room.phase = 'race'; room.startedAt = now + 3000; room.deadline = room.startedAt + 5 * 60_000;
    room.expiresAt = now + 30 * 60_000;
    for (const candidate of room.players) candidate.availableAt = room.startedAt + 350;
    return;
  }
  if (action.type !== 'answer') throw new Error('Invalid game action.');
  if (room.phase !== 'race' || player.finishedAt !== null || player.forfeited || now < player.availableAt) throw new Error('Wait for the next question.');
  const question = questionFor(room, player);
  if (!question || question.id !== action.questionId) throw new Error('That answer belongs to an earlier question.');
  const index = player.queue.shift()!;
  const word = room.words[index];
  const correct = question.options[action.choice] === word.meaning;
  player.availableAt = now + (correct ? 650 : 2000);
  player.feedback = { correct, hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, until: player.availableAt };
  player.revision++;
  if (correct) player.cleared++; else player.queue.push(index);
  if (!player.queue.length) { player.finishedAt = now; player.place = room.players.filter(candidate => candidate.finishedAt !== null).length; }
  advanceGame(room, now);
}

/** Per-player view: active racers never receive opponents' questions or feedback. */
export function gameSnapshot(room: GameRoomState, id: string, now: number, connected: Set<string>, watched?: string): GameSnapshot {
  const player = room.players.find(candidate => candidate.id === id);
  const spectating = Boolean(player && (player.finishedAt !== null || player.forfeited));
  const remaining = room.players.filter(candidate => candidate.id !== id && candidate.finishedAt === null && !candidate.forfeited);
  const target = spectating ? remaining.find(candidate => candidate.id === watched) ?? remaining[0] : player;
  return { code: room.code, hostId: room.hostId, lesson: room.lesson, phase: room.phase, round: room.round,
    startedAt: room.startedAt, deadline: room.deadline, serverTime: now, total: room.words.length,
    players: room.players.map(({ id: userId, name, ready, cleared, finishedAt, place, forfeited }) =>
      ({ id: userId, name, ready, cleared, finishedAt, place, forfeited, connected: connected.has(userId) })),
    question: room.phase === 'race' && target ? questionFor(room, target) : null,
    feedback: !spectating && player?.feedback && now < player.feedback.until ? player.feedback : null,
    watching: spectating ? target?.id ?? null : null,
    availableAt: player?.availableAt ?? 0,
    place: player?.finishedAt !== null && player?.finishedAt !== undefined ? gameStandings(room.players).findIndex(candidate => candidate.id === id) + 1 : null };
}
