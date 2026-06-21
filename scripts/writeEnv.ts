import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');

function parseExistingEnv(): Record<string, string> {
  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((env, line) => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return env;

      const [, key, rawValue] = match;
      env[key] = rawValue.replace(/^"(.*)"$/, '$1');
      return env;
    }, {});
}

const existingEnv = parseExistingEnv();

function envValue(key: string, fallback = ''): string {
  return process.env[key] || existingEnv[key] || fallback;
}

function formatEnvLine(key: string, fallback = ''): string {
  return `${key}="${envValue(key, fallback)}"`;
}

const envContent = [
  formatEnvLine('GEMINI_API_KEY'),
  formatEnvLine('VITE_SUPABASE_URL'),
  formatEnvLine('VITE_SUPABASE_ANON_KEY'),
  formatEnvLine('OPENROUTER_API_KEY'),
  formatEnvLine('APP_URL', 'none'),
  '',
].join('\n');

writeFileSync(envPath, envContent);
console.log('.env written');
