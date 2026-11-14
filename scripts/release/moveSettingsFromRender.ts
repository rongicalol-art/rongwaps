/**
 * One-time move of the site's settings from Render to where the Cloudflare site reads them. Run by the
 * OWNER on the Mac (it reads live settings); values are copied, never printed or written to disk.
 *
 *   ENV_FILE=.env node scripts/release/moveSettingsFromRender.ts          # or export RENDER_API_KEY first
 *
 * From Render's two services it sets:
 *   GitHub variables (public values the builds use)  PRODUCTION_SUPABASE_ANON_KEY, STAGING_SUPABASE_ANON_KEY,
 *                                                    SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, STAGING_URL
 *   GitHub secret                                    SENTRY_AUTH_TOKEN (source maps)
 *   Worker secrets on rons-mandarin (+ -staging)     RESEND_API_KEY, FEEDBACK_EMAIL_FROM, FEEDBACK_EMAIL_TO, SENTRY_DSN
 *
 * Safe to run again: it only overwrites those names. Worker secrets need the Worker to exist, so they are
 * skipped (and said so) until the first deploy has run; run it once more after that.
 * Needs: gh (signed in), `npx wrangler login`, Node 22+.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO = 'rongicalol-art/rongwaps';
const STAGING_URL = 'https://rons-mandarin-staging.ronm222007.workers.dev';
const WRANGLER = fileURLToPath(new URL('../../node_modules/.bin/wrangler', import.meta.url));

// The key may sit in the file under a slightly different name; only names are ever reported, never values.
let renderNames: string[] = [];
if (process.env.ENV_FILE && !process.env.RENDER_API_KEY) {
  const entries = readFileSync(process.env.ENV_FILE, 'utf8').split('\n')
    .map((line) => /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => [match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')] as const);
  renderNames = entries.filter(([name]) => /render/i.test(name)).map(([name]) => name);
  const found = entries.find(([name, value]) => name === 'RENDER_API_KEY' && value) ?? entries.find(([, value]) => /^rnd_[A-Za-z0-9]{20,}$/.test(value));
  if (found) process.env.RENDER_API_KEY = found[1];
}
const renderKey = process.env.RENDER_API_KEY;
if (!renderKey) {
  console.error([
    'No Render API key found.',
    process.env.ENV_FILE ? `Names mentioning Render in ${process.env.ENV_FILE}: ${renderNames.join(', ') || 'none'}.` : '',
    'Make one at Render → Account Settings → API Keys → Create API Key, then run:',
    '  read -s RENDER_API_KEY && export RENDER_API_KEY && node scripts/release/moveSettingsFromRender.ts',
    '(paste the key and press Enter; nothing shows while you paste).',
  ].filter(Boolean).join('\n'));
  process.exit(1);
}

const gh = (args: string[], input?: string) => execFileSync('gh', [...args, '--repo', REPO], { encoding: 'utf8', input, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'inherit'] }).trim();

async function renderSettings(serviceVariable: string): Promise<Map<string, string>> {
  const service = gh(['variable', 'get', serviceVariable]);
  const response = await fetch(`https://api.render.com/v1/services/${service}/env-vars?limit=100`, { headers: { Authorization: `Bearer ${renderKey}`, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Render answered ${response.status} for ${serviceVariable}`);
  const rows = await response.json() as Array<{ envVar: { key: string; value?: string } }>;
  return new Map(rows.filter((row) => row.envVar.value).map((row) => [row.envVar.key, row.envVar.value!]));
}

const done: string[] = [];
const skipped: string[] = [];
function setVariable(name: string, value: string | undefined) {
  if (!value) { skipped.push(`GitHub variable ${name} (not set on Render)`); return; }
  gh(['variable', 'set', name], value);
  done.push(`GitHub variable ${name}`);
}
function setSecret(name: string, value: string | undefined) {
  if (!value) { skipped.push(`GitHub secret ${name} (not set on Render)`); return; }
  gh(['secret', 'set', name], value);
  done.push(`GitHub secret ${name}`);
}
function workerExists(config: string): boolean {
  return spawnSync(WRANGLER, ['deployments', 'list', '--config', config, '--json'], { stdio: 'ignore' }).status === 0;
}
function setWorkerSecrets(config: string, worker: string, values: Record<string, string | undefined>) {
  const present = Object.fromEntries(Object.entries(values).filter(([, value]) => value)) as Record<string, string>;
  for (const name of Object.keys(values)) if (!present[name]) skipped.push(`${worker} secret ${name} (not set on Render)`);
  if (!Object.keys(present).length) return;
  if (!workerExists(config)) { skipped.push(`${worker} secrets ${Object.keys(present).join(', ')} (the Worker does not exist yet: run this again after its first deploy)`); return; }
  const result = spawnSync(WRANGLER, ['secret', 'bulk', '--config', config], { input: JSON.stringify(present), stdio: ['pipe', 'ignore', 'inherit'] });
  if (result.status !== 0) throw new Error(`wrangler could not save the secrets of ${worker}`);
  done.push(...Object.keys(present).map((name) => `${worker} secret ${name}`));
}

const production = await renderSettings('PRODUCTION_SERVICE_ID');
const staging = await renderSettings('STAGING_SERVICE_ID');
const sentryDsn = production.get('SENTRY_DSN') ?? production.get('VITE_SENTRY_DSN');

setVariable('PRODUCTION_SUPABASE_ANON_KEY', production.get('VITE_SUPABASE_ANON_KEY'));
setVariable('STAGING_SUPABASE_ANON_KEY', staging.get('VITE_SUPABASE_ANON_KEY'));
setVariable('SENTRY_DSN', sentryDsn);
setVariable('SENTRY_ORG', production.get('SENTRY_ORG'));
setVariable('SENTRY_PROJECT', production.get('SENTRY_PROJECT'));
setVariable('STAGING_URL', STAGING_URL);
setSecret('SENTRY_AUTH_TOKEN', production.get('SENTRY_AUTH_TOKEN'));
const email = (from: Map<string, string>) => ({ RESEND_API_KEY: from.get('RESEND_API_KEY'), FEEDBACK_EMAIL_FROM: from.get('FEEDBACK_EMAIL_FROM'), FEEDBACK_EMAIL_TO: from.get('FEEDBACK_EMAIL_TO') });
setWorkerSecrets('server/wrangler.jsonc', 'rons-mandarin', { ...email(production), SENTRY_DSN: sentryDsn });
if ([...Object.values(email(staging))].some(Boolean)) setWorkerSecrets('server/wrangler.staging.jsonc', 'rons-mandarin-staging', email(staging));

// A setting the old server had that nothing above carries over deserves a look, by name only.
const handled = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_AUDIO_BASE_URL', 'VITE_SENTRY_DSN', 'SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN', 'RESEND_API_KEY', 'FEEDBACK_EMAIL_FROM', 'FEEDBACK_EMAIL_TO', 'NODE_ENV', 'NODE_VERSION', 'APP_ENV', 'TRUST_PROXY', 'GAMES_SERVER_URL', 'PORT',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']);
const other = [...new Set([...production.keys(), ...staging.keys()])].filter((name) => !handled.has(name)).sort();

console.log(`Set:\n${done.map((line) => `  ${line}`).join('\n') || '  nothing'}`);
if (skipped.length) console.log(`Skipped:\n${skipped.map((line) => `  ${line}`).join('\n')}`);
if (other.length) console.log(`On Render but not moved (tell Claude if the site needs any of these): ${other.join(', ')}`);
