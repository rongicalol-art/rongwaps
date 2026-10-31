/**
 * The throwaway world the browser journeys run in: a local Supabase stack
 * (every migration applied, the real school gate and RLS) and the production
 * build of the app pointed at it. Never a hosted project, never real learners.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';

export interface Stack {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  dbContainer: string;
}

let cached: Stack | undefined;

/** Reads the running local stack (`supabase start`); E2E_SUPABASE_WORKDIR / _PROJECT pick a scratch copy. */
export function stack(): Stack {
  if (cached) return cached;
  const workdir = process.env.E2E_SUPABASE_WORKDIR;
  const output = execFileSync('supabase', ['status', '-o', 'env', ...(workdir ? ['--workdir', workdir] : [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const env = Object.fromEntries([...output.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]]));
  const apiUrl = env.API_URL;
  if (!apiUrl || !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(apiUrl)) throw new Error(`refusing to run journeys against ${apiUrl ?? 'nothing'}: local stack only`);
  cached = {
    apiUrl,
    anonKey: env.ANON_KEY,
    serviceRoleKey: env.SERVICE_ROLE_KEY,
    // The CLI names it after config.toml's project_id (E2E_SUPABASE_PROJECT for a scratch copy).
    dbContainer: `supabase_db_${process.env.E2E_SUPABASE_PROJECT ?? 'rongwaps'}`,
  };
  return cached;
}

/** SQL as the local superuser, through the container (no host Postgres client needed). */
export function sql(query: string): string {
  return execFileSync('docker', ['exec', '-i', '-e', 'PGPASSWORD=postgres', stack().dbContainer, 'psql', '-h', 'localhost', '-U', 'supabase_admin', '-d', 'postgres', '--no-psqlrc', '-q', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query, encoding: 'utf8' }).trim();
}

export interface Learner {
  id: string;
  email: string;
  password: string;
}

async function admin<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${stack().apiUrl}/auth/v1${path}`, {
    method: 'POST',
    headers: { apikey: stack().serviceRoleKey, Authorization: `Bearer ${stack().serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`auth admin ${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

/**
 * A fake learner. `school: true` adds the verified Google identity the school
 * gate requires (s<digits>@stu.edu.tw, hd = stu.edu.tw), exactly as Google
 * sign-in would; without it the gate must refuse them.
 */
export async function createLearner({ school }: { school: boolean }): Promise<Learner> {
  const email = school ? `s${randomInt(10_000_000, 99_999_999)}@stu.edu.tw` : `outsider-${randomBytes(4).toString('hex')}@example.com`;
  const password = randomBytes(18).toString('base64url');
  const user = await admin<{ id: string }>('/admin/users', { email, password, email_confirm: true });
  if (school) {
    sql(`INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
         VALUES (gen_random_uuid(), '${user.id}', 'google-${user.id}', 'google',
                 jsonb_build_object('sub', 'google-${user.id}', 'email', '${email}', 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw')),
                 now(), now());`);
  }
  return { id: user.id, email, password };
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: { id: string; email: string };
}

/** Signs in with the learner's password (local stack only), as Supabase JS would store it. */
export async function signIn(learner: Learner): Promise<Session> {
  const response = await fetch(`${stack().apiUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: stack().anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: learner.email, password: learner.password }),
  });
  if (!response.ok) throw new Error(`sign-in ${learner.email}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<Session>;
}

/** Supabase JS keeps its session under sb-<first host label>-auth-token. */
export function sessionStorageKey(): string {
  return `sb-${new URL(stack().apiUrl).hostname.split('.')[0]}-auth-token`;
}

/** PostgREST as this learner (what the browser could do with the public key and their token). */
export async function rest(session: Session | null, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${stack().apiUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: stack().anonKey,
      Authorization: `Bearer ${session?.access_token ?? stack().anonKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}
