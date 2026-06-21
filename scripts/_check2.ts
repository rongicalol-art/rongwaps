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

async function main() {
  // Check for duplicate characters in mnemonics table
  const { data } = await supabase.from('mnemonics').select('id, character, content_type');
  const byChar = new Map<string, number>();
  for (const r of (data as any[]) || []) {
    const c = r.character;
    byChar.set(c, (byChar.get(c) || 0) + 1);
  }
  let dupes = 0;
  for (const [c, n] of byChar.entries()) {
    if (n > 1) dupes++;
  }
  console.log('Total mnemonics:', data?.length);
  console.log('Duplicate character entries:', dupes);
  console.log('Unique characters:', byChar.size);

  // Show a few duplicates
  const dupeChars = [...byChar.entries()].filter(([, n]) => n > 1).slice(0, 5);
  console.log('\nSample duplicates:');
  for (const [c, n] of dupeChars) {
    const items = (data as any[])?.filter(r => r.character === c);
    console.log(`  "${c}" (${n} entries):`);
    for (const item of items || []) {
      console.log(`    id: ${item.id} | type: ${item.content_type}`);
    }
  }

  // Check: does .single() fail with duplicates? We might need .limit(1) instead
  console.log('\nTesting lookup for duplicate char...');
  if (dupeChars.length > 0) {
    const testChar = dupeChars[0][0];
    const { data: d2, error: e2 } = await supabase.from('mnemonics').select('mnemonic').eq('character', testChar).single();
    console.log('single() result:', e2 ? 'ERROR: ' + e2.message : 'OK - ' + d2?.mnemonic?.slice(0, 60));
    
    const { data: d3, error: e3 } = await supabase.from('mnemonics').select('mnemonic').eq('character', testChar).limit(1).single();
    console.log('limit(1).single() result:', e3 ? 'ERROR: ' + e3.message : 'OK - ' + d3?.mnemonic?.slice(0, 60));
  }
}

main().catch(console.error);
