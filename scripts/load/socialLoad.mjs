#!/usr/bin/env node
/**
 * Study together load test: N synthetic learners connect to the Lobby, change
 * lessons, chat, create and join race rooms and answer. Reports p50/p95/p99
 * latency, error counts and bytes fanned out per user, per phase, per N.
 *
 * Dev-only (never imported by src/ or server/). Two targets:
 *
 *   --target local    The Worker runs in Miniflare in this process with a
 *                     throwaway signing key and synthetic accounts. Safe anywhere.
 *   --target staging  The deployed STAGING Worker. Needs real staging access
 *                     tokens in --tokens-file (one JWT per line, owner-issued,
 *                     synthetic accounts). Refuses production hosts and tokens.
 *
 * Examples
 *   node scripts/load/socialLoad.mjs --target local --users 100,500,2000,10000
 *   node scripts/load/socialLoad.mjs --target local --users 2000 --lift-cap
 *   node scripts/load/socialLoad.mjs --target local --users 500 --assert   (CI: fails on errors or a busted budget)
 *   node scripts/load/socialLoad.mjs --target staging --users 100 \
 *     --url https://rons-mandarin-games-staging.ronm222007.workers.dev \
 *     --origin https://ronsmandarin-staging.onrender.com --tokens-file ./tokens.txt
 *
 * Results print as one JSON line per phase and a summary table; the full report
 * is written under output/load/ (gitignored). Tokens are never printed.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';

const PRODUCTION_SUPABASE_REF = 'ylpzxpqyfaayavkvhikw';
const STAGING_SUPABASE_REF = 'zpljyjcbqkrelpdzvmqz';
const PRODUCTION_HOSTS = ['ronsmandarin.com', 'rons-mandarin-games.ronm222007.workers.dev'];
const LOBBY_CAP_SOURCE = /export const LOBBY_CAPACITY = \d+;/;
const PLAN_HASH = 'a'.repeat(64);

const { values: args } = parseArgs({ options: {
  target: { type: 'string', default: 'local' },
  users: { type: 'string', default: '100' },
  lessons: { type: 'string', default: '20' },
  'online-share': { type: 'string', default: '0.1' },
  'global-share': { type: 'string', default: '0.2' },
  churn: { type: 'string', default: '0.2' },
  chatters: { type: 'string', default: '50' },
  rooms: { type: 'string', default: '' },
  'room-size': { type: 'string', default: '4' },
  answers: { type: 'string', default: '10' },
  batch: { type: 'string', default: '100' },
  timeout: { type: 'string', default: '120' },
  'lift-cap': { type: 'boolean', default: false },
  'skip-rooms': { type: 'boolean', default: false },
  url: { type: 'string' },
  origin: { type: 'string' },
  'tokens-file': { type: 'string' },
  json: { type: 'string' },
  assert: { type: 'boolean', default: false },
} });

/**
 * CI budgets (--assert), deliberately generous for shared runners: they catch a broken path or a return of
 * everyone-to-everyone traffic (bytes pushed per learner), not small timing noise. Local reference numbers are in
 * docs/reports/scale-audit.md.
 */
const BUDGETS = {
  'presence-converge': { max: 8000 },
  'chat-lesson': { p95: 3000 },
  'chat-global': { p95: 4000 },
  'lesson-churn': { p95: 8000 },
  'race-progress': { p95: 4000 },
  'race-results': { p95: 4000 },
  'lobby-health': { bytesInPerUser: 80_000 },
};

