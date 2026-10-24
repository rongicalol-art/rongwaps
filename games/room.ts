import { DurableObject } from 'cloudflare:workers';
import { advanceRace, applyRaceAction, DISCONNECT_GRACE_MS, enterRace, parseRaceAction, socialColor, summarizeRoom, type RaceRoomState, type RaceSnapshot } from '../shared/quizRace';
import { CHAT_KEEP, CHAT_TTL_MS, GLOBAL_CHAT, SOCIAL_FRAME_BYTES, chatText, nextChatRate, type ChatMessage, type ChatRate, type PartyChatServerMessage } from '../shared/lobby';

type Attachment = { userId: string; activeAt: number; tokens: number; updatedAt: number; authUntil: number };
const STALE_MS = 90_000;
const LISTING_RETRY_MS = 5000;
const LISTING_RETENTION_MS = 35 * 60_000; // The Lobby discards older listings even during a prolonged outage.
export const newSeed = () => crypto.randomUUID().slice(0, 8);

/** SQLite owns room rules and reconnect deadlines; socket attachments survive hibernation. */
export class GameRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.initialize();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  private initialize() {
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_chat (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, ts INTEGER NOT NULL)');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_chat_rate (uid TEXT PRIMARY KEY, data TEXT NOT NULL)');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, msg INTEGER NOT NULL, reporter TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(msg,reporter))');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS tickets (ticket TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL, auth_until INTEGER NOT NULL DEFAULT 0)');
    if (!this.ctx.storage.sql.exec<{ name: string }>('PRAGMA table_info(tickets)').toArray().some(column => column.name === 'auth_until')) this.ctx.storage.sql.exec('ALTER TABLE tickets ADD COLUMN auth_until INTEGER NOT NULL DEFAULT 0');
  }

  private read(): RaceRoomState | null {
    const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM state WHERE id=1').toArray()[0];
    if (!row) return null;
    const room = JSON.parse(row.data) as Partial<RaceRoomState>;
    // The previous Worker used this binding for a different game; do not reinterpret those rooms.
    return room.selection?.lessons && Array.isArray(room.selection.types) && Array.isArray(room.players)
      && Number.isSafeInteger(room.round) && ['lobby', 'preparing', 'race', 'review', 'results'].includes(room.phase ?? '') ? room as RaceRoomState : null;
  }

  private record<T>(id: number): T | null {
    const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM state WHERE id=?', id).toArray()[0];
    return row ? JSON.parse(row.data) as T : null;
  }

  private write(id: number, value: unknown) { this.ctx.storage.sql.exec('INSERT OR REPLACE INTO state VALUES (?,?)', id, JSON.stringify(value)); }

  /** These three methods run on limit:<account>. Reservation makes retried creates reuse one room. */
  async reserveCreation(code: string): Promise<string> {
    const now = Date.now();
    const active = this.record<{ code: string; until: number }>(3);
    if (active && active.until > now) return active.code;
    const times = (this.record<number[]>(2) ?? []).filter(time => now - time < 3_600_000);
    if (times.length >= 5) throw new Error('Room limit reached. Try again in an hour.');
    this.write(2, [...times, now]);
    this.write(3, { code, until: now + 30 * 60_000 });
    await this.ctx.storage.setAlarm(now + 3_600_000);
    return code;
  }

  async claimRoom(code: string, until: number): Promise<string | null> {
    const active = this.record<{ code: string; until: number }>(3);
    this.write(3, { code, until });
    await this.ctx.storage.setAlarm(Math.max(until, Date.now() + 3_600_000));
    return active && active.until > Date.now() && active.code !== code ? active.code : null;
  }
  ownsRoom(code: string): boolean { return this.record<{ code: string }>(3)?.code === code; }
  releaseRoom(code: string) { if (this.ownsRoom(code)) this.ctx.storage.sql.exec('DELETE FROM state WHERE id=3'); }
  renewRoom(code: string, until: number) { if (this.ownsRoom(code)) this.write(3, { code, until }); }
  async allowRequest(): Promise<boolean> {
    const now = Date.now();
    const previous = this.record<{ at: number; tokens: number }>(4);
    const tokens = Math.min(30, (previous?.tokens ?? 30) + (now - (previous?.at ?? now)) / 2000);
    if (tokens < 1) return false;
    this.write(4, { at: now, tokens: tokens - 1 });
    if (!await this.ctx.storage.getAlarm()) await this.ctx.storage.setAlarm(now + 3_600_000);
    return true;
  }

  async create(room: RaceRoomState, userId: string, name: string, color: string, image?: string): Promise<boolean> {
    const existing = this.read();
    if (existing) return existing.players.some(player => player.id === userId && !player.left);
    const player = enterRace(room, userId, name, color, Date.now(), image);
    player.disconnectedAt = Date.now();
    this.write(1, room);
    await this.ctx.storage.setAlarm(room.expiresAt);
    return true;
  }

  private sockets() { return this.ctx.getWebSockets().filter(socket => socket.readyState === 1); }
  private connections() { return [...new Set(this.sockets().map(socket => (socket.deserializeAttachment() as Attachment).userId))]; }
  private lastSeen(socket: WebSocket) {
    return Math.max((socket.deserializeAttachment() as Attachment).activeAt ?? 0, this.ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? 0);
  }

  private chatHistory(): ChatMessage[] {
    return this.ctx.storage.sql.exec<{ id: number; data: string }>('SELECT id,data FROM room_chat WHERE ts>=? ORDER BY id DESC LIMIT ?', Date.now() - CHAT_TTL_MS, CHAT_KEEP)
      .toArray().reverse().map(row => ({ ...JSON.parse(row.data) as ChatMessage, id: row.id }));
  }

  private chat(room: RaceRoomState, userId: string, data: Record<string, unknown>, now: number): boolean {
    if (data.type !== 'chat' && data.type !== 'chat-report') return false;
    const player = room.players.find(entry => entry.id === userId && !entry.left);
    if (!player) throw new Error('Join the room first.');
    if (data.type === 'chat-report') {
      if (!Number.isSafeInteger(data.id) || Number(data.id) < 1) throw new Error('Invalid message.');
      const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM room_chat WHERE id=?', Number(data.id)).toArray()[0];
      if (row) this.ctx.storage.sql.exec('INSERT OR IGNORE INTO room_reports (msg,reporter,data) VALUES (?,?,?)', Number(data.id), userId, row.data);
      this.ctx.storage.sql.exec('DELETE FROM room_reports WHERE id NOT IN (SELECT id FROM room_reports ORDER BY id DESC LIMIT 1000)');
      return true;
    }
    const text = chatText(data.text);
    if (!text) throw new Error('Write a message first.');
    const saved = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM room_chat_rate WHERE uid=?', userId).toArray()[0];
    const rate = nextChatRate(saved ? JSON.parse(saved.data) as ChatRate : null, text, now);
    if (!rate) throw new Error('Please wait before sending another message.');
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room_chat_rate VALUES (?,?)', userId, JSON.stringify(rate));
    const line: ChatMessage = { id: 0, l: GLOBAL_CHAT, u: userId, n: player.name, c: socialColor(player.color), t: text, ts: now, ...(player.image ? { i: player.image } : {}) };
    line.id = this.ctx.storage.sql.exec<{ id: number }>('INSERT INTO room_chat (data,ts) VALUES (?,?) RETURNING id', JSON.stringify(line), now).one().id;
    this.ctx.storage.sql.exec('DELETE FROM room_chat WHERE ts<? OR id NOT IN (SELECT id FROM room_chat ORDER BY id DESC LIMIT ?)', now - CHAT_TTL_MS, CHAT_KEEP);
    const frame = JSON.stringify({ type: 'chat-message', code: room.code, message: line } satisfies PartyChatServerMessage);
    const members = new Set(room.players.filter(entry => !entry.left).map(entry => entry.id));
    for (const target of this.sockets()) if (members.has((target.deserializeAttachment() as Attachment).userId)) {
      try { target.send(frame); } catch { target.close(1011, 'Reconnect to restore the room.'); }
    }
    return true;
  }

  private broadcast(room: RaceRoomState) {
    const frame = JSON.stringify({ type: 'state', state: { ...room, serverTime: Date.now(), connected: this.connections() } satisfies RaceSnapshot });
    for (const socket of this.sockets()) {
      try { socket.send(frame); } catch { socket.close(1011, 'Reconnect to restore the room.'); }
    }
  }

  private commit(room: RaceRoomState, listing = true) {
    const previous = listing ? this.read() : null;
    const pendingListing = listing && this.record<number>(5) !== null;
    const announce = room.open && !room.announced && room.players.length > 0;
    if (announce) room.announced = true;
    room.revision = (room.revision ?? 0) + 1;
    this.write(1, room);
    this.broadcast(room);
    // Never-public rooms need no Lobby entry; previously public rooms must still publish closure.
    if (listing && (room.announced || previous?.open || pendingListing)
      && (!previous?.revision || pendingListing
      || JSON.stringify({ ...summarizeRoom(previous), revision: 0 }) !== JSON.stringify({ ...summarizeRoom(room), revision: 0 }))) {
      this.write(5, room.revision);
      const publication = this.publishListing(room);
      this.ctx.waitUntil(publication);
      return publication;
    }
    return Promise.resolve(true);
  }

  /** Persist the pending revision until acknowledged; an evicted room retries from its alarm. */
  private async publishListing(room: RaceRoomState): Promise<boolean> {
    try {
      await this.env.LOBBY.getByName('main').upsertRoom(summarizeRoom(room), room.hostId);
      if ((this.record<number>(5) ?? Infinity) <= (room.revision ?? 0)) this.ctx.storage.sql.exec('DELETE FROM state WHERE id=5');
      return true;
    } catch {
      console.warn(JSON.stringify({ event: 'room_listing_failed', code: room.code }));
      return false;
    }
  }

  /** Detect half-open sockets, preserve a lost seat for one minute, then transfer ownership/remove it. */
  private sweep(room: RaceRoomState, now: number) {
    for (const socket of this.sockets()) {
      if (((socket.deserializeAttachment() as Attachment).authUntil ?? 0) <= now) socket.close(4002, 'Refresh your sign-in.');
      else if (now - this.lastSeen(socket) >= STALE_MS) socket.close(1011, 'Connection timed out. Reconnect.');
    }
    const connected = new Set(this.connections());
    for (const player of room.players) {
      if (player.left) continue;
      if (connected.has(player.id)) player.disconnectedAt = null;
      else player.disconnectedAt ??= now;
    }
    const before = room.players.filter(player => !player.left).map(player => player.id);
    const phaseBefore = room.phase;
    advanceRace(room, now);
    if (phaseBefore === 'race' && room.phase === 'review') {
      for (const player of room.players) if (!player.left) this.ctx.waitUntil(this.env.ROOMS.getByName(`limit:${player.id}`).renewRoom(room.code, room.expiresAt));
    }
    const after = new Set(room.players.filter(player => !player.left).map(player => player.id));
    for (const id of before) if (!after.has(id)) this.ctx.waitUntil(this.env.ROOMS.getByName(`limit:${id}`).releaseRoom(room.code));
  }

  private async schedule(room: RaceRoomState) {
    const times = [room.expiresAt];
    if (this.record<number>(5) !== null) times.push(Date.now() + LISTING_RETRY_MS);
    if (room.phase === 'race') times.push(room.deadline);
    if (room.phase === 'review' && room.reviewDeadline) times.push(room.reviewDeadline);
    if (room.phase === 'preparing' && room.prepareDeadline) times.push(room.prepareDeadline);
    for (const player of room.players) if (!player.left && player.disconnectedAt != null) times.push(player.disconnectedAt + DISCONNECT_GRACE_MS);
    for (const socket of this.sockets()) times.push(this.lastSeen(socket) + STALE_MS, (socket.deserializeAttachment() as Attachment).authUntil ?? 0);
    // Give a server-initiated close handshake time to flush before reclaiming an empty object's storage.
    const next = Math.max(Date.now() + 1000, Math.min(...times));
    const scheduled = await this.ctx.storage.getAlarm();
    // An earlier alarm can recompute the deadline; every answer need not rewrite it.
    if (scheduled === null || next < scheduled) await this.ctx.storage.setAlarm(next);
  }

  async enter(userId: string, name: string, color: string, image: string | undefined, authUntil: number): Promise<{ ticket: string }> {
    const room = this.read();
    if (!room) throw new Error('Room not found. Check the code.');
    this.sweep(room, Date.now());
    const player = enterRace(room, userId, name, color, Date.now(), image);
    if (room.phase === 'preparing') { player.preparedAt = null; player.planHash = undefined; }
    if (!this.connections().includes(userId)) player.disconnectedAt ??= Date.now();
    const ticket = crypto.randomUUID();
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires <= ? OR user_id=?', Date.now(), userId);
    this.ctx.storage.sql.exec('INSERT INTO tickets VALUES (?,?,?,?)', ticket, userId, Math.min(Date.now() + 30_000, authUntil), Math.min(authUntil, Date.now() + 15 * 60_000));
    this.commit(room);
    await this.schedule(room);
    return { ticket };
  }

  /** An invite is valid only while its sender is actually a member of a joinable room. */
  invitation(userId: string) {
    const room = this.read();
    if (!room || Date.now() >= room.expiresAt || !room.players.some(player => player.id === userId && !player.left)) return null;
    const summary = summarizeRoom(room);
    return summary.joinable ? summary : null;
  }

  /** Also used by authenticated HTTP leave and by a newer room taking over the account. */
  async exit(userId: string) {
    const room = this.read();
    if (!room || !room.players.some(player => player.id === userId && !player.left)) return;
    if (Date.now() < room.expiresAt) {
      applyRaceAction(room, userId, { type: 'leave' }, Date.now(), newSeed);
    }
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE user_id=?', userId);
    this.commit(room);
    for (const socket of this.sockets()) if ((socket.deserializeAttachment() as Attachment).userId === userId) socket.close(1000, 'Left room.');
    await this.env.ROOMS.getByName(`limit:${userId}`).releaseRoom(room.code);
    await this.schedule(room);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Origin') !== this.env.APP_ORIGIN || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Forbidden', { status: 403 });
    const protocols = request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(value => value.trim()) ?? [];
    const ticket = protocols.find(value => value.startsWith('ticket.'))?.slice(7);
    const room = this.read();
    if (!ticket || !protocols.includes('quiz-race') || !room || Date.now() >= room.expiresAt) return new Response('Join the room again.', { status: 401 });
    const entry = this.ctx.storage.sql.exec<{ user_id: string; expires: number; auth_until: number }>('SELECT user_id,expires,auth_until FROM tickets WHERE ticket=?', ticket).toArray()[0];
    if (!entry || entry.expires <= Date.now() || entry.auth_until <= Date.now() || !room.players.some(player => player.id === entry.user_id && !player.left)) return new Response('Join the room again.', { status: 401 });
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE ticket=?', ticket);
    const account = this.env.ROOMS.getByName(`limit:${entry.user_id}`);
    const previous = await account.claimRoom(room.code, room.expiresAt);
    if (previous) await this.env.ROOMS.getByName(previous).exit(entry.user_id);
    if (!await account.ownsRoom(room.code)) return new Response('Opened another room.', { status: 409 });
    // RPC awaits allow other events to run: reload before changing authoritative state.
    const current = this.read();
    if (!current || Date.now() >= current.expiresAt) return new Response('Room expired.', { status: 410 });
    this.sweep(current, Date.now());
    const player = current.players.find(value => value.id === entry.user_id && !value.left);
    if (!player) return new Response('You left this room.', { status: 410 });
    for (const old of this.sockets()) if ((old.deserializeAttachment() as Attachment).userId === entry.user_id) old.close(4001, 'Opened in another tab.');
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId: entry.user_id, activeAt: Date.now(), tokens: 20, updatedAt: Date.now(), authUntil: entry.auth_until } satisfies Attachment);
    player.disconnectedAt = null;
    this.commit(current);
    server.send(JSON.stringify({ type: 'chat-history', code: current.code, messages: this.chatHistory() } satisfies PartyChatServerMessage));
    await this.schedule(current);
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'quiz-race' } });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const room = this.read();
    if (!room || Date.now() >= room.expiresAt) { socket.close(4000, 'Room expired.'); return; }
    if (socket.readyState !== 1) return;
    if (typeof message !== 'string' || message.length > SOCIAL_FRAME_BYTES || new TextEncoder().encode(message).byteLength > SOCIAL_FRAME_BYTES) { socket.close(1008, 'Invalid message.'); return; }
    const att = socket.deserializeAttachment() as Attachment;
    if ((att.authUntil ?? 0) <= Date.now()) { socket.close(4002, 'Refresh your sign-in.'); return; }
    const now = Date.now();
    att.tokens = Math.min(20, (att.tokens ?? 20) + (now - (att.updatedAt ?? now)) / 100);
    att.activeAt = now; att.updatedAt = now;
    if (att.tokens < 1) { socket.close(1008, 'Too many actions.'); return; }
    att.tokens -= 1; socket.serializeAttachment(att);
    try {
      const data: unknown = JSON.parse(message);
      if (data && typeof data === 'object' && this.chat(room, att.userId, data as Record<string, unknown>, now)) return;
      const action = parseRaceAction(data);
      if (action.type === 'leave') { await this.exit(att.userId); return; }
      const before = JSON.stringify(room);
      const phase = room.phase;
      this.sweep(room, now);
      applyRaceAction(room, att.userId, action, now, newSeed);
      if (action.type === 'start' || action.type === 'rematch' || (action.type === 'ready' && phase === 'preparing' && room.phase === 'race')) {
        for (const player of room.players) if (!player.left) this.ctx.waitUntil(this.env.ROOMS.getByName(`limit:${player.id}`).renewRoom(room.code, room.expiresAt));
      }
      if (JSON.stringify(room) !== before) {
        this.commit(room, action.type !== 'progress' || phase !== room.phase);
        await this.schedule(room);
      }
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Could not apply that action.' }));
    }
  }

  async webSocketClose(socket: WebSocket) {
    if (socket.readyState === 2) socket.close(1000, 'Closed.');
    const room = this.read();
    if (room) { this.sweep(room, Date.now()); this.commit(room); await this.schedule(room); }
  }
  webSocketError(socket: WebSocket) { socket.close(1011, 'Reconnect to restore the room.'); }

  async alarm() {
    const room = this.read();
    if (!room) {
      const active = this.record<{ until: number }>(3);
      if (active && active.until > Date.now()) { await this.ctx.storage.setAlarm(active.until); return; }
      for (const socket of this.sockets()) socket.close(4000, 'This room closed after an update.');
      await this.ctx.storage.deleteAll(); this.initialize(); return;
    }
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires <= ?', Date.now());
    const before = JSON.stringify(room);
    this.sweep(room, Date.now());
    if (Date.now() >= room.expiresAt) {
      room.open = false;
      room.hostId = '';
      for (const player of room.players) player.left = true;
      const publication = JSON.stringify(room) !== before ? this.commit(room)
        : this.record<number>(5) !== null ? this.publishListing(room) : Promise.resolve(true);
      for (const socket of this.sockets()) socket.close(4000, 'Room closed.');
      await Promise.all(room.players.map(player => this.env.ROOMS.getByName(`limit:${player.id}`).releaseRoom(room.code)));
      if (!await publication && Date.now() - room.expiresAt < LISTING_RETENTION_MS) {
        await this.ctx.storage.setAlarm(Date.now() + LISTING_RETRY_MS); return;
      }
      await this.ctx.storage.deleteAll(); this.initialize(); return;
    }
    if (JSON.stringify(room) !== before) this.commit(room);
    else if (this.record<number>(5) !== null) await this.publishListing(room);
    await this.schedule(room);
  }
}
