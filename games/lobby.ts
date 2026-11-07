import { DurableObject } from 'cloudflare:workers';
import { CHAT_KEEP, CHAT_TTL_MS, DAILY_LIMITS, DAILY_LIMIT_ERROR, ROOM_LIST_CAP, ROSTER_GAP_MS, SOCIAL_FRAME_BYTES, chatDailyFull, nextChatRate, utcDay, parseLobbyMessage, type ChatRate, type ChatMessage, type LessonCount, type LobbyServerMessage, type Person, type Activity, type MentionNotice } from '../shared/lobby';
import { socialColor, socialImage, type RaceRoomSummary, type SocialColor } from '../shared/quizRace';
import { SOCIAL_BANNED_ERROR, SOCIAL_PAUSED_ERROR, socialBanned, socialPaused } from './access';

type Att = {
  u: string; n: string; c: SocialColor; i?: string; show: boolean; l: number | null; a: Activity | null;
  /** The Google photo this account's sign-in carries: the only provider photo it may show. */
  g?: string;
  /** A Shu-Te (or owner) account: sees other Shu-Te learners first. */
  s?: boolean;
  on: boolean; ch: number | null; cheer: number; inv: number[];
  activeAt: number; tokens: number; updatedAt: number;
  authUntil: number;
  /** Accepted at (ms): orders faces and lesson lists the same way after every wake. */
  j?: number;
  /** Set by the first `sub`: true streams open rooms only while the social panel is open; false (older clients) streams every listing change. */
  v2?: boolean;
  /** Subscribed with v: 3, so it knows the 'test' activity; older clients see it as 'lesson'. */
  v3?: boolean;
};
type ChatRow = { id: number; lesson: number; uid: string; name: string; color: string; text: string; room: string | null; ts: number };
const FLUSH_MS = 2000;
/** With sockets connected: stale sockets, expired rows and a safety flush; idle objects clean up hourly. */
const MAINTENANCE_MS = 5 * 60_000;
const IDLE_MAINTENANCE_MS = 3_600_000;
const ROOM_TTL_MS = 35 * 60_000;
const STALE_MS = 90_000;
/** Admission limit, measured with scripts/load/socialLoad.mjs (docs/reports/scale-audit.md). */
export const LOBBY_CAPACITY = 2000;
/** People sent per lesson (faces, "In this lesson"); the lesson's count stays exact. */
const PEOPLE_CAP = 30;
/** The Online list is a snapshot on request, never streamed. */
const ROSTER_CAP = 100;
const ROOMS_REUSE_MS = 30_000;
/** Same allowance the per-account limiter gives HTTP requests; kept here, it costs no extra request. */
const TICKET_BURST = 30;
const TICKET_REFILL_MS = 2000;
export const TICKET_LIMIT_ERROR = 'Too many connection requests. Try again shortly.';

/**
 * Presence, lesson and global chat, mentions, cheers and invites for everyone signed in. Hibernating; socket
 * attachments are the durable per-socket state, mirrored in memory (rebuilt on wake) so each event touches only
 * the sockets it concerns: a chat line reaches its channel's subscribers, a mention or cheer its recipients.
 * A flush (at most every 2 s, only after a change) sends lesson counts, each lesson's first people and, to open
 * panels, the open rooms; per-socket dedupe skips unchanged frames.
 */
const NONE: ReadonlySet<string> = new Set();
/** For a Shu-Te viewer, Shu-Te people before everyone else (0 when it makes no difference). */
const schoolFirst = (viewer: Pick<Att, 's'>, a: Pick<Att, 's'>, b: Pick<Att, 's'>) =>
  viewer.s === false ? 0 : Number(b.s !== false) - Number(a.s !== false);

