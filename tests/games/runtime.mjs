// Real SQLite Durable Objects in Miniflare. Identities are synthetic: tokens are signed here with a throwaway key.
import { Miniflare, Response, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

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
export class GameRoom extends BaseRoom { runAlarm() { return this.alarm(); } }
export class Lobby extends BaseLobby {
  runAlarm() { return this.alarm(); }
  async failListings(enabled) { await this.ctx.storage.put('fixture-listing-outage', enabled); }
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
    if (action === 'age') await stub.ageConnections();
    else if (action === 'fail') await stub.failListings(true);
    else if (action === 'recover') await stub.failListings(false);
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
async function control(path) { const response = await mf.dispatchFetch('https://games.test' + path); assert.equal(response.status, 200, await response.text()); }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition) { const end = Date.now() + 6000; while (!condition()) { assert.ok(Date.now() < end, 'Timed out'); await delay(20); } }
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
  const client = { socket, frames: [], state: null, errors: [], closed: null };
  socket.addEventListener('close', event => { client.closed = event.code; });
  socket.addEventListener('message', event => {
    if (event.data === 'pong') return;
    const message = JSON.parse(event.data);
    client.frames.push(message);
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
  const bob = await open('/lobby/socket', 'lobby', (await post('/lobby', 'bob')).ticket);
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

  // Race room: open room is listed and announced, invite reaches Bob, full race to results, rematch.
  const created = await post('/rooms', 'alice', { selection: { lessons: { 1: [1, 2], 99: [1] }, types: ['meaning', 'nope'] }, open: true });
  const host = await open(`/rooms/${created.code}/socket`, 'quiz-race', created.ticket);
  await until(() => host.state);
  assert.deepEqual(host.state.selection, { lessons: { 1: [1, 2] }, types: ['meaning'] });
  await until(() => last(bob, 'rooms')?.v.some(room => room.code === created.code));
  send(bob, { t: 'sub', online: false, chat: 101 });
  await until(() => [...bob.frames].some(frame => frame.t === 'msg' && frame.m.r?.code === created.code));
  send(alice, { t: 'invite', to: ['bob'], code: created.code });
  await until(() => last(bob, 'invite')?.room.code === created.code);
  const guest = await open(`/rooms/${created.code}/socket`, 'quiz-race', (await post(`/rooms/${created.code}`, 'bob')).ticket);
  await until(() => host.state.players.length === 2 && guest.state);
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
  send(host, { type: 'progress', answered: 5, total: 5, correct: 4, reviewComplete: false });
  await until(() => guest.state.players.find(p => p.id === 'alice').answered === 5);
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
  host.socket.close(1011, 'network lost');
  await until(() => !guest.state.connected.includes('alice'));
  assert.equal(guest.state.hostId, 'alice');
  const resumed = await open(`/rooms/${created.code}/socket`, 'quiz-race', (await post(`/rooms/${created.code}`, 'alice')).ticket);
  await until(() => resumed.state && guest.state.connected.includes('alice'));
  assert.equal(resumed.state.round, guest.state.round);

  // HTTP leave is authoritative even when its WebSocket frame cannot be delivered.
  resumed.socket.close(1011, 'offline');
  await post(`/rooms/${created.code}/leave`, 'alice');
  await until(() => guest.state.hostId === 'bob' && guest.state.players.length === 1);
  await post(`/rooms/${created.code}/leave`, 'bob');
  await delay(1200);
  const emptyRoom = await mf.unsafeGetDurableObjectStorage('games', 'GameRoom', { name: created.code });
  assert.equal((await emptyRoom.exec('SELECT * FROM state')).length, 0, 'empty rooms release stored data');

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

  // 150 simultaneously connected students in one lesson, all receiving chat; 38 independent race rooms.
  const started = performance.now();
  const students = await Promise.all(Array.from({ length: 150 }, async (_, index) => {
    const id = `load-${index}`;
    const client = await open('/lobby/socket', 'lobby', (await post('/lobby', id)).ticket);
    send(client, { t: 'here', l: 101, a: 'lesson', show: true, i: `https://lh3.googleusercontent.com/${id}` });
    send(client, { t: 'sub', online: true, chat: 101 });
    return { id, client };
  }));
  await until(() => students.every(({client}) => last(client, 'counts')?.n === 150 && last(client, 'online')?.v.length === 150 && last(client, 'people')?.v.length === 150));
  assert.ok(students.every(({id, client}) => last(client, 'online').v.some(person => person.u === id && person.i === `https://lh3.googleusercontent.com/${id}`)), 'profile photos stay present in 150-person snapshots');
  const lobbyMs = Math.round(performance.now() - started);
  const stableCount = students[0].client.frames.filter(f => f.t === 'counts').length;
  await control('/__test/lobby/main/alarm');
  await delay(100);
  assert.equal(students[0].client.frames.filter(f => f.t === 'counts').length, stableCount, 'unchanged presence is not broadcast again');
  const burstAt = performance.now();
  for (const {id, client} of students) send(client, { t: 'say', l: 101, text: id });
  await until(() => students.every(({client}) => client.frames.filter(f => f.t === 'msg' && f.m.t.startsWith('load-')).length === 150));
  assert.ok(students.every(({id, client}) => client.frames.some(frame => frame.t === 'msg' && frame.m.u === id && frame.m.i === `https://lh3.googleusercontent.com/${id}`)), 'chat messages include the sender profile photo');
  const priorHistoryFrames = students[0].client.frames.filter(frame => frame.t === 'history').length;
  send(students[0].client, { t: 'sub', online: true, chat: null });
  send(students[0].client, { t: 'sub', online: true, chat: 101 });
  await until(() => students[0].client.frames.filter(frame => frame.t === 'history').length > priorHistoryFrames);
  const chatHistory = last(students[0].client, 'history').v;
  assert.ok(chatHistory.some(message => message.i && message.u.startsWith('load-')), `chat history decorates online senders with their profile photos: ${JSON.stringify(chatHistory.slice(0, 2))}`);
  const chatMs = Math.round(performance.now() - burstAt);
  assert.equal((await lobbySql.exec('SELECT COUNT(*) AS n FROM chat WHERE lesson=101'))[0].n, 50);
  const races = await Promise.all(Array.from({length: 38}, async (_, group) => {
    const members = students.slice(group * 4, group * 4 + 4);
    const createdRoom = await post('/rooms', members[0].id, { selection: { lessons: { 1: [1] }, types: ['meaning'] }, open: true });
    const players = await Promise.all(members.map(async (member, i) => ({ id: member.id, client: await open(`/rooms/${createdRoom.code}/socket`, 'quiz-race', i === 0 ? createdRoom.ticket : (await post(`/rooms/${createdRoom.code}`, member.id)).ticket) })));
    await until(() => players.every(p => p.client.state?.connected.length === members.length));
    send(players[0].client, {type:'start'});
    await until(() => players.every(p => p.client.state.phase === 'preparing'));
    players.forEach(p => send(p.client, {type:'ready',planHash,reviewFlow:1}));
    await until(() => players.every(p => p.client.state.phase === 'race'));
    return players;
  }));
  const latencies = [];
  await Promise.all(races.map(async players => {
    const at = performance.now();
    players.forEach(p => send(p.client, {type:'progress', answered:1, total:1, correct:1, reviewComplete:true}));
    await until(() => players.every(p => p.client.state.phase === 'results'));
    assert.deepEqual(players[0].client.state.players.map(p => p.place).sort(), players.map((_, i) => i + 1));
    latencies.push(performance.now() - at);
  }));
  latencies.sort((a,b)=>a-b);
  console.log(JSON.stringify({ users:150, raceRooms:races.length, lobbyConvergenceMs:lobbyMs, chat150FanoutMs:chatMs, raceFinishP95Ms:Math.round(latencies[Math.ceil(latencies.length*0.95)-1]), jwksFetches }));
  assert.equal(jwksFetches, 1, 'concurrent access checks share cached signing keys');

  console.log('PASS: lifecycle, host transfer, disconnect/reconnect, HTTP leave, duplicate creation, invite authorization, cleanup, per-lesson chat retention, 150 users, 38 races; JWT verify, lobby presence/people/online/chat/rate limit/cheer/hidden, open room listing + chat card + invite, host-only start, hibernation, race to results, rematch seed, ticket replay, origin');
} finally {
  for (const socket of sockets) try { socket.close(1000); } catch { /* Already closed. */ }
  await mf.dispose();
}
