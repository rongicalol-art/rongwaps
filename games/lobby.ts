import { DurableObject } from 'cloudflare:workers';
import { CHAT_KEEP, CHAT_TTL_MS, SOCIAL_FRAME_BYTES, nextChatRate, parseLobbyMessage, type ChatRate, type ChatMessage, type LessonCount, type LobbyServerMessage, type Person, type Activity, type MentionNotice } from '../shared/lobby';
import { socialColor, socialImage, type RaceRoomSummary, type SocialColor } from '../shared/quizRace';

type Att = {
  u: string; n: string; c: SocialColor; i?: string; show: boolean; l: number | null; a: Activity | null;
  on: boolean; ch: number | null; cheer: number; inv: number[];
  activeAt: number; tokens: number; updatedAt: number;
  authUntil: number;
};
type ChatRow = { id: number; lesson: number; uid: string; name: string; color: string; text: string; room: string | null; ts: number };
const FLUSH_MS = 2000;
const ROOM_TTL_MS = 35 * 60_000;
const STALE_MS = 90_000;

/** One hibernating lobby for the school beta (150 concurrent users); group once, batch and dedupe snapshots. */
export class Lobby extends DurableObject<Env> {
  private lastFlush = 0;
  private sent = new WeakMap<WebSocket, Map<string, string>>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS tickets (ticket TEXT PRIMARY KEY, uid TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, expires INTEGER NOT NULL, auth_until INTEGER NOT NULL DEFAULT 0)');
    if (!sql.exec<{ name: string }>('PRAGMA table_info(tickets)').toArray().some(column => column.name === 'auth_until')) sql.exec('ALTER TABLE tickets ADD COLUMN auth_until INTEGER NOT NULL DEFAULT 0');
    sql.exec('CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, lesson INTEGER NOT NULL, uid TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, text TEXT NOT NULL, room TEXT, ts INTEGER NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS chat_lesson ON chat (lesson, id)');
    sql.exec('CREATE TABLE IF NOT EXISTS chat_rate (uid TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS mentions (uid TEXT NOT NULL, key TEXT NOT NULL, data TEXT NOT NULL, ts INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(uid,key))');
    sql.exec('CREATE INDEX IF NOT EXISTS mentions_uid ON mentions(uid,ts)');
    sql.exec('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, msg INTEGER NOT NULL, uid TEXT NOT NULL, text TEXT NOT NULL, reporter TEXT NOT NULL, ts INTEGER NOT NULL)');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async issue(uid: string, name: string, color: string, authUntil: number): Promise<{ ticket: string }> {
    const ticket = crypto.randomUUID();
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires <= ?', Date.now());
    this.ctx.storage.sql.exec('INSERT INTO tickets VALUES (?,?,?,?,?,?)', ticket, uid, name, socialColor(color), Math.min(authUntil, Date.now() + 30_000), Math.min(authUntil, Date.now() + 15 * 60_000));
    await this.schedule();
    return { ticket };
  }

  async upsertRoom(summary: RaceRoomSummary, hostUid: string) {
    const existing = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM rooms WHERE code=?', summary.code).toArray()[0];
    const previous = existing ? JSON.parse(existing.data) as RaceRoomSummary : null;
    if (previous && (previous.revision ?? 0) >= (summary.revision ?? 0)) return;
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO rooms VALUES (?,?,?)', summary.code, JSON.stringify(summary), Date.now());
    if (summary.open && summary.players.length && !this.ctx.storage.sql.exec('SELECT id FROM chat WHERE room=? LIMIT 1', summary.code).toArray().length) {
      const lesson = 100 + Number(Object.keys(summary.selection.lessons)[0]);
      this.post({ u: hostUid, n: summary.host, c: socialColor(summary.hostColor), i: summary.hostImage }, lesson, '', summary.code);
    }
    await this.schedule();
  }

