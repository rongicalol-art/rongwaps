import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}
const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');
console.log('querying book_vocabulary...');
const start = Date.now();
const { data, error } = await supabase.from('book_vocabulary').select('id, traditional, simplified, meaning');
console.log('took', Date.now() - start, 'ms');
if (error) console.log('ERROR:', error.message);
else console.log('Got', data?.length, 'rows');

console.log('\nquerying mnemonics...');
const start2 = Date.now();
const { data: m, error: e2 } = await supabase.from('mnemonics').select('id');
console.log('took', Date.now() - start2, 'ms');
if (e2) console.log('ERROR:', e2.message);
else console.log('Got', m?.length, 'mnemonics');
