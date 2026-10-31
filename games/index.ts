import { newRaceRoom, parseSelection, ROOM_CODE, socialColor, socialImage, socialName } from '../shared/quizRace';
import { verifyAccessToken } from './auth';
import { newSeed } from './room';
import { SOCIAL_FRAME_BYTES } from '../shared/lobby';
export { GameRoom } from './room';
export { Lobby } from './lobby';

async function body(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request.');
  let text = ''; let bytes = 0; const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > SOCIAL_FRAME_BYTES) { await reader.cancel(); throw new Error('Request too large.'); }
    text += decoder.decode(value, { stream: true });
  }
  const value: unknown = JSON.parse(text + decoder.decode());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.');
  return value as Record<string, unknown>;
}

/** Readable errors thrown on the create/join path (room.ts, shared/quizRace.ts); anything else stays server-side. */
const ROOM_LIMIT_ERROR = 'Room limit reached. Try again in an hour.';
const JOIN_ERRORS = new Set([
  ROOM_LIMIT_ERROR,
  'Room not found. Check the code.',
  'This room has expired.',
  'The host removed you from this room.',
  'This round is already underway. Rejoin after the room is ready for another round.',
  'This race has already started.',
  'This room is full.',
  'Pick at least one lesson part.',
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') return Response.json({ ok: true });
    const cors = { 'Access-Control-Allow-Origin': env.APP_ORIGIN, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    const reply = (value: object, status = 200) => Response.json(value, { status, headers: cors });
    if (request.headers.get('Origin') !== env.APP_ORIGIN) return reply({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/lobby/socket') return env.LOBBY.getByName('main').fetch(request);
    const match = url.pathname.match(/^\/rooms\/([A-Z2-9]{6})(\/(?:socket|leave))?$/);
    if (match?.[2] === '/socket' && ROOM_CODE.test(match[1])) return env.ROOMS.getByName(match[1]).fetch(request);
    if (request.method !== 'POST' || (url.pathname !== '/rooms' && url.pathname !== '/lobby' && !match)) return reply({ error: 'Not found.' }, 404);
    let auth: Awaited<ReturnType<typeof verifyAccessToken>>;
    try { auth = await verifyAccessToken(request.headers.get('Authorization'), env.SUPABASE_URL); }
    catch { return reply({ error: 'Sign-in verification is unavailable. Try again shortly.' }, 503); }
    if (!auth) return reply({ error: 'Sign in with your school account.' }, 401);
    const { userId, expiresAt } = auth;
    try {
      if (!await env.ROOMS.getByName(`limit:${userId}`).allowRequest()) return reply({ error: 'Too many connection requests. Try again shortly.' }, 429);
      if (match?.[2] === '/leave' && ROOM_CODE.test(match[1])) {
        await env.ROOMS.getByName(match[1]).exit(userId);
        return reply({ ok: true });
      }
      const data = await body(request);
      const name = socialName(data.name);
      const color = socialColor(data.color);
      const image = socialImage(data.image, env.SUPABASE_URL);
      if (!name) return reply({ error: 'Add a display name in your profile first.' }, 400);
      if (url.pathname === '/lobby') return reply({ userId, ...await env.LOBBY.getByName('main').issue(userId, name, color, expiresAt) });
      if (url.pathname === '/rooms') {
        const selection = parseSelection(data.selection);
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const account = env.ROOMS.getByName(`limit:${userId}`);
        for (let attempt = 0; attempt < 3; attempt++) {
          const candidate = Array.from(crypto.getRandomValues(new Uint8Array(6)), value => alphabet[value % alphabet.length]).join('');
          const code = await account.reserveCreation(candidate);
          const stub = env.ROOMS.getByName(code);
          if (await stub.create(newRaceRoom(code, selection, data.open === true, newSeed(), Date.now()), userId, name, color, image)) {
            return reply({ code, userId, ...await stub.enter(userId, name, color, image, expiresAt) });
          }
          await account.releaseRoom(code);
        }
        return reply({ error: 'Could not create a room. Try again.' }, 503);
      }
      if (!match || !ROOM_CODE.test(match[1])) return reply({ error: 'Invalid room code.' }, 400);
      return reply({ code: match[1], userId, ...await env.ROOMS.getByName(match[1]).enter(userId, name, color, image, expiresAt) });
    } catch (error) {
      const message = error instanceof Error && JOIN_ERRORS.has(error.message) ? error.message : null;
      if (!message) console.error('games: join failed', error);
      return reply({ error: message ?? 'Could not join. Check the code and your connection.' }, message === ROOM_LIMIT_ERROR ? 429 : 400);
    }
  },
} satisfies ExportedHandler<Env>;