  private sockets() { return this.ctx.getWebSockets().filter(socket => socket.readyState === 1); }
  private attachments() { return this.sockets().map(socket => socket.deserializeAttachment() as Att); }
  private send(socket: WebSocket, message: LobbyServerMessage | string, key?: string) {
    const frame = typeof message === 'string' ? message : JSON.stringify(message);
    if (key) {
      let sent = this.sent.get(socket);
      if (!sent) { sent = new Map(); this.sent.set(socket, sent); }
      if (sent.get(key) === frame) return;
      sent.set(key, frame);
    }
    try { socket.send(frame); } catch { socket.close(1011, 'Reconnect.'); }
  }
  private person(att: Att): Person { return { u: att.u, n: att.n, c: att.c, l: att.l, a: att.a, ...(att.i ? { i: att.i } : {}) }; }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Origin') !== this.env.APP_ORIGIN || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Forbidden', { status: 403 });
    const protocols = request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(value => value.trim()) ?? [];
    const ticket = protocols.find(value => value.startsWith('ticket.'))?.slice(7);
    if (!ticket || !protocols.includes('lobby')) return new Response('Sign in again.', { status: 401 });
    const entry = this.ctx.storage.sql.exec<{ uid: string; name: string; color: string; expires: number; auth_until: number }>('SELECT uid,name,color,expires,auth_until FROM tickets WHERE ticket=?', ticket).toArray()[0];
    if (!entry || entry.expires <= Date.now() || entry.auth_until <= Date.now()) return new Response('Sign in again.', { status: 401 });
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE ticket=?', ticket);
    for (const old of this.sockets()) if ((old.deserializeAttachment() as Att).u === entry.uid) old.close(4001, 'Opened in another tab.');
    if (this.sockets().length >= 250) return new Response('Study together is full. Try again shortly.', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    // Hidden until the client's privacy preference arrives; never briefly disclose hidden users.
    const att: Att = { u: entry.uid, n: entry.name, c: socialColor(entry.color), show: false, l: null, a: null, on: false, ch: null, cheer: 0, inv: [], activeAt: Date.now(), updatedAt: Date.now(), tokens: 30, authUntil: entry.auth_until };
    server.serializeAttachment(att);
    this.send(server, { t: 'me', u: att.u });
    this.ctx.waitUntil(this.inbox(att.u).then(v => { if (server.readyState === 1) this.send(server, { t: 'mentions', v }); }).catch(() => {}));
    await this.schedule();
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'lobby' } });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    if (socket.readyState !== 1) return;
    if (typeof raw !== 'string' || raw.length > SOCIAL_FRAME_BYTES || new TextEncoder().encode(raw).byteLength > SOCIAL_FRAME_BYTES) { socket.close(1008, 'Invalid message.'); return; }
    const att = socket.deserializeAttachment() as Att;
    if ((att.authUntil ?? 0) <= Date.now()) { socket.close(4002, 'Refresh your sign-in.'); return; }
    const now = Date.now();
    att.tokens = Math.min(30, (att.tokens ?? 30) + (now - (att.updatedAt ?? now)) / 200);
    att.activeAt = now; att.updatedAt = now;
    if (att.tokens < 1) { socket.close(1008, 'Too many actions.'); return; }
    att.tokens -= 1; socket.serializeAttachment(att);
    let message;
    try { message = parseLobbyMessage(JSON.parse(raw)); } catch { return; }
    if (message.t === 'here') {
      const image = socialImage(message.i, this.env.SUPABASE_URL);
      if (message.l === att.l && message.a === att.a && message.show === att.show && image === att.i) return;
      att.l = message.l; att.a = message.a; att.show = message.show; att.i = image;
      socket.serializeAttachment(att);
      // Clear old lesson people immediately, including when leaving the last lesson.
      this.sent.get(socket)?.delete('people');
      await this.schedule();
    } else if (message.t === 'sub') {
      const chatChanged = message.chat !== att.ch;
      const onlineOpened = message.online && !att.on;
      att.on = message.online; att.ch = message.chat;
      socket.serializeAttachment(att);
      if (chatChanged && att.ch !== null) this.send(socket, { t: 'history', l: att.ch, v: this.history(att.ch, now) });
      if (onlineOpened) this.send(socket, { t: 'online', v: this.online(this.attachments()) }, 'online');
    } else if (message.t === 'say') {
      if (att.ch !== message.l) return;
      const saved = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM chat_rate WHERE uid=?', att.u).toArray()[0];
      const rate = nextChatRate(saved ? JSON.parse(saved.data) as ChatRate : null, message.text, now);
      if (!rate) { this.send(socket, { t: 'error', message: 'Please wait before sending another message.' }); return; }
      this.ctx.storage.sql.exec('INSERT OR REPLACE INTO chat_rate VALUES (?,?,?)', att.u, JSON.stringify(rate), now);
      let recipients: string[] = [];
      if (message.mentions?.length) {
        const eligible = new Set(this.attachments().filter(person => person.show && (message.l === 0 || person.l === message.l)).map(person => person.u));
        for (const row of this.ctx.storage.sql.exec<{ uid: string }>('SELECT DISTINCT uid FROM chat WHERE lesson=? AND ts>=?', message.l, now - CHAT_TTL_MS)) eligible.add(row.uid);
        recipients = message.mentions.filter(id => id !== att.u && eligible.has(id));
      }
      this.post(att, message.l, message.text, null, recipients);
    } else if (message.t === 'cheer') {
      if (now - att.cheer < 3000) return;
      att.cheer = now; socket.serializeAttachment(att);
      const frame = JSON.stringify({ t: 'cheer', from: this.person(att), p: message.p } satisfies LobbyServerMessage);
      const to = new Set(message.to);
      for (const target of this.sockets()) if (to.has((target.deserializeAttachment() as Att).u)) this.send(target, frame);
    } else if (message.t === 'invite') {
      att.inv = att.inv.filter(time => now - time < 60_000);
      if (att.inv.length >= 10) return;
      att.inv.push(now); socket.serializeAttachment(att);
      const room = await this.env.ROOMS.getByName(message.code).invitation(att.u);
      if (socket.readyState !== 1) return;
      if (!room) { this.send(socket, { t: 'error', message: 'This room is full or no longer accepting players.' }); return; }
      const frame = JSON.stringify({ t: 'invite', from: this.person(att), room } satisfies LobbyServerMessage);
      const to = new Set(message.to);
      let delivered = 0;
      for (const target of this.sockets()) if (to.has((target.deserializeAttachment() as Att).u) && target !== socket) { this.send(target, frame); delivered++; }
      if (!delivered) this.send(socket, { t: 'error', message: 'Those classmates are offline. Share your room link instead.' });
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
    }
  }

  private post(att: Pick<Att, 'u' | 'n' | 'c' | 'i'>, lesson: number, text: string, room: string | null, recipients: string[] = []) {
    const now = Date.now();
    const { line, notices } = this.ctx.storage.transactionSync(() => {
      const id = this.ctx.storage.sql.exec<{ id: number }>('INSERT INTO chat (lesson,uid,name,color,text,room,ts) VALUES (?,?,?,?,?,?,?) RETURNING id', lesson, att.u, att.n, att.c, text, room, now).one().id;
      // IDs are global, so pruning is scoped to one channel.
      this.ctx.storage.sql.exec('DELETE FROM chat WHERE lesson=? AND (ts<? OR id NOT IN (SELECT id FROM chat WHERE lesson=? ORDER BY id DESC LIMIT ?))', lesson, now - CHAT_TTL_MS, lesson, CHAT_KEEP);
      const line = this.message({ id, lesson, uid: att.u, name: att.n, color: att.c, text, room, ts: now }, att.i);
      const notices = recipients.map(uid => ({ uid, notice: { key: `l:${id}`, channel: lesson, message: line, read: false } }));
      for (const { uid, notice } of notices) this.saveMention(uid, notice);
      return { line, notices };
    });
    for (const { uid, notice } of notices) this.deliverMention(uid, notice);
    const frame = JSON.stringify({ t: 'msg', m: line } satisfies LobbyServerMessage);
    for (const socket of this.sockets()) if ((socket.deserializeAttachment() as Att).ch === lesson) this.send(socket, frame);
  }

  private async inbox(uid: string): Promise<MentionNotice[]> {
    const notices = this.ctx.storage.sql.exec<{ data: string; read: number }>('SELECT data,read FROM mentions WHERE uid=? AND ts>=? ORDER BY ts DESC LIMIT 30', uid, Date.now() - CHAT_TTL_MS).toArray().map(row => ({ ...JSON.parse(row.data) as MentionNotice, read: !!row.read }));
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
    for (const socket of this.sockets()) if ((socket.deserializeAttachment() as Att).u === uid) this.send(socket, { t: 'mention', v: notice });
  }
  async partyMention(uid: string, notice: MentionNotice) {
    let allowed: boolean;
    try { allowed = !!notice.room && await this.env.ROOMS.getByName(notice.room).canSeeMention(uid); } catch { throw new Error('Could not verify room membership.'); }
    const safe = allowed ? notice : { ...notice, message: { ...notice.message, t: '' } };
    if (this.ctx.storage.transactionSync(() => this.saveMention(uid, safe))) this.deliverMention(uid, safe);
    await this.schedule();
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

  private history(lesson: number, now: number) {
    const images = new Map(this.attachments().filter(att => att.i).map(att => [att.u, att.i!]));
    return this.ctx.storage.sql.exec<ChatRow>('SELECT * FROM chat WHERE lesson=? AND ts>=? ORDER BY id DESC LIMIT ?', lesson, now - CHAT_TTL_MS, CHAT_KEEP)
      .toArray().reverse().map(row => this.message(row, images.get(row.uid))).filter(message => message.t || message.r);
  }
  private online(atts: Att[]) { return atts.filter(att => att.show).map(att => this.person(att)); }
  private rooms(): RaceRoomSummary[] {
    return this.ctx.storage.sql.exec<{ data: string }>("SELECT data FROM rooms WHERE updated>? AND json_extract(data,'$.open')=1 AND json_extract(data,'$.joinable')=1 ORDER BY updated DESC LIMIT 100", Date.now() - ROOM_TTL_MS)
      .toArray().map(row => JSON.parse(row.data) as RaceRoomSummary).filter(room => (room.expiresAt ?? Infinity) > Date.now());
  }

  private async schedule() {
    const now = Date.now();
    let next = this.lastFlush + FLUSH_MS;
    if (now - this.lastFlush >= FLUSH_MS) { this.flush(); next = now + 60_000; }
    const scheduled = await this.ctx.storage.getAlarm();
    if (scheduled === null || next < scheduled) await this.ctx.storage.setAlarm(next);
  }

  private flush() {
    this.lastFlush = Date.now();
    const sockets = this.sockets();
    const atts = sockets.map(socket => socket.deserializeAttachment() as Att);
    const byLesson = new Map<number, Person[]>();
    const online = this.online(atts);
    for (const person of online) if (person.l !== null) {
      const group = byLesson.get(person.l) ?? [];
      group.push(person); byLesson.set(person.l, group);
    }
    const counts: Record<string, LessonCount> = Object.fromEntries([...byLesson].map(([key, people]) => [key, { n: people.length, f: people.slice(0, 3) }]));
    const countFrame = JSON.stringify({ t: 'counts', v: counts, n: online.length, f: online.slice(0, 4) } satisfies LobbyServerMessage);
    const onlineFrame = JSON.stringify({ t: 'online', v: online } satisfies LobbyServerMessage);
    const rooms = JSON.stringify({ t: 'rooms', v: this.rooms() } satisfies LobbyServerMessage);
    const people = new Map<number | null, string>();
    sockets.forEach((socket, index) => {
      const att = atts[index];
      this.send(socket, countFrame, 'counts');
      if (att.on) this.send(socket, onlineFrame, 'online');
      this.send(socket, rooms, 'rooms');
      if (!people.has(att.l)) people.set(att.l, JSON.stringify({ t: 'people', l: att.l, v: att.l === null ? [] : byLesson.get(att.l) ?? [] } satisfies LobbyServerMessage));
      this.send(socket, people.get(att.l)!, 'people');
    });
  }

  async alarm() {
    const now = Date.now();
    for (const socket of this.sockets()) {
      const att = socket.deserializeAttachment() as Att;
      const seen = Math.max(att.activeAt ?? 0, this.ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? 0);
      if ((att.authUntil ?? 0) <= now) socket.close(4002, 'Refresh your sign-in.');
      else if (now - seen >= STALE_MS) socket.close(1011, 'Connection timed out. Reconnect.');
    }
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires<=?', now);
    this.ctx.storage.sql.exec('DELETE FROM rooms WHERE updated<?', now - ROOM_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM chat WHERE ts<?', now - CHAT_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM chat_rate WHERE updated<?', now - CHAT_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM mentions WHERE ts<?', now - CHAT_TTL_MS);
    this.ctx.storage.sql.exec('DELETE FROM reports WHERE ts<? OR id NOT IN (SELECT id FROM reports ORDER BY id DESC LIMIT 1000)', now - 30 * CHAT_TTL_MS);
    this.flush();
    const hasData = this.ctx.storage.sql.exec('SELECT 1 FROM chat UNION ALL SELECT 1 FROM rooms UNION ALL SELECT 1 FROM reports UNION ALL SELECT 1 FROM mentions LIMIT 1').toArray().length > 0;
    if (this.sockets().length || hasData) await this.ctx.storage.setAlarm(now + (this.sockets().length ? 60_000 : 3_600_000));
  }
  async webSocketClose(socket: WebSocket) { if (socket.readyState === 2) socket.close(1000, 'Closed.'); await this.schedule(); }
  webSocketError(socket: WebSocket) { socket.close(1011, 'Reconnect.'); }
}
