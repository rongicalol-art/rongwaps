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
  // 1. Total mnemonics
  const { data: all, count } = await supabase.from('mnemonics').select('*', { count: 'exact' });
  console.log('Total mnemonics in DB:', count);

  // 2. Sample 5
  const { data: sample } = await supabase.from('mnemonics').select('*').limit(5);
  console.log('\nSample rows:');
  for (const r of (sample as any[]) || []) {
    console.log('  id:', r.id, '| char:', r.character, '| type:', r.content_type);
    console.log('    mnemonic:', r.mnemonic?.slice(0, 80));
  }

  // 3. How many are keyed by vocab ID format (B\d+L\d+)
  const vocabFormat = (all as any[])?.filter(r => /^(B\d+L\d+)/.test(r.id)).length;
  console.log('\nKeyed by vocab ID format:', vocabFormat);

  // 4. How many are keyed by plain character/word text
  const textFormat = (all as any[])?.filter(r => !/^(B\d+L\d+)/.test(r.id)).length;
  console.log('Keyed by plain text:', textFormat);

  // 5. Show some plain-text keys
  const textKeys = (all as any[])?.filter(r => !/^(B\d+L\d+)/.test(r.id)).slice(0, 10);
  console.log('\nSample plain-text keys:');
  for (const r of textKeys || []) {
    console.log('  id:', r.id, '| type:', r.content_type, '|', r.mnemonic?.slice(0, 60));
  }

  // 6. Check if frontend lookup uses id or character field
  // The frontend probably looks up by vocab id (like B1L01-3-04)
  const { data: bv } = await supabase.from('book_vocabulary').select('id, traditional, simplified').limit(5);
  console.log('\nSample vocab IDs:');
  for (const r of (bv as any[]) || []) {
    console.log('  ', r.id, '=', r.traditional);
    // Check if mnemonic exists with this id
    const { data: m1 } = await supabase.from('mnemonics').select('id, mnemonic').eq('id', r.id).limit(1);
    if (m1 && m1.length > 0) {
      console.log('    FOUND by id:', (m1[0] as any).mnemonic?.slice(0, 60));
    } else {
      // Check by character text
      const { data: m2 } = await supabase.from('mnemonics').select('id, mnemonic').eq('character', r.traditional).limit(1);
      if (m2 && m2.length > 0) {
        console.log('    FOUND by character:', (m2[0] as any).mnemonic?.slice(0, 60));
      } else {
        console.log('    NOT FOUND');
      }
    }
  }
}

main().catch(console.error);
