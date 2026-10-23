import { authService } from './authService';
import type { GameAction, GameSnapshot } from '../../shared/wordBomb';

export type { GameAction, GameSnapshot } from '../../shared/wordBomb';
export interface GameConnection {
  send: (action: GameAction) => void;
  close: () => void;
}

export async function getGameConfiguration(): Promise<string | null> {
  const response = await fetch('/api/games/config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load multiplayer configuration.');
  const { url } = await response.json() as { url: string | null };
  return url;
}

/** Authorization stays in HTTPS headers; WebSockets receive only a one-use join ticket. */
export async function connectGame(options: {
  baseUrl: string; code?: string; lesson: number; name: string;
  onState: (state: GameSnapshot, userId: string) => void;
  onStatus: (status: 'connecting' | 'connected' | 'reconnecting' | 'closed') => void;
  onError: (message: string) => void;
}): Promise<GameConnection> {
  let code = options.code;
  let socket: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  const open = async () => {
    if (stopped) return;
    options.onStatus(code ? 'reconnecting' : 'connecting');
    const token = await authService.getAccessToken();
    if (!token) throw new Error('Sign in with your school account to play.');
    const response = await fetch(`${options.baseUrl}/rooms${code ? `/${code}` : ''}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: options.name, lesson: options.lesson }), signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as { code: string; ticket: string; userId: string; error?: string };
    if (!response.ok) throw new Error(result.error || 'Could not join the room.');
    code = result.code;
    if (stopped) return;
    const url = new URL(`/rooms/${code}/socket`, options.baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(url, ['word-bomb', `ticket.${result.ticket}`]);
    socket.onopen = () => { attempts = 0; options.onStatus('connected'); };
    socket.onmessage = event => {
      try {
        const message = JSON.parse(String(event.data)) as { type: string; state?: GameSnapshot; error?: string };
        if (message.type === 'state' && message.state) options.onState(message.state, result.userId);
        if (message.type === 'error') options.onError(message.error || 'Could not apply that action.');
      } catch { options.onError('Invalid room update. Reconnect to try again.'); }
    };
    socket.onclose = event => {
      if (stopped) return;
      if ([1000, 4000, 4001].includes(event.code)) { stopped = true; options.onStatus('closed'); options.onError(event.reason || 'Room closed.'); return; }
      scheduleReconnect();
    };
    socket.onerror = () => { /* onclose owns reconnects; browsers hide handshake failure details. */ };
  };
  const scheduleReconnect = () => {
    if (stopped) return;
    if (++attempts > 6) { options.onStatus('closed'); options.onError('Could not reconnect. Rejoin using your room code.'); return; }
    options.onStatus('reconnecting');
    reconnectTimer = setTimeout(() => { void open().catch(error => { options.onError(error instanceof Error ? error.message : 'Connection unavailable.'); scheduleReconnect(); }); }, Math.min(15_000, 1000 * 2 ** (attempts - 1)));
  };
  await open();
  return {
    send(action) {
      if (socket?.readyState !== WebSocket.OPEN) throw new Error('Wait until the room reconnects.');
      socket.send(JSON.stringify(action));
    },
    close() { stopped = true; clearTimeout(reconnectTimer); socket?.close(1000, 'Left room.'); },
  };
}
