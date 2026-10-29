import { authService } from './authService';
import { SOCIAL_FRAME_BYTES, type LobbyClientMessage, type LobbyServerMessage, type PartyChatClientMessage, type PartyChatServerMessage } from '../../shared/lobby';
import type { RaceFrame, RaceSelection, RaceSnapshot } from '../../shared/quizRace';

export type SocialStatus = 'off' | 'connecting' | 'live' | 'reconnecting';
export interface Identity { name: string; color: string; image?: string }
interface Socket<T> { send: (message: T) => boolean | void; close: () => void }
class ConnectionError extends Error { constructor(message: string, readonly status: number) { super(message); } }

let origin: Promise<string | null> | null = null;
export function getGamesOrigin(): Promise<string | null> {
  origin ??= fetch('/api/games/config', { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    .then(async response => {
      if (!response.ok) throw new Error('Configuration unavailable.');
      const body = await response.json() as { url: string | null };
      return body.url;
    }).catch((error: unknown) => { origin = null; throw error; });
  return origin;
}

async function request(path: string, body: object, signal?: AbortSignal): Promise<{ ticket?: string; userId?: string; code?: string }> {
  const base = await getGamesOrigin();
  if (!base) throw new ConnectionError('Study together is not available right now.', 404);
  const token = await authService.getAccessToken();
  if (!token) throw new ConnectionError('Sign in with your school account.', 401);
  signal?.throwIfAborted();
  const response = await fetch(`${base}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as { ticket?: string; userId?: string; code?: string; error?: string };
  if (!response.ok) throw new ConnectionError(result.error || 'Could not connect.', response.status);
  return result;
}

async function ticket(path: string, body: object, signal?: AbortSignal): Promise<{ ticket: string; userId: string; code?: string }> {
  const result = await request(path, body, signal);
  if (!result.ticket || !result.userId) throw new Error('Invalid connection ticket.');
  return { ...result, ticket: result.ticket, userId: result.userId };
}

/** Bounded backoff with jitter; keep trying outages, stop on permanent failures, cancel every pending callback. */
function reconnecting<In, Out>(options: {
  path: () => string; protocol: string; issue: (signal: AbortSignal) => Promise<{ ticket: string; userId: string }>;
  onMessage: (message: In) => void; onStatus: (status: SocialStatus) => void; onOpen?: (userId: string) => void;
  onError?: (message: string) => void; fatal: number[];
}): Socket<Out> {
  let socket: WebSocket | null = null;
  let stopped = false;
  let attempts = 0;
  let opening = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
  const abort = new AbortController();
  const clear = () => { clearTimeout(timer); clearTimeout(watchdog); clearInterval(ping); };
  const stop = () => {
    if (stopped) return;
    stopped = true; clear(); abort.abort();
    window.removeEventListener('online', wake);
    document.removeEventListener('visibilitychange', wake);
    socket?.close(1000, 'Bye.'); options.onStatus('off');
  };
  const retry = () => {
    if (stopped) return;
    clearTimeout(timer);
    options.onStatus('reconnecting');
    const ms = Math.min(15_000, 1000 * 2 ** Math.min(attempts++, 4)) * (0.8 + Math.random() * 0.4);
    timer = setTimeout(() => { void open(); }, ms);
  };
  const open = async () => {
    if (stopped || opening || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    opening = true;
    try {
      const { ticket: value, userId } = await options.issue(abort.signal);
      const base = await getGamesOrigin();
      if (stopped || !base) return;
      const url = new URL(options.path(), base);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const next = new WebSocket(url, [options.protocol, `ticket.${value}`]);
      socket = next;
      let lastMessage = Date.now();
      watchdog = setTimeout(() => next.close(4002, 'Connection timed out.'), 10_000);
      next.onopen = () => {
        if (stopped || socket !== next) { next.close(); return; }
        clearTimeout(watchdog);
        options.onStatus('live'); options.onOpen?.(userId);
        ping = setInterval(() => {
          if (Date.now() - lastMessage > 75_000) { next.close(4002, 'Connection timed out.'); return; }
          try { if (next.readyState === WebSocket.OPEN) next.send('ping'); } catch { next.close(); }
        }, 25_000);
      };
      next.onmessage = event => {
        if (stopped || socket !== next) return;
        lastMessage = Date.now(); attempts = 0;
        if (event.data === 'pong') return;
        if (typeof event.data !== 'string' || event.data.length > 1_048_576) { next.close(1008, 'Invalid message.'); return; }
        let message: In;
        try { message = JSON.parse(String(event.data)) as In; } catch { return; }
        options.onMessage(message);
      };
      next.onclose = event => {
        if (stopped || socket !== next) return;
        clearTimeout(watchdog); clearInterval(ping); socket = null;
        if (options.fatal.includes(event.code)) { options.onError?.(event.reason || 'Connection closed.'); stop(); return; }
        retry();
      };
    } catch (error) {
      if (stopped) return;
      if (error instanceof ConnectionError && [400, 401, 403, 404, 409, 410].includes(error.status)) {
        options.onError?.(error.message); stop(); return;
      }
      retry();
    } finally { opening = false; }
  };
  const wake = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); void open(); } };
  window.addEventListener('online', wake);
  document.addEventListener('visibilitychange', wake);
  options.onStatus('connecting'); void open();
  return {
    send(message) {
      if (stopped || socket?.readyState !== WebSocket.OPEN) return false;
      const frame = JSON.stringify(message);
      if (new TextEncoder().encode(frame).byteLength > SOCIAL_FRAME_BYTES) return false;
      // A rejected final progress frame may have no later event to retry it. Reconnect and replay current state.
      if (socket.bufferedAmount > 65_536) { socket.close(4002, 'Connection is congested.'); return false; }
      try { socket.send(frame); return true; } catch { socket.close(); return false; }
    },
    close: stop,
  };
}

export function connectLobby(identity: Identity, handlers: {
  onMessage: (message: LobbyServerMessage) => void; onStatus: (status: SocialStatus) => void; onOpen: () => void;
}): Socket<LobbyClientMessage> {
  return reconnecting<LobbyServerMessage, LobbyClientMessage>({
    path: () => '/lobby/socket', protocol: 'lobby', issue: signal => ticket('/lobby', { name: identity.name, color: identity.color }, signal), fatal: [4001, 1008], ...handlers,
  });
}

/** Idempotent authenticated fallback: leaving works even if the WebSocket closed before the leave frame arrived. */
export async function leaveRaceRoom(code: string) { await request(`/rooms/${code}/leave`, {}); }

export async function connectRace(identity: Identity, target: { code: string } | { selection: RaceSelection; open: boolean }, handlers: {
  onState: (state: RaceSnapshot, userId: string) => void; onStatus: (status: SocialStatus) => void; onError: (message: string) => void;
  onChat?: (message: PartyChatServerMessage) => void;
}, signal?: AbortSignal): Promise<Socket<RaceFrame | PartyChatClientMessage> & { code: string }> {
  let code = 'code' in target ? target.code : '';
  let userId = '';
  const first = await ticket(code ? `/rooms/${code}` : '/rooms', { ...identity, ...('code' in target ? {} : target) }, signal);
  code = first.code || code;
  let firstUsed = false;
  const socket = reconnecting<PartyChatServerMessage | { type: 'state'; state: RaceSnapshot } | { type: 'error'; error: string }, RaceFrame | PartyChatClientMessage>({
    path: () => `/rooms/${code}/socket`, protocol: 'quiz-race',
    issue: async abort => {
      if (!firstUsed) { firstUsed = true; return first; }
      return ticket(`/rooms/${code}`, identity, abort);
    },
    onOpen: id => { userId = id; },
    onMessage: message => {
      if (message.type === 'state' && message.state) handlers.onState(message.state, userId || first.userId);
      if (message.type === 'error' && message.error) handlers.onError(message.error);
      if (message.type === 'chat-history' || message.type === 'chat-message') handlers.onChat?.(message);
    },
    onStatus: handlers.onStatus, onError: handlers.onError, fatal: [1000, 4000, 4001, 4003, 1008],
  });
  if (signal?.aborted) socket.close();
  return { ...socket, code };
}
