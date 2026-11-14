/**
 * Starts the built site (`npm run build` output) for the journeys, in Cloudflare's local runtime with the
 * live site's own settings (server/wrangler.jsonc), pointed at the local Supabase stack. The server reads
 * only what is passed here: a developer's .env (which may hold hosted keys) is never loaded.
 *
 *   npx tsx tests/e2e/support/serve.ts      (Playwright's webServer runs this)
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { stack } from './stack.ts';

const root = path.resolve(import.meta.dirname, '../../..');
if (!existsSync(path.join(root, 'dist/_headers')) || !existsSync(path.join(root, 'dist/index.html'))) {
  throw new Error('Build first: VITE_SUPABASE_URL=<local> VITE_SUPABASE_ANON_KEY=<local> npm run build (see playwright.config.ts)');
}

const { apiUrl, anonKey } = stack();
const server = spawn(path.join(root, 'node_modules/.bin/wrangler'), [
  'dev', '--config', path.join(root, 'server/wrangler.jsonc'),
  '--ip', '127.0.0.1', '--port', process.env.E2E_PORT ?? '4400',
  '--var', `SUPABASE_URL:${apiUrl}`, '--var', `SUPABASE_ANON_KEY:${anonKey}`,
  '--persist-to', mkdtempSync(path.join(tmpdir(), 'rongwaps-e2e-')), '--log-level', 'warn',
], {
  cwd: root,
  stdio: 'inherit',
  env: { PATH: process.env.PATH, HOME: process.env.HOME, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