export class Lobby extends DurableObject<Env> {
  protected capacity = LOBBY_CAPACITY;
  private lastFlush = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  /** The stored alarm, once read after a wake (undefined = not read yet). */
  private alarmAt: number | null | undefined;
  private sent = new WeakMap<WebSocket, Map<string, string>>();
  private live: Map<WebSocket, Att> | null = null;
  private byUser = new Map<string, WebSocket>();
  private byChannel = new Map<number, Set<WebSocket>>();
  private ticketBuckets = new Map<string, { tokens: number; at: number }>();
  private roomsCache: { frame: string; at: number; rows: Array<{ room: RaceRoomSummary; members: string[] }> } | null = null;
  private rosterAt = new WeakMap<WebSocket, number>();
  /** Everyone in any block pair (loaded once per wake); accounts outside it skip per-person filtering. */
  private blockedAny: Set<string> | null = null;
  private hiddenCache = new Map<string, Set<string>>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS tickets (ticket TEXT PRIMARY KEY, uid TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, expires INTEGER NOT NULL, auth_until INTEGER NOT NULL DEFAULT 0)');
    const ticketColumns = sql.exec<{ name: string }>('PRAGMA table_info(tickets)').toArray().map(column => column.name);
    if (!ticketColumns.includes('auth_until')) sql.exec('ALTER TABLE tickets ADD COLUMN auth_until INTEGER NOT NULL DEFAULT 0');
    if (!ticketColumns.includes('google')) sql.exec('ALTER TABLE tickets ADD COLUMN google TEXT');
    if (!ticketColumns.includes('school')) sql.exec('ALTER TABLE tickets ADD COLUMN school INTEGER NOT NULL DEFAULT 1');
    sql.exec('CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, lesson INTEGER NOT NULL, uid TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, text TEXT NOT NULL, room TEXT, ts INTEGER NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS chat_lesson ON chat (lesson, id)');
    sql.exec('CREATE TABLE IF NOT EXISTS chat_rate (uid TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS mentions (uid TEXT NOT NULL, key TEXT NOT NULL, data TEXT NOT NULL, ts INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(uid,key))');
    sql.exec('CREATE INDEX IF NOT EXISTS mentions_uid ON mentions(uid,ts)');
    sql.exec('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
    // Account IDs in the room, so a listing is hidden from anyone in a block pair with one of them (never sent).
    if (!sql.exec<{ name: string }>('PRAGMA table_info(rooms)').toArray().some(column => column.name === 'members')) sql.exec("ALTER TABLE rooms ADD COLUMN members TEXT NOT NULL DEFAULT '[]'");
    sql.exec('CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, msg INTEGER NOT NULL, uid TEXT NOT NULL, text TEXT NOT NULL, reporter TEXT NOT NULL, ts INTEGER NOT NULL)');
    // `uid` blocked `other`: both are hidden from each other. Sent by the blocker's own app (its saved list).
    sql.exec('CREATE TABLE IF NOT EXISTS blocks (uid TEXT NOT NULL, other TEXT NOT NULL, PRIMARY KEY(uid,other))');
    sql.exec('CREATE INDEX IF NOT EXISTS blocks_other ON blocks(other)');
    sql.exec('CREATE TABLE IF NOT EXISTS daily (uid TEXT NOT NULL, kind TEXT NOT NULL, day INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY(uid,kind))');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async issue(uid: string, name: string, color: string, authUntil: number, google?: string, school = true): Promise<{ ticket: string }> {
    const now = Date.now();
    const bucket = this.ticketBuckets.get(uid);
    const tokens = Math.min(TICKET_BURST, (bucket?.tokens ?? TICKET_BURST) + (now - (bucket?.at ?? now)) / TICKET_REFILL_MS);
    if (tokens < 1) throw new Error(TICKET_LIMIT_ERROR);
    this.ticketBuckets.set(uid, { tokens: tokens - 1, at: now });
    if (this.ticketBuckets.size > 10_000) for (const [key, value] of this.ticketBuckets) if (now - value.at > TICKET_BURST * TICKET_REFILL_MS) this.ticketBuckets.delete(key);
    const ticket = crypto.randomUUID();
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires <= ?', now);
    this.ctx.storage.sql.exec('INSERT INTO tickets (ticket,uid,name,color,expires,auth_until,google,school) VALUES (?,?,?,?,?,?,?,?)', ticket, uid, name, socialColor(color), Math.min(authUntil, now + 30_000), Math.min(authUntil, now + 15 * 60_000), google ?? null, school ? 1 : 0);
    await this.ensureAlarm();
    return { ticket };
  }

  async upsertRoom(summary: RaceRoomSummary, hostUid: string, members: string[] = []) {
    const existing = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM rooms WHERE code=?', summary.code).toArray()[0];
    const previous = existing ? JSON.parse(existing.data) as RaceRoomSummary : null;
    if (previous && (previous.revision ?? 0) >= (summary.revision ?? 0)) return;
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO rooms (code,data,updated,members) VALUES (?,?,?,?)', summary.code, JSON.stringify(summary), Date.now(), JSON.stringify(members.slice(0, 12)));
    this.roomsCache = null;
    if (summary.open && summary.players.length && !this.ctx.storage.sql.exec('SELECT id FROM chat WHERE room=? LIMIT 1', summary.code).toArray().length) {
      const lesson = (summary.selection.book ?? 1) * 100 + Number(Object.keys(summary.selection.lessons)[0]);
      this.post({ u: hostUid, n: summary.host, c: socialColor(summary.hostColor), i: summary.hostImage }, lesson, '', summary.code);
    }
    this.scheduleFlush();
    await this.ensureAlarm();
  }

  /** Live sockets and their state; rebuilt from attachments after a wake (and by every maintenance alarm). */
  private index(): Map<WebSocket, Att> {
    if (this.live) return this.live;
    this.live = new Map();
    this.byUser.clear(); this.byChannel.clear();
    for (const socket of this.ctx.getWebSockets()) if (socket.readyState === 1) this.track(socket, socket.deserializeAttachment() as Att);
    return this.live;
  }
  private track(socket: WebSocket, att: Att) {
    this.index().set(socket, att);
    this.byUser.set(att.u, socket);
    if (att.ch !== null) this.channel(att.ch).add(socket);
  }
  private channel(key: number) {
    let set = this.byChannel.get(key);
    if (!set) { set = new Set(); this.byChannel.set(key, set); }
    return set;
  }
  private moveChannel(socket: WebSocket, att: Att, next: number | null) {
    if (att.ch !== null) this.byChannel.get(att.ch)?.delete(socket);
    att.ch = next;
    if (next !== null) this.channel(next).add(socket);
  }
  private forget(socket: WebSocket) {
    const att = this.live?.get(socket);
    if (!att) return;
    this.live!.delete(socket);
    if (this.byUser.get(att.u) === socket) this.byUser.delete(att.u);
    if (att.ch !== null) this.byChannel.get(att.ch)?.delete(socket);
  }
  private close(socket: WebSocket, code: number, reason: string) {
    this.forget(socket);
    try { socket.close(code, reason); } catch { /* Already closing. */ }
  }
  /** The live, visible socket of an account, if any. */
  private visible(uid: string): { socket: WebSocket; att: Att } | null {
    const socket = this.byUser.get(uid);
    const att = socket && this.index().get(socket);
    return socket && att?.show ? { socket, att } : null;
  }

  private send(socket: WebSocket, message: LobbyServerMessage | string, key?: string) {
    const frame = typeof message === 'string' ? message : JSON.stringify(message);
    if (key) {
      let sent = this.sent.get(socket);
      if (!sent) { sent = new Map(); this.sent.set(socket, sent); }
      if (sent.get(key) === frame) return;
      sent.set(key, frame);
    }
    try { socket.send(frame); } catch { this.close(socket, 1011, 'Reconnect.'); }
  }
  /** Accounts hidden from `uid` (and it from them): everyone it blocked and everyone who blocked it. */
  private hidden(uid: string): ReadonlySet<string> {
    this.blockedAny ??= new Set(this.ctx.storage.sql.exec<{ id: string }>('SELECT uid AS id FROM blocks UNION SELECT other FROM blocks').toArray().map(row => row.id));
    if (!this.blockedAny.has(uid)) return NONE;
    let set = this.hiddenCache.get(uid);
    if (!set) {
      set = new Set(this.ctx.storage.sql.exec<{ id: string }>('SELECT other AS id FROM blocks WHERE uid=? UNION SELECT uid FROM blocks WHERE other=?', uid, uid).toArray().map(row => row.id));
      this.hiddenCache.set(uid, set);
    }
    return set;
  }
  private apart(a: string, b: string) { return this.hidden(a).has(b); }
  /** For rooms: whether `uid` is in a block pair with anyone in `others` (a join is then refused as "full"). */
  async apartFromAny(uid: string, others: string[]): Promise<boolean> {
    const hide = this.hidden(uid);
    return others.some(other => hide.has(other));
  }
  /** For rooms: the block pairs among `ids`, as "a|b" keys both ways (party chat skips them). */
  async pairsAmong(ids: string[]): Promise<string[]> {
    const pairs: string[] = [];
    for (const a of ids) for (const b of ids) if (a !== b && this.apart(a, b)) pairs.push(`${a}|${b}`);
    return pairs;
  }
  /** Counts one cheer or invite toward today's allowance; false once it is used up. */
  private allowDaily(uid: string, kind: 'cheer' | 'invite', now: number): boolean {
    const day = utcDay(now);
    const row = this.ctx.storage.sql.exec<{ day: number; n: number }>('SELECT day,n FROM daily WHERE uid=? AND kind=?', uid, kind).toArray()[0];
    const used = row?.day === day ? row.n : 0;
    if (used >= DAILY_LIMITS[kind]) return false;
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO daily VALUES (?,?,?,?)', uid, kind, day, used + 1);
    return true;
  }
  /** Replaces an account's block list, writing only what changed. */
  private saveBlocks(uid: string, next: string[]) {
    const wanted = new Set(next.filter(id => id !== uid));
    const current = new Set(this.ctx.storage.sql.exec<{ other: string }>('SELECT other FROM blocks WHERE uid=?', uid).toArray().map(row => row.other));
    const added = [...wanted].filter(id => !current.has(id));
    const removed = [...current].filter(id => !wanted.has(id));
    if (!added.length && !removed.length) return false;
    this.ctx.storage.transactionSync(() => {
      for (const id of removed) this.ctx.storage.sql.exec('DELETE FROM blocks WHERE uid=? AND other=?', uid, id);
      for (const id of added) this.ctx.storage.sql.exec('INSERT OR IGNORE INTO blocks VALUES (?,?)', uid, id);
    });
    this.blockedAny = null; this.hiddenCache.clear();
    return true;
  }

  /** `legacy` viewers (no v: 3) get 'test' as 'lesson', an activity they can name. */
  private person(att: Att, legacy = false): Person {
    return { u: att.u, n: att.n, c: att.c, l: att.l, a: legacy && att.a === 'test' ? 'lesson' : att.a, ...(att.i ? { i: att.i } : {}) };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Origin') !== this.env.APP_ORIGIN || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Forbidden', { status: 403 });
    const protocols = request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(value => value.trim()) ?? [];
    const ticket = protocols.find(value => value.startsWith('ticket.'))?.slice(7);
    if (!ticket || !protocols.includes('lobby')) return new Response('Sign in again.', { status: 401 });
    const entry = this.ctx.storage.sql.exec<{ uid: string; name: string; color: string; expires: number; auth_until: number; google: string | null; school: number }>('SELECT uid,name,color,expires,auth_until,google,school FROM tickets WHERE ticket=?', ticket).toArray()[0];
    if (!entry || entry.expires <= Date.now() || entry.auth_until <= Date.now()) return new Response('Sign in again.', { status: 401 });
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE ticket=?', ticket);
    const live = this.index();
    const old = this.byUser.get(entry.uid);
    if (old) this.close(old, 4001, 'Opened in another tab.');
    if (live.size >= this.capacity) return new Response('Study together is full. Try again shortly.', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    // Hidden until the client's privacy preference arrives; never briefly disclose hidden users.
    const att: Att = { u: entry.uid, n: entry.name, c: socialColor(entry.color), ...(entry.google ? { g: entry.google } : {}), s: entry.school !== 0, show: false, l: null, a: null, on: false, ch: null, cheer: 0, inv: [], activeAt: Date.now(), updatedAt: Date.now(), tokens: 30, authUntil: entry.auth_until, j: Date.now() };
    server.serializeAttachment(att);
    this.track(server, att);
    this.send(server, { t: 'me', u: att.u });
    this.ctx.waitUntil(this.inbox(att.u).then(v => { if (server.readyState === 1) this.send(server, { t: 'mentions', v }); }).catch(() => {}));
    this.scheduleFlush();
    await this.ensureAlarm();
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'lobby' } });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    if (socket.readyState !== 1) return;
    if (typeof raw !== 'string' || raw.length > SOCIAL_FRAME_BYTES || new TextEncoder().encode(raw).byteLength > SOCIAL_FRAME_BYTES) { this.close(socket, 1008, 'Invalid message.'); return; }
    let att = this.index().get(socket);
    if (!att) { att = socket.deserializeAttachment() as Att; this.track(socket, att); }
    if ((att.authUntil ?? 0) <= Date.now()) { this.close(socket, 4002, 'Refresh your sign-in.'); return; }
    if (socialPaused(this.env) || socialBanned(this.env, att.u)) { this.close(socket, 4004, socialPaused(this.env) ? SOCIAL_PAUSED_ERROR : SOCIAL_BANNED_ERROR); return; }
    const now = Date.now();
    att.tokens = Math.min(30, (att.tokens ?? 30) + (now - (att.updatedAt ?? now)) / 200);
    att.activeAt = now; att.updatedAt = now;
    if (att.tokens < 1) { this.close(socket, 1008, 'Too many actions.'); return; }
    att.tokens -= 1; socket.serializeAttachment(att);
    let message;
    try { message = parseLobbyMessage(JSON.parse(raw)); } catch { return; }
    if (message.t === 'here') {
      const image = socialImage(message.i, this.env.SUPABASE_URL, 'avatar', { uid: att.u, google: att.g });
      if (message.l === att.l && message.a === att.a && message.show === att.show && image === att.i) return;
      att.l = message.l; att.a = message.a; att.show = message.show; att.i = image;
      socket.serializeAttachment(att);
      // Clear old lesson people immediately, including when leaving the last lesson.
      this.sent.get(socket)?.delete('people');
      this.scheduleFlush();
    } else if (message.t === 'sub') {
      const chatChanged = message.chat !== att.ch;
      const panelOpened = message.online && !att.on;
      att.on = message.online; att.v2 = message.v === 2 || message.v === 3; att.v3 = message.v === 3;
      this.moveChannel(socket, att, message.chat);
      socket.serializeAttachment(att);
      if (chatChanged && att.ch !== null) this.send(socket, { t: 'history', l: att.ch, v: this.history(att.ch, now, att.u) });
      if (panelOpened) this.sendRoster(socket, att, now);
      // Open panels (and older clients, which always follow listings) get the current list at once; deduped.
      if (att.on || !att.v2) this.send(socket, this.roomsFrame(att.u), 'rooms');
    } else if (message.t === 'roster') {
      this.sendRoster(socket, att, now);
    } else if (message.t === 'say') {
      if (att.ch !== message.l) return;
      const saved = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM chat_rate WHERE uid=?', att.u).toArray()[0];
      const rate = nextChatRate(saved ? JSON.parse(saved.data) as ChatRate : null, message.text, now);
      if (!rate) {
        const previous = saved ? JSON.parse(saved.data) as ChatRate : null;
        this.send(socket, { t: 'error', message: chatDailyFull(previous, now) ? DAILY_LIMIT_ERROR : 'Please wait before sending another message.' });
        return;
      }
      this.ctx.storage.sql.exec('INSERT OR REPLACE INTO chat_rate VALUES (?,?,?)', att.u, JSON.stringify(rate), now);
      // Mentions reach people visibly online in this channel, or who wrote in it recently.
      const recipients = (message.mentions ?? []).filter(id => {
        if (id === att.u || this.apart(att.u, id)) return false;
        const target = this.visible(id);
        if (target && (message.l === 0 || target.att.l === message.l)) return true;
        return this.ctx.storage.sql.exec('SELECT 1 FROM chat WHERE lesson=? AND uid=? AND ts>=? LIMIT 1', message.l, id, now - CHAT_TTL_MS).toArray().length > 0;
      });
      this.post(att, message.l, message.text, null, recipients);
      await this.ensureAlarm();
    } else if (message.t === 'cheer') {
      if (now - att.cheer < 3000) return;
      att.cheer = now; socket.serializeAttachment(att);
      if (!this.allowDaily(att.u, 'cheer', now)) { this.send(socket, { t: 'error', message: DAILY_LIMIT_ERROR }); return; }
      const frame = JSON.stringify({ t: 'cheer', from: this.person(att), p: message.p } satisfies LobbyServerMessage);
      for (const id of new Set(message.to)) { const target = this.visible(id); if (target && !this.apart(att.u, id)) this.send(target.socket, frame); }
    } else if (message.t === 'invite') {
      att.inv = att.inv.filter(time => now - time < 60_000);
      if (att.inv.length >= 10) return;
      att.inv.push(now); socket.serializeAttachment(att);
      if (!this.allowDaily(att.u, 'invite', now)) { this.send(socket, { t: 'error', message: DAILY_LIMIT_ERROR }); return; }
      const room = await this.env.ROOMS.getByName(message.code).invitation(att.u);
      if (socket.readyState !== 1) return;
      if (!room) { this.send(socket, { t: 'error', message: 'This room is full or no longer accepting players.' }); return; }
      const frame = JSON.stringify({ t: 'invite', from: this.person(att), room } satisfies LobbyServerMessage);
      let delivered = 0;
      for (const id of new Set(message.to)) {
        const target = this.visible(id);
        // A blocked pair looks offline to each other.
        if (target && target.socket !== socket && !this.apart(att.u, id)) { this.send(target.socket, frame); delivered++; }
      }
      if (!delivered) this.send(socket, { t: 'error', message: 'They’re offline. Share your room link instead.' });
    } else if (message.t === 'mention-open') {
      const row = this.ctx.storage.sql.exec<{ data: string; read: number }>('SELECT data,read FROM mentions WHERE uid=? AND key=? AND ts>=?', att.u, message.key, now - CHAT_TTL_MS).toArray()[0];
      const notice = row ? { ...JSON.parse(row.data) as MentionNotice, read: !!row.read } : null;
      let allowed = false;
      try { allowed = !!notice?.room && await this.env.ROOMS.getByName(notice.room).canSeeMention(att.u); } catch { /* No private preview on failure. */ }
      this.send(socket, { t: 'mention-open', key: message.key, v: allowed ? notice : null });
    } else if (message.t === 'mention-read') {
      this.ctx.storage.sql.exec('UPDATE mentions SET read=1 WHERE uid=? AND key=?', att.u, message.key);
      this.send(socket, { t: 'mention-read', key: message.key });
    } else if (message.t === 'report') {
      const row = this.ctx.storage.sql.exec<{ uid: string; text: string }>('SELECT uid,text FROM chat WHERE id=? AND lesson=?', message.id, att.ch ?? -1).toArray()[0];
      if (!row) return;
      const duplicate = this.ctx.storage.sql.exec('SELECT id FROM reports WHERE msg=? AND reporter=?', message.id, att.u).toArray().length;
      if (duplicate) return;
      this.ctx.storage.sql.exec('INSERT INTO reports (msg,uid,text,reporter,ts) VALUES (?,?,?,?,?)', message.id, row.uid, row.text, att.u, now);
      console.log(JSON.stringify({ event: 'chat_report', msg: message.id }));
      await this.ensureAlarm();
    } else if (message.t === 'blocks') {
      if (this.saveBlocks(att.u, message.v)) {
        // Faces and lists refilter on the next flush; an open chat is resent without the hidden lines.
        if (att.ch !== null) this.send(socket, { t: 'history', l: att.ch, v: this.history(att.ch, now, att.u) });
        this.scheduleFlush();
      }
    } else if (message.t === 'card-ask' || message.t === 'card') {
      // Profile visits: only between people who are visibly online; forwarded, never stored.
      if (!att.show || message.t === 'card-ask' && message.u === att.u) return;
      const target = this.visible(message.t === 'card-ask' ? message.u : message.to);
      if (!target || target.socket === socket || this.apart(att.u, target.att.u)) return;
      if (message.t === 'card-ask') this.send(target.socket, { t: 'card-ask', from: att.u });
      else {
        const { ci, ...card } = message.v ?? {};
        const cover = socialImage(ci, this.env.SUPABASE_URL, 'cover', { uid: att.u });
        this.send(target.socket, { t: 'card', u: att.u, v: message.v ? { ...card, ...(cover ? { ci: cover } : {}) } as typeof message.v : null });
      }
    }
  }

  /** The Online list: people in this lesson first, then the most recently active; one capped snapshot per request. */
  private sendRoster(socket: WebSocket, att: Att, now: number) {
    if (now - (this.rosterAt.get(socket) ?? 0) < ROSTER_GAP_MS) return;
    this.rosterAt.set(socket, now);
    const here = (other: Att) => att.l !== null && other.l === att.l ? 1 : 0;
    const hide = this.hidden(att.u);
    const people = [...this.index().values()].filter(other => other.show && !hide.has(other.u))
      .sort((a, b) => here(b) - here(a) || schoolFirst(att, a, b) || b.activeAt - a.activeAt).slice(0, ROSTER_CAP).map(other => this.person(other, !att.v3));
    this.send(socket, { t: 'online', v: people }, 'online');
  }

  private post(att: Pick<Att, 'u' | 'n' | 'c' | 'i'>, lesson: number, text: string, room: string | null, recipients: string[] = []) {
    const now = Date.now();
    const { line, notices } = this.ctx.storage.transactionSync(() => {
      const id = this.ctx.storage.sql.exec<{ id: number }>('INSERT INTO chat (lesson,uid,name,color,text,room,ts) VALUES (?,?,?,?,?,?,?) RETURNING id', lesson, att.u, att.n, att.c, text, room, now).one().id;
      // IDs are global, so pruning is scoped to one channel.
      this.ctx.storage.sql.exec('DELETE FROM chat WHERE lesson=? AND (ts<? OR id NOT IN (SELECT id FROM chat WHERE lesson=? ORDER BY id DESC LIMIT ?))', lesson, now - CHAT_TTL_MS, lesson, CHAT_KEEP);
      const line = this.message({ id, lesson, uid: att.u, name: att.n, color: att.c, text, room, ts: now }, att.i);
      const notices = recipients.filter(uid => !this.apart(uid, att.u)).map(uid => ({ uid, notice: { key: `l:${id}`, channel: lesson, message: line, read: false } }));
      for (const { uid, notice } of notices) this.saveMention(uid, notice);
      return { line, notices };
    });
    for (const { uid, notice } of notices) this.deliverMention(uid, notice);
    const frame = JSON.stringify({ t: 'msg', m: line } satisfies LobbyServerMessage);
    this.index();
    for (const socket of [...(this.byChannel.get(lesson) ?? [])]) {
      const reader = this.live?.get(socket);
      if (!reader || !this.apart(reader.u, att.u)) this.send(socket, frame);
    }
  }

  private async inbox(uid: string): Promise<MentionNotice[]> {
    const hide = this.hidden(uid);
    const notices = this.ctx.storage.sql.exec<{ data: string; read: number }>('SELECT data,read FROM mentions WHERE uid=? AND ts>=? ORDER BY ts DESC LIMIT 30', uid, Date.now() - CHAT_TTL_MS).toArray()
      .map(row => ({ ...JSON.parse(row.data) as MentionNotice, read: !!row.read })).filter(notice => !hide.has(notice.message.u));
    const access = new Map<string, Promise<boolean>>();
    for (const notice of notices) if (notice.room && !access.has(notice.room)) {
      access.set(notice.room, this.env.ROOMS.getByName(notice.room).canSeeMention(uid).catch(() => false));
    }
    return Promise.all(notices.map(async notice => {
      if (!notice.room || await access.get(notice.room)) return notice;
      return { ...notice, message: { ...notice.message, t: '' } };
    }));
  }
  private saveMention(uid: string, notice: MentionNotice) {
    const inserted = this.ctx.storage.sql.exec('INSERT OR IGNORE INTO mentions(uid,key,data,ts) VALUES (?,?,?,?) RETURNING key', uid, notice.key, JSON.stringify(notice), notice.message.ts).toArray().length;
    this.ctx.storage.sql.exec('DELETE FROM mentions WHERE uid=? AND key NOT IN (SELECT key FROM mentions WHERE uid=? ORDER BY ts DESC LIMIT 30)', uid, uid);
    return !!inserted;
  }

  private deliverMention(uid: string, notice: MentionNotice) {
    this.index();
    const socket = this.byUser.get(uid);
    if (socket) this.send(socket, { t: 'mention', v: notice });
  }
  async partyMention(uid: string, notice: MentionNotice) {
    if (this.apart(uid, notice.message.u)) return;
    let allowed: boolean;
    try { allowed = !!notice.room && await this.env.ROOMS.getByName(notice.room).canSeeMention(uid); } catch { throw new Error('Could not verify room membership.'); }
    const safe = allowed ? notice : { ...notice, message: { ...notice.message, t: '' } };
    if (this.ctx.storage.transactionSync(() => this.saveMention(uid, safe))) this.deliverMention(uid, safe);
    await this.ensureAlarm();
  }

  private message(row: ChatRow, image?: string): ChatMessage {
    const base: ChatMessage = { id: row.id, l: row.lesson, u: row.uid, n: row.name, c: socialColor(row.color), t: row.text, ts: row.ts };
    const avatar = socialImage(image, this.env.SUPABASE_URL);
    if (avatar) base.i = avatar;
    if (row.room) {
      const data = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM rooms WHERE code=?', row.room).toArray()[0];
      if (data) base.r = JSON.parse(data.data) as RaceRoomSummary;
    }
    return base;
  }

  private history(lesson: number, now: number, viewer: string) {
    const live = this.index();
    const hide = this.hidden(viewer);
    const image = (uid: string) => { const socket = this.byUser.get(uid); return socket ? live.get(socket)?.i : undefined; };
    return this.ctx.storage.sql.exec<ChatRow>('SELECT * FROM chat WHERE lesson=? AND ts>=? ORDER BY id DESC LIMIT ?', lesson, now - CHAT_TTL_MS, CHAT_KEEP)
      .toArray().reverse().filter(row => !hide.has(row.uid)).map(row => this.message(row, image(row.uid))).filter(message => message.t || message.r);
  }
  /**
   * Open, joinable rooms, newest first; reused for 30 s unless a listing changes. Someone in a block pair gets
   * the list without rooms the other person is in (rare, so built only for them).
   */
  private roomsFrame(viewer: string): string {
    const now = Date.now();
    if (!this.roomsCache || now - this.roomsCache.at >= ROOMS_REUSE_MS) {
      const rows = this.ctx.storage.sql.exec<{ data: string; members: string }>("SELECT data,members FROM rooms WHERE updated>? AND json_extract(data,'$.open')=1 AND json_extract(data,'$.joinable')=1 ORDER BY updated DESC LIMIT ?", now - ROOM_TTL_MS, ROOM_LIST_CAP)
        .toArray().map(row => ({ room: JSON.parse(row.data) as RaceRoomSummary, members: JSON.parse(row.members || '[]') as string[] })).filter(row => (row.room.expiresAt ?? Infinity) > now);
      this.roomsCache = { frame: JSON.stringify({ t: 'rooms', v: rows.map(row => row.room) } satisfies LobbyServerMessage), at: now, rows };
    }
    const hide = this.hidden(viewer);
    if (!hide.size) return this.roomsCache.frame;
    return JSON.stringify({ t: 'rooms', v: this.roomsCache.rows.filter(row => !row.members.some(id => hide.has(id))).map(row => row.room) } satisfies LobbyServerMessage);
  }

  /** A change goes out at once, or with the trailing flush of its 2 s window (a timer, not a billed alarm). */
  private scheduleFlush() {
    const wait = this.lastFlush + FLUSH_MS - Date.now();
    if (wait <= 0) { this.flush(); return; }
    this.flushTimer ??= setTimeout(() => { this.flushTimer = null; this.flush(); }, wait);
  }
  /** Makes sure maintenance runs within five minutes; reads the stored alarm only once per wake. */
  private async ensureAlarm() {
    const target = Date.now() + MAINTENANCE_MS;
    this.alarmAt ??= await this.ctx.storage.getAlarm();
    if (this.alarmAt === null || this.alarmAt > target) { await this.ctx.storage.setAlarm(target); this.alarmAt = target; }
  }

  /** Closes sockets whose sign-in expired or that stopped answering pings. */
  private sweep(now: number) {
    for (const [socket, att] of this.index()) {
      const seen = Math.max(att.activeAt ?? 0, this.ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? 0);
      if ((att.authUntil ?? 0) <= now) this.close(socket, 4002, 'Refresh your sign-in.');
      else if (now - seen >= STALE_MS) this.close(socket, 1011, 'Connection timed out. Reconnect.');
    }
  }

  private flush() {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    this.lastFlush = Date.now();
    this.sweep(this.lastFlush);
    const live = this.index();
    // Longest-present first, so the faces and capped lists stay put (and deduped) across wakes. Shu-Te viewers get
    // the same lists with Shu-Te people first; everyone else sees one shared order.
    const byJoin = (a: Att, b: Att) => (a.j ?? 0) - (b.j ?? 0) || (a.u < b.u ? -1 : a.u > b.u ? 1 : 0);
    const shown = [...live.values()].filter(att => att.show);
    const total = shown.length;
    const views = new Map<string, { visible: Att[]; byLesson: Map<number, Person[]>; countFrame: string; people: Map<number | null, string> }>();
    const view = (school: boolean, legacy: boolean) => {
      const key = `${school ? 'school' : 'all'}${legacy ? '-legacy' : ''}`;
      let built = views.get(key);
      if (built) return built;
      const visible = [...shown].sort((a, b) => (school ? schoolFirst({ s: true }, a, b) : 0) || byJoin(a, b));
      const byLesson = new Map<number, Person[]>();
      const faces: Person[] = [];
      for (const att of visible) {
        const person = this.person(att, legacy);
        if (faces.length < 4) faces.push(person);
        if (att.l !== null) { const group = byLesson.get(att.l); if (group) group.push(person); else byLesson.set(att.l, [person]); }
      }
      const counts: Record<string, LessonCount> = Object.fromEntries([...byLesson].map(([lesson, people]) => [lesson, { n: people.length, f: people.slice(0, 3) }]));
      built = { visible, byLesson, countFrame: JSON.stringify({ t: 'counts', v: counts, n: total, f: faces } satisfies LobbyServerMessage), people: new Map() };
      views.set(key, built);
      return built;
    };
    for (const [socket, att] of live) {
      if (att.on || att.v2 === false) this.send(socket, this.roomsFrame(att.u), 'rooms');
      const { visible, byLesson, countFrame, people } = view(att.s !== false, !att.v3);
      const hide = this.hidden(att.u);
      if (hide.size) {
        // Rare: someone in a block pair gets lists without the other person (counts stay exact).
        const keep = (person: Person) => !hide.has(person.u);
        const own = Object.fromEntries([...byLesson].map(([lesson, group]) => [lesson, { n: group.length, f: group.filter(keep).slice(0, 3) }]));
        this.send(socket, { t: 'counts', v: own, n: total, f: visible.map(other => this.person(other, !att.v3)).filter(keep).slice(0, 4) }, 'counts');
        this.send(socket, { t: 'people', l: att.l, v: att.l === null ? [] : (byLesson.get(att.l) ?? []).filter(keep).slice(0, PEOPLE_CAP) }, 'people');
        continue;
      }
      this.send(socket, countFrame, 'counts');
      let frame = people.get(att.l);
      if (frame === undefined) {
        frame = JSON.stringify({ t: 'people', l: att.l, v: att.l === null ? [] : (byLesson.get(att.l) ?? []).slice(0, PEOPLE_CAP) } satisfies LobbyServerMessage);
        people.set(att.l, frame);
      }
      this.send(socket, frame, 'people');
    }
  }

  async alarm() {
    const now = Date.now();
    this.alarmAt = null;
    // Rebuild from the durable attachments: maintenance never trusts drifted memory.
    this.live = null;
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires<=?', now);
    this.ctx.storage.sql.exec('DELETE FROM rooms WHERE updated<?', now - ROOM_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM chat WHERE ts<?', now - CHAT_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM chat_rate WHERE updated<?', now - CHAT_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM mentions WHERE ts<?', now - CHAT_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM daily WHERE day<?', utcDay(now));
    this.ctx.storage.sql.exec('DELETE FROM reports WHERE ts<? OR id NOT IN (SELECT id FROM reports ORDER BY id DESC LIMIT 1000)', now - 30 * CHAT_TTL_MS);
    this.roomsCache = null;
    this.flush();
    const sockets = this.index().size;
    const hasData = this.ctx.storage.sql.exec('SELECT 1 FROM chat UNION ALL SELECT 1 FROM rooms UNION ALL SELECT 1 FROM reports UNION ALL SELECT 1 FROM mentions UNION ALL SELECT 1 FROM tickets LIMIT 1').toArray().length > 0;
    if (sockets || hasData) {
      const at = now + (sockets ? MAINTENANCE_MS : IDLE_MAINTENANCE_MS);
      await this.ctx.storage.setAlarm(at);
      this.alarmAt = at;
    }
  }
  async webSocketClose(socket: WebSocket) {
    this.forget(socket);
    if (socket.readyState === 2) socket.close(1000, 'Closed.');
    this.scheduleFlush();
  }
  webSocketError(socket: WebSocket) { this.close(socket, 1011, 'Reconnect.'); this.scheduleFlush(); }
}