const num = (key, min, max) => {
  const value = Number(args[key]);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`--${key} must be a number from ${min} to ${max}`);
  return value;
};
const userCounts = args.users.split(',').map(part => Number(part.trim())).filter(Boolean);
if (!userCounts.length || userCounts.some(count => !Number.isInteger(count) || count < 2 || count > 20_000)) throw new Error('--users must be comma-separated integers from 2 to 20000');
const options = {
  target: args.target, lessons: num('lessons', 1, 200), onlineShare: num('online-share', 0, 1), globalShare: num('global-share', 0, 1),
  churn: num('churn', 0, 1), chatters: num('chatters', 0, 1000), roomSize: num('room-size', 2, 6), answers: num('answers', 1, 60),
  batch: num('batch', 1, 2000), timeoutMs: num('timeout', 5, 3600) * 1000, liftCap: args['lift-cap'], skipRooms: args['skip-rooms'],
  maxRooms: args.rooms ? num('rooms', 0, 5000) : null,
};
if (options.target !== 'local' && options.target !== 'staging') throw new Error('--target must be local or staging');
if (options.target === 'staging' && options.liftCap) throw new Error('--lift-cap is a local-only experiment');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const b64 = value => Buffer.from(value).toString('base64url');
const round = value => (value === null || value === undefined ? null : Math.round(value * 10) / 10);
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = p => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] : null);
  return { count: sorted.length, p50: round(at(0.5)), p95: round(at(0.95)), p99: round(at(0.99)), max: round(sorted.at(-1) ?? null) };
}
async function waitUntil(condition, timeoutMs, label) {
  const end = performance.now() + timeoutMs;
  while (!condition()) {
    if (performance.now() > end) throw new Error(`timeout: ${label}`);
    await delay(25);
  }
}
/** Event-loop lag of this process: when it climbs, the load generator itself is the bottleneck. */
function lagSampler() {
  let max = 0; let expected = performance.now() + 100;
  const timer = setInterval(() => { const now = performance.now(); max = Math.max(max, now - expected); expected = now + 100; }, 100);
  timer.unref();
  return { max: () => round(max), reset: () => { max = 0; }, stop: () => clearInterval(timer) };
}

// --- Transports --------------------------------------------------------------

