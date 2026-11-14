import type { Context } from './env';
import { requireUser } from './auth';
import { serveSite } from './content';
import { submitFeedback } from './feedback';
import { gameConfiguration } from './games';
import { submitReport } from './reports';
import { json, securityHeaders } from './respond';

/**
 * The whole backend as one function from request to response. Cloudflare runs it (server/worker.ts);
 * `npm run dev` and the tests call the same function (server/index.ts).
 */
async function route(context: Context, request: Request, url: URL): Promise<Response> {
  const { env } = context;
  const { pathname } = url;
  // Release checks read `commit` to know which build is live.
  if (pathname === '/healthz') {
    return json({ ok: true, commit: env.COMMIT ?? null, env: env.APP_ENV ?? 'development' }, 200, { 'Cache-Control': 'no-store' });
  }
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    if (pathname === '/api/games/config' && request.method === 'GET') return gameConfiguration(env);
    if (pathname === '/api/feedback' && request.method === 'POST') {
      const user = await requireUser(context, request, 'feedback');
      return user instanceof Response ? user : submitFeedback(context, request, user);
    }
    if (pathname === '/api/reports' && request.method === 'POST') {
      const user = await requireUser(context, request, 'report');
      return user instanceof Response ? user : submitReport(context, request, user);
    }
    return json({ error: 'Not found' }, 404);
  }
  return serveSite(context, request, url);
}

export async function handle(request: Request, context: Context): Promise<Response> {
  let response: Response;
  try {
    response = await route(context, request, new URL(request.url));
  } catch (error: unknown) {
    console.error('Unhandled request error:', error);
    context.report(error, 'request');
    response = json({ error: 'Internal server error' }, 500);
  }
  // Responses that came straight from another fetch have read-only headers.
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(context.env))) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers,
    ...(headers.get('content-encoding') === 'br' && response.status === 200 ? { encodeBody: 'manual' } : {}) } as ResponseInit);
}
