import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {}
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  // Pick random IDs from each book
  const samples = [
    'B1L00-1-01', 'B1L05-1-01', 'B1L10-1-10', 'B1L16-3-13',
    'B2L01-1-01', 'B2L06-1-29', 'B2L12-1-01', 'B2L16-2-26',
    'B3L02-1-03', 'B3L05-1-10', 'B3L10-1-01', 'B3L16-1-29',
    'B4L01-1-01', 'B4L03-1-15', 'B4L05-1-01', 'B4L06-2-24',
  ];

  for (const id of samples) {
    const { data } = await supabase.from('mnemonics').select('id, character, mnemonic').eq('id', id);
    if (data && data.length > 0) {
      const r = data[0];
      console.log(`${r.id} (${r.character}): ${r.mnemonic?.substring(0, 100)}`);
    } else {
      console.log(`${id}: NOT FOUND`);
    }
  }
}

main().catch(console.error);
