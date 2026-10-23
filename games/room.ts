import { DurableObject } from 'cloudflare:workers';
import { advanceGame, applyGameAction, enterGame, gameSnapshot, parseGameAction, type GameRoomState } from '../shared/wordBomb';

type Attachment = { userId: string; watching?: string; lastMessage: number };

/** SQLite is authoritative; hibernation may discard every in-memory field. */
export class GameRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS tickets (ticket TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)');
  }

  private read(): GameRoomState | null {
    const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM state WHERE id=1').toArray()[0];
    return row ? JSON.parse(row.data) as GameRoomState : null;
  }

  private save(room: GameRoomState) {
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO state (id,data) VALUES (1,?)', JSON.stringify(room));
  }

  async create(room: GameRoomState): Promise<boolean> {
    if (this.read()) return false;
    this.save(room);
    await this.ctx.storage.setAlarm(room.expiresAt);
    return true;
  }

  /** Five new rooms per account per hour, independent of ephemeral Worker instances. */
  async allowCreation(): Promise<boolean> {
    const now = Date.now();
    const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM state WHERE id=2').toArray()[0];
    const times = (row ? JSON.parse(row.data) as number[] : []).filter(time => now - time < 3_600_000);
    if (times.length >= 5) return false;
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO state (id,data) VALUES (2,?)', JSON.stringify([...times, now]));
    await this.ctx.storage.setAlarm(now + 3_600_000);
    return true;
  }

  enter(userId: string, name: string): { ticket: string } {
    const room = this.read();
    if (!room) throw new Error('Room not found. Check the code.');
    enterGame(room, userId, name, Date.now());
    this.save(room);
    const ticket = crypto.randomUUID();
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires < ? OR user_id=?', Date.now(), userId);
    this.ctx.storage.sql.exec('INSERT INTO tickets VALUES (?,?,?)', ticket, userId, Date.now() + 30_000);
    return { ticket };
  }

  private connections(): Set<string> {
    return new Set(this.ctx.getWebSockets().filter(socket => socket.readyState === 1)
      .map(socket => (socket.deserializeAttachment() as Attachment).userId));
  }

  private broadcast(room: GameRoomState) {
    const connected = this.connections();
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== 1) continue;
      const attachment = socket.deserializeAttachment() as Attachment;
      if (!room.players.some(player => player.id === attachment.userId)) continue;
      try {
        socket.send(JSON.stringify({ type: 'state', state: gameSnapshot(room, attachment.userId, Date.now(), connected, attachment.watching) }));
      } catch { socket.close(1011, 'Reconnect to restore the room.'); }
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Origin') !== this.env.APP_ORIGIN || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Forbidden', { status: 403 });
    }
    const protocols = request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(value => value.trim()) ?? [];
    const ticket = protocols.find(value => value.startsWith('ticket.'))?.slice(7);
    const room = this.read();
    if (!ticket || !protocols.includes('word-bomb') || !room || Date.now() >= room.expiresAt) return new Response('Join the room again.', { status: 401 });
    const entry = this.ctx.storage.sql.exec<{ user_id: string; expires: number }>('SELECT user_id,expires FROM tickets WHERE ticket=?', ticket).toArray()[0];
    if (!entry || entry.expires < Date.now() || !room.players.some(player => player.id === entry.user_id)) return new Response('Join the room again.', { status: 401 });
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE ticket=?', ticket);
    for (const old of this.ctx.getWebSockets()) {
      if ((old.deserializeAttachment() as Attachment).userId === entry.user_id) old.close(4001, 'Opened in another tab.');
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId: entry.user_id, lastMessage: 0 } satisfies Attachment);
    advanceGame(room, Date.now()); this.save(room); this.broadcast(room);
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'word-bomb' } });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const room = this.read();
    if (!room || Date.now() >= room.expiresAt) { socket.close(4000, 'Room expired.'); return; }
    const attachment = socket.deserializeAttachment() as Attachment;
    if (typeof message !== 'string' || message.length > 2048) { socket.close(1008, 'Invalid message.'); return; }
    // At most 20 actions/second from a connection; answers have stricter game pacing.
    if (Date.now() - attachment.lastMessage < 50) return;
    attachment.lastMessage = Date.now();
    try {
      const action = parseGameAction(JSON.parse(message));
      applyGameAction(room, attachment.userId, action, Date.now(), this.connections());
      if (action.type === 'watch') attachment.watching = action.playerId;
      socket.serializeAttachment(attachment);
      this.save(room);
      if (action.type === 'start') await this.ctx.storage.setAlarm(room.deadline);
      if (action.type === 'rematch') await this.ctx.storage.setAlarm(room.expiresAt);
      if (action.type === 'leave') socket.close(1000, 'Left room.');
      this.broadcast(room);
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Could not apply that action.' }));
      socket.send(JSON.stringify({ type: 'state', state: gameSnapshot(room, attachment.userId, Date.now(), this.connections(), attachment.watching) }));
    }
  }

  webSocketClose() { const room = this.read(); if (room) this.broadcast(room); }
  webSocketError(socket: WebSocket) { socket.close(1011, 'Reconnect to restore the room.'); }

  async alarm() {
    const room = this.read();
    if (!room || Date.now() >= room.expiresAt) {
      for (const socket of this.ctx.getWebSockets()) socket.close(4000, 'Room expired.');
      await this.ctx.storage.deleteAll(); return;
    }
    advanceGame(room, Date.now()); this.save(room); this.broadcast(room);
    await this.ctx.storage.setAlarm(room.expiresAt);
  }
}