async function localTransport() {
  const { Miniflare, Response: MfResponse, convertV4MiniflareOptions } = await import('miniflare');
  const { build } = await import('esbuild');
  const origin = 'https://school.test';
  const supabase = 'https://project.test';
  const { privateKey, publicKey } = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...await webcrypto.subtle.exportKey('jwk', publicKey), kid: 'load', alg: 'ES256', use: 'sig' };
  const tokens = new Map();
  async function token(sub) {
    let value = tokens.get(sub);
    if (value) return value;
    const head = b64(JSON.stringify({ alg: 'ES256', kid: 'load', typ: 'JWT' }));
    const body = b64(JSON.stringify({ sub, role: 'authenticated', aud: 'authenticated', iss: `${supabase}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 3600 }));
    const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(`${head}.${body}`));
    value = `${head}.${body}.${b64(signature)}`;
    tokens.set(sub, value);
    return value;
  }
  // The Lobby's admission cap (LOBBY_CAPACITY in games/lobby.ts) is lifted only inside this test bundle, never in app code.
  const plugins = options.liftCap ? [{ name: 'lift-lobby-cap', setup(builder) {
    builder.onLoad({ filter: /games[\\/]lobby\.ts$/ }, async entry => {
      const source = await readFile(entry.path, 'utf8');
      if (!LOBBY_CAP_SOURCE.test(source)) throw new Error('Lobby cap pattern not found; update LOBBY_CAP_SOURCE in scripts/load/socialLoad.mjs');
      return { contents: source.replace(LOBBY_CAP_SOURCE, 'export const LOBBY_CAPACITY = 1000000;'), loader: 'ts' };
    });
  } }] : [];
  const bundle = await build({ stdin: { resolveDir: process.cwd(), sourcefile: 'load-entry.ts', contents: "export { default, GameRoom, Lobby } from './games/index';" },
    bundle: true, format: 'esm', platform: 'browser', external: ['cloudflare:workers'], write: false, plugins, logLevel: 'silent' });
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: 'games', modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-10-23',
    bindings: { APP_ORIGIN: origin, SUPABASE_URL: supabase },
    durableObjects: { ROOMS: { className: 'GameRoom', useSQLite: true }, LOBBY: { className: 'Lobby', useSQLite: true } },
    outboundService: () => MfResponse.json({ keys: [jwk] }),
  }] }));
  await mf.ready;
  return {
    name: `local Miniflare${options.liftCap ? ' (Lobby cap lifted)' : ''}`,
    userId: index => `load-${index}`,
    async post(path, userId, body) {
      const response = await mf.dispatchFetch(`https://games.test${path}`, { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${await token(userId)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json().catch(() => ({})) };
    },
    async socket(path, protocol, ticket) {
      const response = await mf.dispatchFetch(`https://games.test${path}`, { headers: { Origin: origin, Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `${protocol}, ticket.${ticket}` } });
      if (response.status !== 101) return { status: response.status, reason: await response.text().catch(() => '') };
      const ws = response.webSocket;
      ws.accept();
      return { status: 101, ws };
    },
    dispose: () => mf.dispose(),
  };
}

async function stagingTransport() {
  const { url, origin, 'tokens-file': tokensFile } = args;
  if (!url || !origin || !tokensFile) throw new Error('staging needs --url, --origin and --tokens-file');
  const target = new URL(url);
  const app = new URL(origin);
  if (target.protocol !== 'https:' || app.protocol !== 'https:') throw new Error('staging URLs must be https');
  if (!target.hostname.includes('staging') || !app.hostname.includes('staging')) throw new Error('refusing: --url and --origin must both be staging hosts');
  if (PRODUCTION_HOSTS.some(host => target.hostname === host || app.hostname === host)) throw new Error('refusing: production host');
  const lines = (await readFile(tokensFile, 'utf8')).split('\n').map(line => line.trim()).filter(Boolean);
  const claims = lines.map(line => { try { return JSON.parse(Buffer.from(line.split('.')[1], 'base64url').toString()); } catch { return null; } });
  if (claims.some(claim => !claim || typeof claim.iss !== 'string' || typeof claim.sub !== 'string')) throw new Error('refusing: a token line is not a JWT');
  if (claims.some(claim => claim.iss.includes(PRODUCTION_SUPABASE_REF) || !claim.iss.includes(STAGING_SUPABASE_REF))) throw new Error('refusing: every token must be issued by the staging Supabase project');
  const soonest = Math.min(...claims.map(claim => Number(claim.exp) || 0));
  if (soonest * 1000 < Date.now() + 60_000) throw new Error('refusing: a token expires within a minute; issue fresh ones');
  const { WebSocket: WsClient } = await import('ws');
  console.log(JSON.stringify({ target: 'staging', host: target.hostname, tokens: lines.length, minutesUntilFirstExpiry: Math.floor((soonest * 1000 - Date.now()) / 60_000) }));
  return {
    name: `staging ${target.hostname}`,
    maxUsers: lines.length,
    userId: index => claims[index].sub,
    async post(path, userId, body) {
      const index = claims.findIndex(claim => claim.sub === userId);
      const response = await fetch(`${target.origin}${path}`, { method: 'POST', headers: { Origin: app.origin, Authorization: `Bearer ${lines[index]}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
      return { status: response.status, body: await response.json().catch(() => ({})) };
    },
    socket(path, protocol, ticket) {
      return new Promise(resolve => {
        const ws = new WsClient(`${target.origin.replace('https:', 'wss:')}${path}`, [protocol, `ticket.${ticket}`], { headers: { Origin: app.origin } });
        ws.once('open', () => resolve({ status: 101, ws }));
        ws.once('unexpected-response', (_request, response) => resolve({ status: response.statusCode, reason: response.statusMessage }));
        ws.once('error', error => resolve({ status: 0, reason: error.message }));
      });
    },
    dispose: async () => {},
  };
}

// --- Clients -----------------------------------------------------------------

function attach(ws, client, tally, chat) {
  ws.addEventListener('message', event => {
    const text = typeof event.data === 'string' ? event.data : String(event.data);
    if (text === 'pong') return;
    client.bytesIn += text.length;
    let message;
    try { message = JSON.parse(text); } catch { return; }
    const kind = message.t ?? message.type ?? 'other';
    const entry = tally.get(kind) ?? { frames: 0, bytes: 0 };
    entry.frames += 1; entry.bytes += text.length; tally.set(kind, entry);
    if (kind === 'counts') client.countsN = message.n ?? 0;
    // Lesson lists are capped, so a move is confirmed by the first list for the new lesson.
    else if (kind === 'people' && message.l === client.lesson && client.awaitingMove) { client.peopleSeenAt = performance.now(); client.awaitingMove = false; }
    else if (kind === 'msg' && typeof message.m?.t === 'string' && message.m.t.startsWith(chat.marker)) {
      const sentAt = chat.sentAt.get(message.m.t);
      if (sentAt !== undefined) { chat.latencies.push(performance.now() - sentAt); chat.delivered += 1; }
    } else if (kind === 'state') { client.state = message.state; client.stateAt = performance.now(); }
    else if (kind === 'error') client.errors.push(message.message ?? message.error ?? 'error');
  });
  ws.addEventListener('close', event => { client.closed = event.code; });
}

async function run(transport, users) {
  const lag = lagSampler();
  const report = { target: transport.name, users, phases: [], tally: {}, brokeAt: null };
  const tally = new Map();
  const chat = { marker: `LT${Date.now().toString(36)}:`, sentAt: new Map(), latencies: [], delivered: 0 };
  const clients = [];
  const sockets = [];
  const phase = (name, latencies, errors, extra = {}) => {
    const row = { phase: name, users, ...stats(latencies), errors, generatorLagMs: lag.max(), ...extra };
    report.phases.push(row); console.log(JSON.stringify(row)); lag.reset();
    if (errors > 0 && !report.brokeAt) report.brokeAt = { users, phase: name };
    return row;
  };
  const send = (ws, value) => { try { ws.send(JSON.stringify(value)); return true; } catch { return false; } };
  try {
    if (transport.maxUsers && users > transport.maxUsers) throw new Error(`only ${transport.maxUsers} tokens for ${users} users`);
    // 1. Connect: ticket (HTTP, JWT verified) then socket upgrade, in batches like a classroom arriving.
    const ticketMs = []; const upgradeMs = []; let connectErrors = 0; const rejected = {};
    for (let offset = 0; offset < users; offset += options.batch) {
      await Promise.all(Array.from({ length: Math.min(options.batch, users - offset) }, async (_, i) => {
        const index = offset + i;
        const id = transport.userId(index);
        const client = { index, id, lesson: null, awaitingMove: false, countsN: 0, peopleSeenAt: 0, state: null, stateAt: 0, bytesIn: 0, errors: [], closed: null, ws: null };
        clients[index] = client;
        const t0 = performance.now();
        const ticket = await transport.post('/lobby', id, { name: id.slice(0, 30), color: 'jade' });
        ticketMs.push(performance.now() - t0);
        if (ticket.status !== 200 || !ticket.body.ticket) { connectErrors += 1; rejected[`ticket ${ticket.status}`] = (rejected[`ticket ${ticket.status}`] ?? 0) + 1; return; }
        const t1 = performance.now();
        const opened = await transport.socket('/lobby/socket', 'lobby', ticket.body.ticket);
        upgradeMs.push(performance.now() - t1);
        if (opened.status !== 101) { connectErrors += 1; rejected[`socket ${opened.status}`] = (rejected[`socket ${opened.status}`] ?? 0) + 1; return; }
        client.ws = opened.ws; sockets.push(opened.ws);
        attach(opened.ws, client, tally, chat);
      }));
    }
    const live = clients.filter(client => client.ws);
    phase('connect-ticket', ticketMs, 0);
    phase('connect-socket', upgradeMs, connectErrors, { connected: live.length, rejected });
    if (live.length < 2) throw new Error('too few connections to continue');

    // 2. Presence: spread over lessons; a share has the social panel open (one Online snapshot, room listings);
    //    everyone follows their lesson chat. `v: 2` is the current app's panel-aware subscription.
    const t2 = performance.now();
    const sub = (client, chat) => send(client.ws, { t: 'sub', online: client.index < users * options.onlineShare, chat, v: 2 });
    for (const client of live) {
      client.lesson = 101 + (client.index % options.lessons);
      send(client.ws, { t: 'here', l: client.lesson, a: 'lesson', show: true });
      sub(client, client.lesson);
    }
    let convergeError = 0;
    try { await waitUntil(() => live.every(client => client.countsN === live.length), options.timeoutMs, 'presence convergence'); }
    catch { convergeError = 1; }
    phase('presence-converge', [performance.now() - t2], convergeError, { note: 'time until every socket sees the full online count' });

    // 3. Chat burst in one lesson channel: realistic fan-out (subscribers of that lesson).
    const inLesson = live.filter(client => client.lesson === 101);
    const chatters = inLesson.slice(0, options.chatters);
    chat.sentAt.clear(); chat.latencies.length = 0; chat.delivered = 0;
    for (const [i, client] of chatters.entries()) { const text = `${chat.marker}L${i}`; chat.sentAt.set(text, performance.now()); send(client.ws, { t: 'say', l: 101, text }); }
    let chatError = 0;
    try { await waitUntil(() => chat.delivered >= chatters.length * inLesson.length, options.timeoutMs, 'lesson chat delivery'); } catch { chatError = 1; }
    phase('chat-lesson', chat.latencies, chatError, { senders: chatters.length, recipientsEach: inLesson.length, delivered: chat.delivered });

    // 4. Global chat burst: a share of users follows global chat; each message reaches all of them.
    const globalReaders = live.filter(client => client.index < users * options.globalShare);
    for (const client of globalReaders) sub(client, 0);
    await delay(1100); // the per-account chat cooldown from phase 3
    const globalChatters = globalReaders.slice(0, options.chatters);
    chat.sentAt.clear(); chat.latencies.length = 0; chat.delivered = 0;
    for (const [i, client] of globalChatters.entries()) { const text = `${chat.marker}G${i}`; chat.sentAt.set(text, performance.now()); send(client.ws, { t: 'say', l: 0, text }); }
    let globalError = 0;
    try { await waitUntil(() => chat.delivered >= globalChatters.length * globalReaders.length, options.timeoutMs, 'global chat delivery'); } catch { globalError = 1; }
    phase('chat-global', chat.latencies, globalError, { senders: globalChatters.length, recipientsEach: globalReaders.length, delivered: chat.delivered });
    for (const client of globalReaders) sub(client, client.lesson);

    // 5. Lesson churn: a share of users moves to another lesson within 5 s; each waits to see itself listed there.
    const movers = live.filter(client => client.index % Math.max(1, Math.round(1 / Math.max(options.churn, 0.0001))) === 0).slice(0, Math.ceil(live.length * options.churn));
    const moveAt = new Map();
    const churnStart = performance.now();
    for (const [i, client] of movers.entries()) {
      setTimeout(() => {
        client.lesson = 101 + ((client.index + 7) % options.lessons); client.peopleSeenAt = 0; client.awaitingMove = true;
        moveAt.set(client.id, performance.now());
        send(client.ws, { t: 'here', l: client.lesson, a: 'cards', show: true });
      }, (i / Math.max(1, movers.length)) * 5000);
    }
    let churnError = 0;
    try { await waitUntil(() => movers.every(client => moveAt.has(client.id) && client.peopleSeenAt > 0), options.timeoutMs, 'lesson churn'); } catch { churnError = 1; }
    phase('lesson-churn', movers.filter(client => client.peopleSeenAt > 0).map(client => client.peopleSeenAt - moveAt.get(client.id)), churnError, { movers: movers.length, windowMs: Math.round(performance.now() - churnStart) });

    // 6. Rooms: groups create, join, start, answer; open rooms also publish listings into the Lobby.
    if (!options.skipRooms) {
      const roomCount = Math.min(options.maxRooms ?? Infinity, Math.floor(live.length / options.roomSize));
      const createMs = []; const joinMs = []; const readyMs = []; const progressMs = []; const resultsMs = [];
      let roomErrors = 0; const roomRejected = {};
      const rooms = [];
      for (let offset = 0; offset < roomCount; offset += 25) {
        await Promise.all(Array.from({ length: Math.min(25, roomCount - offset) }, async (_, i) => {
          const members = live.slice((offset + i) * options.roomSize, (offset + i + 1) * options.roomSize);
          const t0 = performance.now();
          const created = await transport.post('/rooms', members[0].id, { name: members[0].id.slice(0, 30), color: 'jade', selection: { book: 1, lessons: { 1: [1] }, types: ['meaning'] }, open: true });
          createMs.push(performance.now() - t0);
          if (created.status !== 200 || !created.body.code) { roomErrors += 1; roomRejected[`create ${created.status}`] = (roomRejected[`create ${created.status}`] ?? 0) + 1; return; }
          const players = [];
          for (const [j, member] of members.entries()) {
            let ticket = created.body.ticket;
            if (j > 0) {
              const t1 = performance.now();
              const joined = await transport.post(`/rooms/${created.body.code}`, member.id, { name: member.id.slice(0, 30), color: 'jade' });
              joinMs.push(performance.now() - t1);
              if (joined.status !== 200 || !joined.body.ticket) { roomErrors += 1; roomRejected[`join ${joined.status}`] = (roomRejected[`join ${joined.status}`] ?? 0) + 1; return; }
              ticket = joined.body.ticket;
            }
            const opened = await transport.socket(`/rooms/${created.body.code}/socket`, 'quiz-race', ticket);
            if (opened.status !== 101) { roomErrors += 1; roomRejected[`room socket ${opened.status}`] = (roomRejected[`room socket ${opened.status}`] ?? 0) + 1; return; }
            const player = { id: member.id, state: null, stateAt: 0, errors: [], closed: null, bytesIn: 0, ws: opened.ws };
            attach(opened.ws, player, tally, chat); sockets.push(opened.ws);
            players.push(player);
          }
          try {
            const t2 = performance.now();
            await waitUntil(() => players.every(player => player.state?.connected.length === members.length), options.timeoutMs, 'room connected');
            send(players[0].ws, { type: 'start', round: 1 });
            await waitUntil(() => players.every(player => player.state?.phase === 'preparing'), options.timeoutMs, 'room preparing');
            for (const player of players) send(player.ws, { type: 'ready', planHash: PLAN_HASH, reviewFlow: 1, round: 1 });
            await waitUntil(() => players.every(player => player.state?.phase === 'race'), options.timeoutMs, 'room race');
            readyMs.push(performance.now() - t2);
            rooms.push(players);
          } catch (error) { roomErrors += 1; roomRejected[String(error.message)] = (roomRejected[String(error.message)] ?? 0) + 1; }
        }));
      }
      phase('room-create', createMs, 0);
      phase('room-join', joinMs, 0);
      phase('room-ready', readyMs, roomErrors, { rooms: rooms.length, requested: roomCount, rejected: roomRejected });
      // Answers: every player reports progress once per step; round trip = until its own state shows the step.
      let answerErrors = 0;
      let finalSentAt = performance.now();
      for (let step = 1; step <= options.answers; step++) {
        const sentAt = performance.now();
        if (step === options.answers) finalSentAt = sentAt;
        for (const players of rooms) for (const player of players) send(player.ws, { type: 'progress', round: 1, answered: step, total: options.answers, correct: step, reviewComplete: step === options.answers });
        try {
          await waitUntil(() => rooms.every(players => players.every(player => player.state?.players.find(entry => entry.id === player.id)?.answered === step || player.state?.phase === 'results')), options.timeoutMs, `answer ${step}`);
        } catch { answerErrors += 1; break; }
        for (const players of rooms) for (const player of players) if (player.stateAt >= sentAt) progressMs.push(player.stateAt - sentAt);
        if (step < options.answers) await delay(300);
      }
      try { await waitUntil(() => rooms.every(players => players.every(player => player.state?.phase === 'results')), options.timeoutMs, 'results'); } catch { answerErrors += 1; }
      for (const players of rooms) for (const player of players) if (player.state?.phase === 'results') resultsMs.push(player.stateAt - finalSentAt);
      phase('race-progress', progressMs, answerErrors, { rooms: rooms.length, answersPerPlayer: options.answers, playerErrors: rooms.flat().reduce((sum, player) => sum + player.errors.length, 0) });
      phase('race-results', resultsMs, 0, { note: 'from the final answer until each player sees results' });
    }

    // Lobby health after everything: unexpected closes and error frames are failures.
    const closedEarly = live.filter(client => client.closed !== null).length;
    const errorFrames = live.reduce((sum, client) => sum + client.errors.length, 0);
    phase('lobby-health', [], closedEarly + errorFrames, { closedEarly, errorFrames, bytesInPerUser: Math.round(live.reduce((sum, client) => sum + client.bytesIn, 0) / live.length) });
  } catch (error) {
    phase('aborted', [], 1, { reason: error instanceof Error ? error.message : String(error) });
  } finally {
    lag.stop();
    for (const ws of sockets) { try { ws.close(1000); } catch { /* already closed */ } }
    report.tally = Object.fromEntries([...tally].map(([kind, entry]) => [kind, { frames: entry.frames, kB: Math.round(entry.bytes / 1024) }]));
    console.log(JSON.stringify({ users, fanout: report.tally }));
    await delay(200);
  }
  return report;
}

// --- Main --------------------------------------------------------------------

const started = new Date();
const reports = [];
for (const users of userCounts) {
  console.log(JSON.stringify({ run: users, target: options.target, lessons: options.lessons, onlineShare: options.onlineShare, chatters: options.chatters, roomSize: options.roomSize, answers: options.answers, liftCap: options.liftCap }));
  const transport = options.target === 'local' ? await localTransport() : await stagingTransport();
  try { reports.push(await run(transport, users)); }
  finally { await transport.dispose(); }
}
const summary = reports.map(report => ({
  users: report.users,
  connectP95Ms: report.phases.find(row => row.phase === 'connect-socket')?.p95 ?? null,
  presenceConvergeMs: report.phases.find(row => row.phase === 'presence-converge')?.max ?? null,
  chatLessonP95Ms: report.phases.find(row => row.phase === 'chat-lesson')?.p95 ?? null,
  chatGlobalP95Ms: report.phases.find(row => row.phase === 'chat-global')?.p95 ?? null,
  churnP95Ms: report.phases.find(row => row.phase === 'lesson-churn')?.p95 ?? null,
  raceProgressP95Ms: report.phases.find(row => row.phase === 'race-progress')?.p95 ?? null,
  errors: report.phases.reduce((sum, row) => sum + row.errors, 0),
  brokeAt: report.brokeAt ? report.brokeAt.phase : null,
}));
console.table(summary);
const out = args.json ?? `output/load/social-${options.target}-${started.toISOString().replace(/[:.]/g, '-')}.json`;
await mkdir(out.slice(0, out.lastIndexOf('/')), { recursive: true });
await writeFile(out, JSON.stringify({ startedAt: started.toISOString(), options, summary, reports }, null, 2));
console.log(`report: ${out}`);
if (args.assert) {
  const failures = [];
  for (const report of reports) for (const row of report.phases) {
    if (row.errors) failures.push(`${report.users} users, ${row.phase}: ${row.errors} error(s)${row.reason ? ` (${row.reason})` : ''}`);
    for (const [field, limit] of Object.entries(BUDGETS[row.phase] ?? {})) {
      if (typeof row[field] === 'number' && row[field] > limit) failures.push(`${report.users} users, ${row.phase}: ${field} ${row[field]} > ${limit}`);
    }
  }
  if (failures.length) { console.error(`Load budgets failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
  console.log('Load budgets: pass');
}
