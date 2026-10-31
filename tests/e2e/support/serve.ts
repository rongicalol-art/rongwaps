/**
 * Starts the production server (`npm run build` output) for the journeys,
 * pointed at the local Supabase stack. Runs from an empty temp folder so a
 * developer's .env (which may hold hosted keys) can never leak in.
 *
 *   npx tsx tests/e2e/support/serve.ts      (Playwright's webServer runs this)
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { stack } from './stack.ts';

const root = path.resolve(import.meta.dirname, '../../..');
if (!existsSync(path.join(root, 'dist-server/server.js')) || !existsSync(path.join(root, 'dist/index.html'))) {
  throw new Error('Build first: VITE_SUPABASE_URL=<local> VITE_SUPABASE_ANON_KEY=<local> npm run build (see playwright.config.ts)');
}
const cwd = mkdtempSync(path.join(tmpdir(), 'rongwaps-e2e-'));
symlinkSync(path.join(root, 'dist'), path.join(cwd, 'dist'));

const { apiUrl, anonKey } = stack();
const server = spawn(process.execPath, [path.join(root, 'dist-server/server.js')], {
  cwd,
  stdio: 'inherit',
  env: {
    PATH: process.env.PATH,
    NODE_ENV: 'production',
    PORT: process.env.E2E_PORT ?? '4400',
    VITE_SUPABASE_URL: apiUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
  },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
