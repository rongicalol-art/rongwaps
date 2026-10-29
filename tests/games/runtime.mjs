// Real SQLite Durable Objects in Miniflare. Identities are synthetic: tokens are signed here with a throwaway key.
import { Miniflare, Response, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { parseArgs } from 'node:util';

// This runner only dispatches into local Miniflare, never a supplied URL or real account.
const { values } = parseArgs({ options: { users: { type: 'string', default: '150' }, 'soak-seconds': { type: 'string', default: '10' } } });
const userCount = Number(values.users);
const soakSeconds = Number(values['soak-seconds']);
assert.ok(Number.isInteger(userCount) && userCount >= 2 && userCount <= 250 && userCount % 2 === 0, '--users must be an even number from 2 to 250');
assert.ok(Number.isInteger(soakSeconds) && soakSeconds >= 10 && soakSeconds <= 300, '--soak-seconds must be from 10 to 300');

const origin = 'https://school.test';
const supabase = 'https://project.test';
const planHash = 'a'.repeat(64);
const { privateKey, publicKey } = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...await webcrypto.subtle.exportKey('jwk', publicKey), kid: 'test', alg: 'ES256', use: 'sig' };
const b64 = value => Buffer.from(value).toString('base64url');
async function token(sub, overrides = {}) {
  const head = b64(JSON.stringify({ alg: 'ES256', kid: 'test', typ: 'JWT' }));
  const body = b64(JSON.stringify({ sub, role: 'authenticated', aud: 'authenticated', iss: `${supabase}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 600, ...overrides }));
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(signature)}`;
}

const bundle = await build({ stdin: { resolveDir: process.cwd(), sourcefile: 'games-test-entry.ts', contents: `
import worker, { GameRoom as BaseRoom, Lobby as BaseLobby } from './games/index';
export class GameRoom extends BaseRoom {
  usage = { alarmWrites: 0, sqlRowsWritten: 0, listingCalls: 0 };
  constructor(ctx, env) {
    super(ctx, env);
    const setAlarm = ctx.storage.setAlarm.bind(ctx.storage);
    ctx.storage.setAlarm = (...args) => { this.usage.alarmWrites++; return setAlarm(...args); };
    const sql = ctx.storage.sql;
    const exec = sql.exec.bind(sql);
    sql.exec = (...args) => {
      const cursor = exec(...args);
      this.usage.sqlRowsWritten += cursor.rowsWritten;
      return cursor;
    };
  }
  async publishListing(room) { this.usage.listingCalls++; return super.publishListing(room); }
  getUsage() { return this.usage; }
  runAlarm() { return this.alarm(); }
}
export class Lobby extends BaseLobby {
  runAlarm() { return this.alarm(); }
  async failListings(enabled) { await this.ctx.storage.put('fixture-listing-outage', enabled); }
  async failMentions(enabled) { await this.ctx.storage.put('fixture-mention-outage', enabled); }
  async partyMention(uid, notice) {
    if (await this.ctx.storage.get('fixture-mention-outage')) throw new Error('Synthetic mention outage');
    return super.partyMention(uid, notice);
  }
  async upsertRoom(summary, host) {
    if (await this.ctx.storage.get('fixture-listing-outage')) throw new Error('Synthetic listing outage');
    return super.upsertRoom(summary, host);
  }
  ageConnections() {
    for (const socket of this.ctx.getWebSockets()) {
      const att = socket.deserializeAttachment(); att.activeAt = Date.now() - 100000; att.authUntil = 0; socket.serializeAttachment(att);
    }
  }
}
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/__test/')) {
    const [, , kind, code, action] = url.pathname.split('/');
    const stub = kind === 'lobby' ? env.LOBBY.getByName('main') : env.ROOMS.getByName(code);
    if (action === 'usage') return Response.json(await stub.getUsage());
    if (action === 'age') await stub.ageConnections();
    else if (action === 'fail') await stub.failListings(true);
    else if (action === 'recover') await stub.failListings(false);
    else if (action === 'mentionfail') await stub.failMentions(true);
    else if (action === 'mentionrecover') await stub.failMentions(false);
    else await stub.runAlarm();
    return Response.json({ok:true});
  }
  return worker.fetch(request, env, ctx);
}};` }, bundle: true, format: 'esm', platform: 'browser', external: ['cloudflare:workers'], write: false });
let jwksFetches = 0;
const mf = new Miniflare(convertV4MiniflareOptions({ unsafeInspectDurableObjects: true, workers: [{
  name: 'games', modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-10-23',
  bindings: { APP_ORIGIN: origin, SUPABASE_URL: supabase },
  durableObjects: { ROOMS: { className: 'GameRoom', useSQLite: true }, LOBBY: { className: 'Lobby', useSQLite: true } },
  outboundService: async request => {
    jwksFetches += 1;
    assert.equal(request.url, `${supabase}/auth/v1/.well-known/jwks.json`);
    return Response.json({ keys: [jwk] });
  },
}] }));

const sockets = [];
let keepAlive;
async function control(path) { const response = await mf.dispatchFetch('https://games.test' + path); assert.equal(response.status, 200, await response.text()); }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition) { const end = Date.now() + 10_000; while (!condition()) { assert.ok(Date.now() < end, 'Timed out'); await delay(20); } }
async function post(path, user, extra = {}) {
  const response = await mf.dispatchFetch('https://games.test' + path, { method: 'POST', headers: { Origin: origin, Authorization: 'Bearer ' + await token(user), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: user, color: 'jade', ...extra }) });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function open(path, protocol, ticket) {
  const response = await mf.dispatchFetch('https://games.test' + path, { headers: { Origin: origin, Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `${protocol}, ticket.${ticket}` } });
  assert.equal(response.status, 101);
  const socket = response.webSocket;
  const client = { socket, frames: [], state: null, errors: [], closed: null, lastChatAt: 0 };
  socket.addEventListener('close', event => { client.closed = event.code; });
  socket.addEventListener('message', event => {
    if (event.data === 'pong') return;
    const message = JSON.parse(event.data);
    client.frames.push(message);
    if (message.t === 'msg') client.lastChatAt = performance.now();
    if (message.type === 'state') client.state = message.state;
    if (message.type === 'error') client.errors.push(message.error);
  });
  socket.accept(); sockets.push(socket);
  return client;
}
const last = (client, t) => [...client.frames].reverse().find(frame => frame.t === t);
const send = (client, value) => client.socket.send(JSON.stringify(value.type ? { round: client.state?.round ?? 1, ...value } : value));

try {
  // Auth: forged, expired and foreign tokens are refused before any Durable Object work.
  const forgedParts = (await token('mallory')).split('.');
  forgedParts[2] = (forgedParts[2][0] === 'A' ? 'B' : 'A') + forgedParts[2].slice(1);
  const forged = forgedParts.join('.');
  for (const bad of [forged, await token('eve', { exp: 1 }), await token('eve', { iss: 'https://other.test/auth/v1' }), await token('eve', { role: 'anon' }), await token('eve', { is_anonymous: true }), await token('eve', { nbf: Date.now()/1000+60 })]) {
    const response = await mf.dispatchFetch('https://games.test/lobby', { method: 'POST', headers: { Origin: origin, Authorization: 'Bearer ' + bad }, body: '{"name":"x"}' });
    assert.equal(response.status, 401);
  }

  // Lobby: presence counts, lesson people, chat history and live messages.
  const alice = await open('/lobby/socket', 'lobby', (await post('/lobby', 'alice')).ticket);
  let bob = await open('/lobby/socket', 'lobby', (await post('/lobby', 'bob')).ticket);
  await until(() => last(alice, 'me') && last(bob, 'me'));
  send(alice, { t: 'here', l: 101, a: 'cards', show: true });
  send(bob, { t: 'here', l: 101, a: 'lesson', show: true });
  await until(() => last(bob, 'counts')?.v['101']?.n === 2 && last(bob, 'people')?.v.length === 2);
  send(alice, { t: 'sub', online: true, chat: 101 }); send(bob, { t: 'sub', online: false, chat: 101 });
  await until(() => last(alice, 'online')?.v.length === 2 && last(bob, 'history'));
  send(alice, { t: 'say', l: 101, text: '  加油！  ' });
  await until(() => last(bob, 'msg')?.m.t === '加油！');
  send(alice, { t: 'say', l: 101, text: 'too fast' });
  await delay(150);
  assert.equal(bob.frames.filter(frame => frame.t === 'msg').length, 1, 'chat is rate limited');
  send(bob, { t: 'cheer', to: ['alice'], p: 1 });
  await until(() => last(alice, 'cheer')?.p === 1);
  send(bob, { t: 'here', l: 101, a: 'lesson', show: false });
  await until(() => last(alice, 'counts')?.v['101']?.n === 1);

  // Hidden users cannot be pinged by forged IDs until they participate in this channel.
  await delay(1100);
  send(alice, { t: 'say', l: 101, text: '@bob forged', mentions: ['bob', 'alice', 'nobody'] });
  await until(() => last(alice, 'msg')?.m.t === '@bob forged');
  assert.ok(!last(bob, 'mention'));
  send(bob, { t: 'say', l: 101, text: 'Here' });
  await until(() => last(alice, 'msg')?.m.t === 'Here');
  await delay(1100);
  send(alice, { t: 'say', l: 101, text: '@bob hello', mentions: ['bob', 'bob', 'alice', 'nobody'] });
  await until(() => last(bob, 'mention')?.v.message.t === '@bob hello');
  const notice = last(bob, 'mention').v;
  assert.equal(bob.frames.filter(frame => frame.t === 'mention' && frame.v.key === notice.key).length, 1);
  send(bob, { t: 'mention-read', key: notice.key });
  await delay(100);
  const mentionSql = await mf.unsafeGetDurableObjectStorage('games', 'Lobby', { name: 'main' });
  assert.equal((await mentionSql.exec('SELECT read FROM mentions WHERE uid=? AND key=?', 'bob', notice.key))[0].read, 1);
  assert.equal((await mentionSql.exec('SELECT count(*) AS n FROM mentions WHERE uid=?', 'alice'))[0].n, 0);
  await mentionSql.exec('DELETE FROM chat WHERE id=?', notice.message.id);
  bob = await open('/lobby/socket', 'lobby', (await post('/lobby', 'bob')).ticket);
  await until(() => last(bob, 'mentions'));
  assert.ok(last(bob, 'mentions').v.some(item => item.key === notice.key && item.read && item.message.t === '@bob hello'));
  assert.ok(!last(bob, 'mention'), 'replay does not produce another live alert');
  send(bob, { t: 'here', l: 101, a: 'lesson', show: false });
  send(bob, { t: 'sub', online: false, chat: 101 });

  // Global chat is isolated from lesson subscribers and returns bounded history on opening.
  send(bob, { t: 'sub', online: false, chat: 0 });
  await until(() => last(bob, 'history')?.l === 0);
  const aliceMessages = alice.frames.filter(frame => frame.t === 'msg').length;
  send(bob, { t: 'say', l: 0, text: 'Global hello' });
  await until(() => last(bob, 'msg')?.m.t === 'Global hello');
  assert.equal(alice.frames.filter(frame => frame.t === 'msg').length, aliceMessages, 'global chat only fans out to its subscribers');
  send(alice, { t: 'sub', online: true, chat: 0 });
  await until(() => last(alice, 'history')?.l === 0);
  assert.ok(last(alice, 'history').v.some(line => line.t === 'Global hello'));
  send(alice, { t: 'sub', online: true, chat: 101 });
  send(bob, { t: 'sub', online: false, chat: 101 });

  // Frame size is measured in bytes, including multi-byte text.
  const oversized = await open('/lobby/socket', 'lobby', (await post('/lobby', 'oversized')).ticket);
  oversized.socket.send(JSON.stringify({ t: 'say', l: 0, text: '字'.repeat(1400) }));
  await until(() => oversized.closed === 1008);

  // Race room: open room is listed and announced, invite reaches Bob, full race to results, rematch.
  const created = await post('/rooms', 'alice', { selection: { lessons: { 1: [1, 2], 99: [1] }, types: ['meaning', 'nope'] }, open: true });
  const host = await open(`/rooms/${created.code}/socket`, 'quiz-race', created.ticket);
  await until(() => host.state);
  assert.deepEqual(host.state.selection, { book: 1, lessons: { 1: [1, 2] }, types: ['meaning'] });
  await until(() => last(bob, 'rooms')?.v.some(room => room.code === created.code));
  send(bob, { t: 'sub', online: false, chat: 101 });
  await until(() => [...bob.frames].some(frame => frame.t === 'msg' && frame.m.r?.code === created.code));
  send(alice, { t: 'invite', to: ['bob'], code: created.code });
  await until(() => last(bob, 'invite')?.room.code === created.code);
  const guest = await open(`/rooms/${created.code}/socket`, 'quiz-race', (await post(`/rooms/${created.code}`, 'bob')).ticket);
  await until(() => host.state.players.length === 2 && guest.state);
  // Party chat stays in the authenticated room, keeps its rate state across hibernation, and caps history.
  await until(() => host.frames.some(frame => frame.type === 'chat-history'));
  const lobbyFrames = alice.frames.length;
  await control('/__test/lobby/main/mentionfail');
  send(host, { type: 'chat', text: '@bob Private party hello', mentions: ['bob', 'bob', 'alice', 'nobody'] });
  await until(() => guest.frames.some(frame => frame.type === 'chat-message' && frame.message.t === '@bob Private party hello'));
  const partyOutbox = await mf.unsafeGetDurableObjectStorage('games', 'GameRoom', { name: created.code });
  assert.equal((await partyOutbox.exec('SELECT count(*) AS n FROM mention_outbox'))[0].n, 1);
  await control('/__test/lobby/main/mentionrecover');
  await control(`/__test/room/${created.code}/alarm`);
  await until(() => last(bob, 'mention')?.v.room === created.code);
  assert.equal(last(bob, 'mention').v.message.t, '@bob Private party hello');
  const partyNotice = last(bob, 'mention').v;
  send(bob, { t: 'mention-open', key: partyNotice.key });
  await until(() => last(bob, 'mention-open')?.key === partyNotice.key);
  assert.equal(last(bob, 'mention-open').v.message.t, '@bob Private party hello');
  assert.ok(!alice.frames.slice(lobbyFrames).some(frame => frame.type === 'chat-message'));
  await mf.unsafeEvictDurableObject('games', 'GameRoom', { name: created.code, webSockets: 'hibernate' });
  send(host, { type: 'chat', text: 'Private party hello' });
  await until(() => host.errors.length === 1);
  assert.match(host.errors.pop(), /wait/);
  const partySql = await mf.unsafeGetDurableObjectStorage('games', 'GameRoom', { name: created.code });
  const storedLine = (await partySql.exec('SELECT data FROM room_chat LIMIT 1'))[0].data;
  await partySql.exec('WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<60) INSERT INTO room_chat(data,ts) SELECT ?,? FROM n', storedLine, Date.now());
  send(guest, { type: 'chat', text: 'Ready to play' });
  await until(() => host.frames.some(frame => frame.type === 'chat-message' && frame.message.t === 'Ready to play'));
  assert.equal((await partySql.exec('SELECT COUNT(*) AS n FROM room_chat'))[0].n, 50);
  send(guest, { type: 'start' });
  await until(() => guest.errors.length === 1);
  send(host, { type: 'start' });
  await until(() => host.state.phase === 'preparing' && guest.state.phase === 'preparing');
  assert.equal(host.state.deadline, 0, 'starting preparation does not start the race clock');
  send(host, { type: 'ready', planHash, reviewFlow: 1 });
  await until(() => host.state.players.find(p => p.id === 'alice').preparedAt !== null);
  assert.equal(host.state.phase, 'preparing', 'one ready player cannot start the race');
  await mf.unsafeEvictDurableObject('games', 'GameRoom', { name: created.code, webSockets: 'hibernate' });
  send(guest, { type: 'ready', planHash, reviewFlow: 1 });
  await until(() => guest.state.phase === 'race');
  assert.ok(host.state.startedAt, 'the race clock starts after both players are ready');
  await mf.unsafeEvictDurableObject('games', 'GameRoom', { name: created.code, webSockets: 'hibernate' });
  await delay(60);
  const hibernatedUsage = await (await mf.dispatchFetch(`https://games.test/__test/room/${created.code}/usage`)).json();
  send(host, { type: 'progress', answered: 5, total: 5, correct: 4, reviewComplete: false });
  await until(() => guest.state.players.find(p => p.id === 'alice').answered === 5);
  const progressUsage = await (await mf.dispatchFetch(`https://games.test/__test/room/${created.code}/usage`)).json();
  assert.equal(progressUsage.alarmWrites, hibernatedUsage.alarmWrites, 'progress preserves an earlier alarm even after hibernation');
  assert.equal(guest.state.players.find(p => p.id === 'alice').finishedAt, null, 'first-pass completion waits for review');
  send(host, { type: 'progress', answered: 5, total: 5, correct: 4, reviewComplete: true });
  await until(() => guest.state.players.find(p => p.id === 'alice').place === 1);
  await delay(60);
  send(guest, { type: 'progress', answered: 9, total: 4, correct: 9, reviewComplete: true });
  await until(() => host.state.phase === 'results');
  const bobPlayer = host.state.players.find(p => p.id === 'bob');
  assert.deepEqual([bobPlayer.answered, bobPlayer.correct, bobPlayer.place], [4, 4, 2]);
  const seed = host.state.seed;
  await delay(60);
  send(host, { type: 'rematch' });
  await until(() => guest.state.phase === 'lobby');
  assert.notEqual(guest.state.seed, seed);
  assert.ok(guest.state.players.every(p => p.answered === 0 && p.place === null));

  // Ticket replay and foreign origins are refused.
  const replay = await mf.dispatchFetch(`https://games.test/rooms/${created.code}/socket`, { headers: { Origin: origin, Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `quiz-race, ticket.${created.ticket}` } });
  assert.equal(replay.status, 401);
  const denied = await mf.dispatchFetch('https://games.test/rooms', { method: 'POST', headers: { Origin: 'https://evil.test' } });
  assert.equal(denied.status, 403);
  assert.deepEqual(host.errors, []);

  // HTTP retries and invite UI must reuse the existing waiting room, not burn another creation.
  const duplicate = await post('/rooms', 'alice', { selection: { lessons: { 2: [1] }, types: [] }, open: false });
  assert.equal(duplicate.code, created.code);

  // A nonmember cannot manufacture an invitation to a private/open room they merely know about.
  const mallory = await open('/lobby/socket', 'lobby', (await post('/lobby', 'mallory')).ticket);
  await until(() => last(mallory, 'me'));
  const invitesBefore = bob.frames.filter(f => f.t === 'invite').length;
  send(mallory, { t: 'invite', to: ['bob'], code: created.code });
  await delay(150);
  assert.equal(bob.frames.filter(f => f.t === 'invite').length, invitesBefore);

  // Hibernated disconnect preserves host and progress, then a new socket resumes the same player.
  const listingStore = await mf.unsafeGetDurableObjectStorage('games', 'Lobby', { name: 'main' });
  const listingBeforeReconnect = (await listingStore.exec('SELECT data FROM rooms WHERE code=?', created.code))[0].data;
  host.socket.close(1011, 'network lost');
  await until(() => !guest.state.connected.includes('alice'));
  assert.equal(guest.state.hostId, 'alice');
  const resumed = await open(`/rooms/${created.code}/socket`, 'quiz-race', (await post(`/rooms/${created.code}`, 'alice')).ticket);
  await until(() => resumed.state && guest.state.connected.includes('alice'));
  assert.equal(resumed.state.round, guest.state.round);
  await delay(60);
  assert.equal((await listingStore.exec('SELECT data FROM rooms WHERE code=?', created.code))[0].data, listingBeforeReconnect, 'temporary disconnect and unchanged rejoin do not republish the listing');

  // Nonmember Leave requests cannot mutate another room or bypass the account request limit.
  const roomBeforeSpam = (await partySql.exec('SELECT data FROM state WHERE id=1'))[0].data;
  const spamToken = await token('leave-nonmember');
  const spamStatuses = await Promise.all(Array.from({ length: 40 }, async () => {
    const response = await mf.dispatchFetch(`https://games.test/rooms/${created.code}/leave`, {
      method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${spamToken}` },
    });
    return response.status;
  }));
  assert.ok(spamStatuses.includes(200), 'nonmember Leave remains an idempotent success within the limit');
  assert.ok(spamStatuses.includes(429), 'Leave shares the account request limit');
  assert.ok(spamStatuses.every(status => status === 200 || status === 429));
  assert.equal((await partySql.exec('SELECT data FROM state WHERE id=1'))[0].data, roomBeforeSpam, 'nonmembers cannot change room state or its revision');

  // HTTP leave is authoritative even when its WebSocket frame cannot be delivered.
  resumed.socket.close(1011, 'offline');
  await post(`/rooms/${created.code}/leave`, 'alice');
  await until(() => guest.state.hostId === 'bob' && guest.state.players.length === 1);
  const roomAfterLeave = (await partySql.exec('SELECT data FROM state WHERE id=1'))[0].data;
  await post(`/rooms/${created.code}/leave`, 'alice');
  assert.equal((await partySql.exec('SELECT data FROM state WHERE id=1'))[0].data, roomAfterLeave, 'repeated Leave does not republish an unchanged room');
  await post(`/rooms/${created.code}/leave`, 'bob');
  await delay(1200);
  const emptyRoom = await mf.unsafeGetDurableObjectStorage('games', 'GameRoom', { name: created.code });
  assert.equal((await emptyRoom.exec('SELECT * FROM state')).length, 0, 'empty rooms release stored data');
  bob = await open('/lobby/socket', 'lobby', (await post('/lobby', 'bob')).ticket);
  await until(() => last(bob, 'mentions'));
  assert.equal(last(bob, 'mentions').v.find(item => item.room === created.code)?.message.t, '', 'closed rooms redact private previews on replay');
  send(bob, { t: 'mention-open', key: partyNotice.key });
  await until(() => last(bob, 'mention-open')?.key === partyNotice.key);
  assert.equal(last(bob, 'mention-open').v, null, 'closed rooms cannot reopen a private snapshot');
  send(bob, { t: 'sub', online: false, chat: 101 });
  await until(() => last(bob, 'history')?.l === 101);

  // A room whose creator never upgraded the socket must expire its reserved seat after the grace period.
  const abandoned = await post('/rooms', 'abandoned', { selection: { lessons: { 1: [1] }, types: [] }, open: true });
  const abandonedSql = await mf.unsafeGetDurableObjectStorage('games', 'GameRoom', { name: abandoned.code });
  const abandonedState = JSON.parse((await abandonedSql.exec('SELECT data FROM state WHERE id=1'))[0].data);
  abandonedState.players[0].disconnectedAt = Date.now() - 61000;
  await abandonedSql.exec('UPDATE state SET data=? WHERE id=1', JSON.stringify(abandonedState));
  await control(`/__test/room/${abandoned.code}/alarm`);
  assert.equal((await abandonedSql.exec('SELECT * FROM state')).length, 0);

  // Host loss after the grace deadline survives eviction and transfers ownership exactly once.
  const transfer = await post('/rooms', 'old-host', { selection: { lessons: { 1: [1] }, types: [] }, open: true });
  const oldHost = await open(`/rooms/${transfer.code}/socket`, 'quiz-race', transfer.ticket);
  const newHost = await open(`/rooms/${transfer.code}/socket`, 'quiz-race', (await post(`/rooms/${transfer.code}`, 'new-host')).ticket);
  await until(() => oldHost.state?.players.length === 2 && newHost.state);
  oldHost.socket.close(1011, 'offline');
  await until(() => !newHost.state.connected.includes('old-host'));
  const transferSql = await mf.unsafeGetDurableObjectStorage('games', 'GameRoom', { name: transfer.code });
  const transferState = JSON.parse((await transferSql.exec('SELECT data FROM state WHERE id=1'))[0].data);
  transferState.players.find(p => p.id === 'old-host').disconnectedAt = Date.now() - 61000;
  await transferSql.exec('UPDATE state SET data=? WHERE id=1', JSON.stringify(transferState));
  await mf.unsafeEvictDurableObject('games', 'GameRoom', { name: transfer.code, webSockets: 'hibernate' });
  await control(`/__test/room/${transfer.code}/alarm`);
  await until(() => newHost.state.hostId === 'new-host');
  assert.equal(newHost.state.players.length, 1);

  // Joining a different room evicts this account's former seat, including a host seat.
  const other = await post('/rooms', 'other-host', { selection: { lessons: { 1: [1] }, types: [] }, open: false });
  const otherHost = await open(`/rooms/${other.code}/socket`, 'quiz-race', other.ticket);
  const switched = await open(`/rooms/${other.code}/socket`, 'quiz-race', (await post(`/rooms/${other.code}`, 'new-host')).ticket);
  await delay(200);
  await until(() => switched.state?.players.length === 2 && !newHost.state.players.some(p=>p.id==='new-host'));
  assert.equal(otherHost.state.players.length, 2);

  // Never-public rooms still support invitations and settings without any Lobby publication.
  const privateLobby = await open('/lobby/socket', 'lobby', (await post('/lobby', 'other-host')).ticket);
  send(privateLobby, { t: 'invite', to: ['bob'], code: other.code });
  await until(() => last(bob, 'invite')?.room.code === other.code);
  assert.equal(last(bob, 'invite').room.open, false);
  privateLobby.socket.close(1000, 'Done');
  send(otherHost, {type:'settings', selection:{lessons:{1:[1]},types:['meaning']}, open:false});
  await until(() => switched.state.selection.types[0] === 'meaning');
  assert.equal((await listingStore.exec('SELECT * FROM rooms WHERE code=?', other.code)).length, 0);

  // A race deadline ends the room even when nobody sends another action.
  send(otherHost, {type:'start'});
  await until(()=>otherHost.state.phase==='preparing' && switched.state.phase==='preparing');
  send(otherHost,{type:'ready',planHash,reviewFlow:1}); send(switched,{type:'ready',planHash,reviewFlow:1});
  await until(()=>switched.state.phase==='race');
  const deadlineSql=await mf.unsafeGetDurableObjectStorage('games','GameRoom',{name:other.code});
  const deadlineState=JSON.parse((await deadlineSql.exec('SELECT data FROM state WHERE id=1'))[0].data);
  deadlineState.deadline=Date.now()-1;
  await deadlineSql.exec('UPDATE state SET data=? WHERE id=1',JSON.stringify(deadlineState));
  await control(`/__test/room/${other.code}/alarm`);
  await until(()=>otherHost.state.phase==='review' && switched.state.phase==='review');
  assert.ok(otherHost.state.players.every(p=>p.place===null),'the review window does not invent finishers');
  const reviewState=JSON.parse((await deadlineSql.exec('SELECT data FROM state WHERE id=1'))[0].data);
  reviewState.reviewDeadline=Date.now()-1;
  await deadlineSql.exec('UPDATE state SET data=? WHERE id=1',JSON.stringify(reviewState));
  await control(`/__test/room/${other.code}/alarm`);
  await until(()=>otherHost.state.phase==='results' && switched.state.phase==='results');
  assert.ok(otherHost.state.players.every(p=>p.place===null),'timeouts do not invent finishers');
  const privateUsage = await (await mf.dispatchFetch(`https://games.test/__test/room/${other.code}/usage`)).json();
  assert.equal(privateUsage.listingCalls, 0, 'private creation, joins, settings and racing never call the Lobby');
  assert.equal((await listingStore.exec('SELECT * FROM rooms WHERE code=?', other.code)).length, 0);

  // Once made public, turning private must remove the listing, including after failure and hibernation.
  send(otherHost, {type:'rematch'});
  await until(() => switched.state.phase === 'lobby');
  send(otherHost, {type:'settings', selection:{lessons:{1:[1]},types:['meaning']}, open:true});
  await until(() => switched.state.open);
  await delay(60);
  assert.equal(JSON.parse((await listingStore.exec('SELECT data FROM rooms WHERE code=?', other.code))[0].data).open, true);
  await control('/__test/lobby/main/fail');
  send(otherHost, {type:'settings', selection:{lessons:{1:[1]},types:['meaning']}, open:false});
  await until(() => !switched.state.open);
  assert.ok((await deadlineSql.exec('SELECT * FROM state WHERE id=5')).length, 'failed public-to-private update remains pending');
  await mf.unsafeEvictDurableObject('games', 'GameRoom', {name:other.code, webSockets:'hibernate'});
  await control('/__test/lobby/main/recover');
  await control(`/__test/room/${other.code}/alarm`);
  assert.equal(JSON.parse((await listingStore.exec('SELECT data FROM rooms WHERE code=?', other.code))[0].data).open, false);
  assert.equal((await deadlineSql.exec('SELECT * FROM state WHERE id=5')).length, 0);

  // Chat keeps 50 messages PER LESSON despite global IDs advancing in another busy lesson.
  const lobbySql = await mf.unsafeGetDurableObjectStorage('games', 'Lobby', { name: 'main' });
  await lobbySql.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<50) INSERT INTO chat(lesson,uid,name,color,text,ts) SELECT 101,'seed','Seed','blue','hello',? FROM n", Date.now());
  await lobbySql.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<100) INSERT INTO chat(lesson,uid,name,color,text,ts) SELECT 102,'seed','Seed','blue','other',? FROM n", Date.now());
  send(bob, { t: 'say', l: 101, text: 'retain this lesson' });
  await until(() => last(alice, 'msg')?.m.t === 'retain this lesson');
  assert.equal((await lobbySql.exec('SELECT COUNT(*) AS n FROM chat WHERE lesson=101'))[0].n, 50);
  const reportedId = last(alice, 'msg').m.id;
  send(alice, { t: 'report', id: reportedId }); send(alice, { t: 'report', id: reportedId });
  await delay(100);
  assert.equal((await lobbySql.exec('SELECT COUNT(*) AS n FROM reports WHERE msg=?', reportedId))[0].n, 1);

  // Hibernating auto-ping works for room sockets too (no JSON parser errors or state writes).
  await until(() => otherHost.state);
  const revision = otherHost.state.revision;
  otherHost.socket.send('ping'); await delay(100);
  assert.equal(otherHost.state.revision, revision);

  // Presence loss, expired auth leases, and data retention are cleaned without client cooperation.
  await control('/__test/lobby/main/age');
  await control('/__test/lobby/main/alarm');
  await until(() => alice.closed !== null && bob.closed !== null && mallory.closed !== null);
  await lobbySql.exec('UPDATE chat SET ts=0');
  await lobbySql.exec('UPDATE reports SET ts=0');
  await control('/__test/lobby/main/alarm');
  assert.equal((await lobbySql.exec('SELECT COUNT(*) AS n FROM chat'))[0].n, 0);
  assert.equal((await lobbySql.exec('SELECT COUNT(*) AS n FROM reports'))[0].n, 0);

  // Failed listing removal survives eviction; cleanup waits for the lobby to acknowledge closure.
  const listingRoom = await post('/rooms', 'listing-retry', { selection: { lessons: {1:[1]}, types:[] }, open:true });
  const listingSql = await mf.unsafeGetDurableObjectStorage('games','GameRoom',{name:listingRoom.code});
  await control(`/__test/room/${listingRoom.code}/alarm`);
  assert.equal(JSON.parse((await lobbySql.exec('SELECT data FROM rooms WHERE code=?',listingRoom.code))[0].data).joinable,true);
  await control('/__test/lobby/main/fail');
  await post(`/rooms/${listingRoom.code}/leave`,'listing-retry');
  await control(`/__test/room/${listingRoom.code}/alarm`);
  assert.ok((await listingSql.exec('SELECT * FROM state WHERE id=5')).length,'failed publication remains durable');
  await mf.unsafeEvictDurableObject('games','GameRoom',{name:listingRoom.code});
  await control('/__test/lobby/main/recover');
  await control(`/__test/room/${listingRoom.code}/alarm`);
  assert.equal(JSON.parse((await lobbySql.exec('SELECT data FROM rooms WHERE code=?',listingRoom.code))[0].data).joinable,false);
  assert.equal((await listingSql.exec('SELECT * FROM state')).length,0,'room rows are reclaimed after publication succeeds');
  const expiredListing = await post('/rooms','listing-expired',{selection:{lessons:{1:[1]},types:[]},open:true});
  const expiredListingSql = await mf.unsafeGetDurableObjectStorage('games','GameRoom',{name:expiredListing.code});
  const expiredListingState = JSON.parse((await expiredListingSql.exec('SELECT data FROM state WHERE id=1'))[0].data);
  expiredListingState.expiresAt=Date.now()-36*60_000;
  await expiredListingSql.exec('UPDATE state SET data=? WHERE id=1',JSON.stringify(expiredListingState));
  await control('/__test/lobby/main/fail');
  await control(`/__test/room/${expiredListing.code}/alarm`);
  assert.equal((await expiredListingSql.exec('SELECT * FROM state')).length,0,'prolonged outages cannot retain expired rooms/retry alarms forever');
  await control('/__test/lobby/main/recover');

  // The preparation alarm withdraws a player whose first card/audio never became ready.
  const slow = await post('/rooms','slow-host',{selection:{lessons:{1:[1]},types:[]},open:false});
  const slowHost = await open(`/rooms/${slow.code}/socket`,'quiz-race',slow.ticket);
  const slowGuest = await open(`/rooms/${slow.code}/socket`,'quiz-race',(await post(`/rooms/${slow.code}`,'slow-guest')).ticket);
  await until(()=>slowHost.state?.players.length===2 && slowGuest.state);
  send(slowHost,{type:'start'});
  await until(()=>slowHost.state.phase==='preparing' && slowGuest.state.phase==='preparing');
  send(slowHost,{type:'ready',planHash,reviewFlow:1});
  await until(()=>slowHost.state.players.find(p=>p.id==='slow-host').preparedAt!==null);
  const slowSql=await mf.unsafeGetDurableObjectStorage('games','GameRoom',{name:slow.code});
  const slowState=JSON.parse((await slowSql.exec('SELECT data FROM state WHERE id=1'))[0].data);
  slowState.prepareDeadline=Date.now()-1;
  await slowSql.exec('UPDATE state SET data=? WHERE id=1',JSON.stringify(slowState));
  await control(`/__test/room/${slow.code}/alarm`);
  await until(()=>slowHost.state.phase==='results' && slowGuest.state.players.find(p=>p.id==='slow-guest').left);
  assert.equal(slowHost.state.startedAt,null,'an unready opponent cannot consume race time');

  const mismatch = await post('/rooms','mismatch-host',{selection:{lessons:{1:[1]},types:[]},open:false});
  const mismatchHost = await open(`/rooms/${mismatch.code}/socket`,'quiz-race',mismatch.ticket);
  const mismatchGuest = await open(`/rooms/${mismatch.code}/socket`,'quiz-race',(await post(`/rooms/${mismatch.code}`,'mismatch-guest')).ticket);
  await until(()=>mismatchHost.state?.players.length===2 && mismatchGuest.state);
  send(mismatchHost,{type:'start'});
  await until(()=>mismatchHost.state.phase==='preparing' && mismatchGuest.state.phase==='preparing');
  send(mismatchHost,{type:'ready',planHash,reviewFlow:1});
  await until(()=>mismatchHost.state.players.find(p=>p.id==='mismatch-host').preparedAt!==null);
  send(mismatchGuest,{type:'ready',planHash:'b'.repeat(64),reviewFlow:1});
  await until(()=>mismatchHost.state.phase==='results' && mismatchHost.state.prepareError==='content-mismatch');
  assert.equal(mismatchHost.state.startedAt,null,'different lesson data cannot enter a race');

  // Creation quota survives room cleanup; a retry reuses the existing room instead of spending another slot.
  for(let attempt=0;attempt<5;attempt++) {
    const limited=await post('/rooms','quota-user',{selection:{lessons:{1:[1]},types:[]},open:false});
    const retry=await post('/rooms','quota-user',{selection:{lessons:{1:[1]},types:[]},open:false});
    assert.equal(retry.code,limited.code);
    await post(`/rooms/${limited.code}/leave`,'quota-user');
  }
  const quota=await mf.dispatchFetch('https://games.test/rooms',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+await token('quota-user'),'Content-Type':'application/json'},body:JSON.stringify({name:'Quota',selection:{lessons:{1:[1]},types:[]}})});
  assert.equal(quota.status,429);

  // The prior game used the same binding: incompatible persisted rooms expire safely after upgrade.
  await control('/__test/room/ZZZZZZ/alarm');
  const legacySql = await mf.unsafeGetDurableObjectStorage('games','GameRoom',{name:'ZZZZZZ'});
  await legacySql.exec('INSERT INTO state VALUES (1,?)',JSON.stringify({code:'ZZZZZZ',players:[],phase:'playing',expiresAt:Date.now()+60000}));
  const legacyJoin = await mf.dispatchFetch('https://games.test/rooms/ZZZZZZ',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+await token('legacy-guest'),'Content-Type':'application/json'},body:JSON.stringify({name:'Guest'})});
  assert.equal(legacyJoin.status,400);
  await control('/__test/room/ZZZZZZ/alarm');
  assert.equal((await legacySql.exec('SELECT * FROM state')).length,0);

  // Ramp to the configured school crowd; all receive chat and race in independent rooms.
  const started = performance.now();
  const students = [];
  for (let offset = 0; offset < userCount; offset += 50) {
    const at = performance.now();
    students.push(...await Promise.all(Array.from({ length: Math.min(50, userCount - offset) }, async (_, i) => {
      const index = offset + i;
      const id = `load-${index}`;
      const client = await open('/lobby/socket', 'lobby', (await post('/lobby', id)).ticket);
      send(client, { t: 'here', l: 101, a: 'lesson', show: true, i: `https://lh3.googleusercontent.com/${id}` });
      send(client, { t: 'sub', online: true, chat: 101 });
      return { id, client };
    })));
    await until(() => students.every(({client}) => last(client, 'counts')?.n === students.length && last(client, 'online')?.v.length === students.length && last(client, 'people')?.v.length === students.length));
    console.log(JSON.stringify({ stage: 'ramp', users: students.length, convergenceMs: Math.round(performance.now() - at) }));
  }
  assert.ok(students.every(({id, client}) => last(client, 'online').v.some(person => person.u === id && person.i === `https://lh3.googleusercontent.com/${id}`)), 'profile photos stay present in crowd snapshots');
  const lobbyMs = Math.round(performance.now() - started);
  const stableCount = students[0].client.frames.filter(f => f.t === 'counts').length;
  await control('/__test/lobby/main/alarm');
  await delay(100);
  assert.equal(students[0].client.frames.filter(f => f.t === 'counts').length, stableCount, 'unchanged presence is not broadcast again');
  const previousChatRows = (await lobbySql.exec('SELECT COUNT(*) AS n FROM chat WHERE lesson=101'))[0].n;
  const burstAt = performance.now();
  for (const {id, client} of students) send(client, { t: 'say', l: 101, text: id });
  await until(() => students.every(({client}) => client.frames.filter(f => f.t === 'msg' && f.m.t.startsWith('load-')).length === userCount));
  const chatMs = Math.round(performance.now() - burstAt);
  const chatLatencies = students.map(({client}) => client.lastChatAt - burstAt).sort((a,b) => a-b);
  const chatP95Ms = Math.round(chatLatencies[Math.ceil(userCount * 0.95) - 1]);
  console.log(JSON.stringify({ stage: 'chat', users: userCount, deliveries: userCount ** 2, fanoutMs: chatMs, batchDeliveryP95Ms: chatP95Ms }));
  assert.ok(students.every(({id, client}) => client.frames.some(frame => frame.t === 'msg' && frame.m.u === id && frame.m.i === `https://lh3.googleusercontent.com/${id}`)), 'chat messages include the sender profile photo');
  const priorHistoryFrames = students[0].client.frames.filter(frame => frame.t === 'history').length;
  send(students[0].client, { t: 'sub', online: true, chat: null });
  send(students[0].client, { t: 'sub', online: true, chat: 101 });
  await until(() => students[0].client.frames.filter(frame => frame.t === 'history').length > priorHistoryFrames);
  const chatHistory = last(students[0].client, 'history').v;
  assert.ok(chatHistory.some(message => message.i && message.u.startsWith('load-')), `chat history decorates online senders with their profile photos: ${JSON.stringify(chatHistory.slice(0, 2))}`);
  assert.equal((await lobbySql.exec('SELECT COUNT(*) AS n FROM chat WHERE lesson=101'))[0].n, Math.min(50, previousChatRows + userCount));
  if (userCount === 250) {
    const overflow = await post('/lobby', 'overflow');
    const rejected = await mf.dispatchFetch('https://games.test/lobby/socket', { headers: { Origin: origin, Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `lobby, ticket.${overflow.ticket}` } });
    assert.equal(rejected.status, 503, 'the 251st connection is rejected without disturbing existing users');
    await rejected.text();
    console.log(JSON.stringify({ stage: 'capacity', admitted: userCount, rejectedStatus: rejected.status }));
  }
  const reconnectAt = performance.now();
  const reconnects = [];
  // Bound the local dispatcher's loopback TCP burst; all user sockets remain concurrent.
  for (let offset = 0; offset < students.length; offset += 50) reconnects.push(...await Promise.allSettled(students.slice(offset, offset + 50).map(async student => {
    const old = student.client;
    student.client = await open('/lobby/socket', 'lobby', (await post('/lobby', student.id)).ticket);
    await until(() => old.closed === 4001);
    send(student.client, { t: 'here', l: 101, a: 'lesson', show: true });
    send(student.client, { t: 'sub', online: true, chat: 101 });
  })));
  const failures = reconnects.filter(result => result.status === 'rejected');
  assert.equal(failures.length, 0, `reconnect failures: ${failures.slice(0, 3).map(result => String(result.reason)).join('; ')}`);
  await until(() => students.every(({client}) => last(client, 'counts')?.n === userCount && last(client, 'online')?.v.length === userCount));
  console.log(JSON.stringify({ stage: 'reconnect', users: userCount, convergenceMs: Math.round(performance.now() - reconnectAt) }));
  keepAlive = setInterval(() => { for (const {client} of students) if (client.closed === null) client.socket.send('ping'); }, 25_000);
  keepAlive.unref();
  const races = [];
  for (let offset = 0; offset < Math.ceil(userCount / 4); offset += 10) races.push(...await Promise.all(Array.from({length: Math.min(10, Math.ceil(userCount / 4) - offset)}, async (_, i) => {
    const group = offset + i;
    const members = students.slice(group * 4, group * 4 + 4);
    const createdRoom = await post('/rooms', members[0].id, { selection: { lessons: { 1: [1] }, types: ['meaning'] }, open: true });
    const players = await Promise.all(members.map(async (member, i) => ({ id: member.id, client: await open(`/rooms/${createdRoom.code}/socket`, 'quiz-race', i === 0 ? createdRoom.ticket : (await post(`/rooms/${createdRoom.code}`, member.id)).ticket) })));
    await until(() => players.every(p => p.client.state?.connected.length === members.length));
    send(players[0].client, {type:'start'});
    await until(() => players.every(p => p.client.state.phase === 'preparing'));
    players.forEach(p => send(p.client, {type:'ready',planHash,reviewFlow:1}));
    await until(() => players.every(p => p.client.state.phase === 'race'));
    return players;
  })));
  console.log(JSON.stringify({ stage: 'races-ready', users: userCount, rooms: races.length }));
  const latencies = [];
  const usageFor = async players => {
    const response = await mf.dispatchFetch('https://games.test/__test/room/' + players[0].client.state.code + '/usage');
    assert.equal(response.status, 200);
    return response.json();
  };
  const usageBefore = await Promise.all(races.map(usageFor));
  // Forty answers per student, paced below the server token bucket, rather than one finish frame.
  for (let word = 1; word < 40; word++) {
    for (const players of races) players.forEach(p => send(p.client, {type:'progress', answered:word, total:40, correct:word, reviewComplete:false}));
    await until(() => races.every(players => players.every(p => p.client.state.players.every(player => player.answered === word))));
    await delay(soakSeconds * 1000 / 40);
  }
  await Promise.all(races.map(async players => {
    const at = performance.now();
    players.forEach(p => send(p.client, {type:'progress', answered:40, total:40, correct:40, reviewComplete:true}));
    await until(() => players.every(p => p.client.state.phase === 'results'));
    assert.deepEqual(players[0].client.state.players.map(p => p.place).sort(), players.map((_, i) => i + 1));
    latencies.push(performance.now() - at);
  }));
  latencies.sort((a,b)=>a-b);
  const usageAfter = await Promise.all(races.map(usageFor));
  const raceUsage = Object.fromEntries(Object.keys(usageBefore[0]).map(key => [key, usageAfter.reduce((sum, usage, index) => sum + usage[key] - usageBefore[index][key], 0)]));
  assert.equal(raceUsage.listingCalls, 0, 'scores and completion do not republish unchanged listings');
  clearInterval(keepAlive);
  assert.ok(raceUsage.alarmWrites < userCount * 4, 'answers must not each rewrite the alarm');
  assert.equal(races.flat().filter(player => player.client.closed !== null).length, 0, 'sustained progress must not disconnect players');
  assert.ok(students.every(({client}) => client.closed === null && client.errors.length === 0), 'the lobby remains connected without errors during races');
  assert.ok(races.flat().every(player => player.client.errors.length === 0), 'all race actions succeed');
  // One abusive sender cannot interrupt the rest of the school, and expired sessions cannot linger.
  for (let i = 0; i < 80; i++) students[0].client.socket.send('{}');
  await until(() => students[0].client.closed === 1008);
  assert.ok(students.slice(1).every(({client}) => client.closed === null), 'rate limiting is isolated to the offending connection');
  await control('/__test/lobby/main/age');
  await control('/__test/lobby/main/alarm');
  await until(() => students.slice(1).every(({client}) => client.closed === 4002));
  console.log(JSON.stringify({ progressMessages: userCount * 40, raceUsage, note: 'Local room SQL rows, alarm writes and listing RPC calls; excludes setup, lobby, account objects and Cloudflare compute billing.' }));
  console.log(JSON.stringify({ users:userCount, raceRooms:races.length, soakSeconds, lobbyConvergenceMs:lobbyMs, chatFanoutMs:chatMs, chatBatchP95Ms:chatP95Ms, raceFinishP95Ms:Math.round(latencies[Math.ceil(latencies.length*0.95)-1]), jwksFetches }));
  assert.equal(jwksFetches, 1, 'concurrent access checks share cached signing keys');

  console.log(`PASS: lifecycle, host transfer, disconnect/reconnect, HTTP leave, duplicate creation, invite authorization, cleanup, per-lesson chat retention, ${userCount} users, ${races.length} races; JWT verify, lobby presence/people/online/chat/rate limit/cheer/hidden, open room listing + chat card + invite, host-only start, hibernation, race to results, rematch seed, ticket replay, origin`);
} finally {
  clearInterval(keepAlive);
  for (const socket of sockets) try { socket.close(1000); } catch { /* Already closed. */ }
  await mf.dispose();
}
