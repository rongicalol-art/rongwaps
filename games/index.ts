import { newGameRoom, type GameWord } from '../shared/wordBomb';
export { GameRoom } from './room';

const ROOM_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

async function body(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request.');
  let text = ''; let bytes = 0; const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 2048) { await reader.cancel(); throw new Error('Request too large.'); }
    text += decoder.decode(value, { stream: true });
  }
  const value: unknown = JSON.parse(text + decoder.decode());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.');
  return value as Record<string, unknown>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') return Response.json({ ok: true });
    const cors = { 'Access-Control-Allow-Origin': env.APP_ORIGIN, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    const reply = (value: object, status = 200) => Response.json(value, { status, headers: cors });
    if (request.headers.get('Origin') !== env.APP_ORIGIN) return reply({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const match = url.pathname.match(/^\/rooms\/([A-Z2-9]{6})(\/socket)?$/);
    if (match?.[2] && ROOM_CODE.test(match[1])) return env.ROOMS.getByName(match[1]).fetch(request);
    if (request.method !== 'POST' || (url.pathname !== '/rooms' && !match)) return reply({ error: 'Not found.' }, 404);
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) return reply({ error: 'Sign in to play.' }, 401);
    try {
      const data = await body(request);
      const lesson = url.pathname === '/rooms' ? Number(data.lesson) : 0;
      const session = await fetch(`${env.APP_ORIGIN}/api/games/session?lesson=${lesson}`, {
        headers: { Authorization: authorization }, signal: AbortSignal.timeout(10_000), redirect: 'manual',
      });
      if (!session.ok) return reply({ error: 'Could not verify your school account or lesson access.' }, session.status >= 300 && session.status < 400 ? 503 : session.status);
      const identity = await session.json() as { userId: string; lesson: number; words: GameWord[] };
      if (!identity.userId || !Array.isArray(identity.words)) return reply({ error: 'Game service unavailable.' }, 503);
      const name = typeof data.name === 'string' ? data.name.trim().slice(0, 30) : '';
      if (!name) return reply({ error: 'Choose a display name.' }, 400);
      if (url.pathname === '/rooms') {
        if (!await env.ROOMS.getByName(`limit:${identity.userId}`).allowCreation()) return reply({ error: 'Room limit reached. Try again in an hour.' }, 429);
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let attempt = 0; attempt < 3; attempt++) {
          const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), value => alphabet[value % alphabet.length]).join('');
          const stub = env.ROOMS.getByName(code);
          if (await stub.create(newGameRoom(code, identity.lesson, identity.words, Date.now()))) {
            return reply({ code, userId: identity.userId, ...await stub.enter(identity.userId, name) });
          }
        }
        return reply({ error: 'Could not create a room. Try again.' }, 503);
      }
      if (!match || !ROOM_CODE.test(match[1])) return reply({ error: 'Invalid room code.' }, 400);
      return reply({ code: match[1], userId: identity.userId, ...await env.ROOMS.getByName(match[1]).enter(identity.userId, name) });
    } catch {
      return reply({ error: 'Could not join this room. Check the code, room capacity and connection.' }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
