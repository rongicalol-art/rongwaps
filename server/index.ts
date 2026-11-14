import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import dotenv from 'dotenv';
import { handle } from './app';
import type { Context } from './env';

/**
 * `npm run dev`: Vite serves the app and the content packs (no sign-in needed), and the API runs the same
 * code as the deployed server (server/app.ts). The deployed entry point is server/worker.ts; to run the
 * built site exactly as Cloudflare does, use `npm run build && npm start`.
 */
dotenv.config();
const PORT = Number(process.env.PORT) || 3000;

const context: Context = {
  env: {
    APP_ENV: 'development',
    COMMIT: undefined,
    SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    GAMES_SERVER_URL: process.env.GAMES_SERVER_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FEEDBACK_EMAIL_FROM: process.env.FEEDBACK_EMAIL_FROM,
    FEEDBACK_EMAIL_TO: process.env.FEEDBACK_EMAIL_TO,
  },
  report: () => {},
};

async function answer(req: IncomingMessage, res: ServerResponse) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
    method: req.method, headers, ...(hasBody ? { body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } : {}),
  } as RequestInit);
  const response = await handle(request, context);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function bootstrap() {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true, allowedHosts: true }, appType: 'spa' });
  createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (path !== '/healthz' && path !== '/api' && !path.startsWith('/api/')) { vite.middlewares(req, res); return; }
    answer(req, res).catch((error: unknown) => {
      console.error('Unhandled request error:', error);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start the development server:', error);
  process.exit(1);
});
