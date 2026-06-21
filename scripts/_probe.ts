import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}

const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');

async function main() {
  const { data: vocab } = await supabase.from('book_vocabulary').select('id, traditional, simplified, meaning');
  const { data: mnems } = await supabase.from('mnemonics').select('id');
  const mnemIds = new Set((mnems as any[])?.map(r => r.id) || []);

  const vocabList = (vocab as any[]) || [];

  // Group by book
  const books: Record<string, { total: number; hasMnem: number; missing: any[] }> = {};
  for (const v of vocabList) {
    const match = v.id.match(/^(B\d+)/);
    if (!match) continue;
    const book = match[1];
    if (!books[book]) books[book] = { total: 0, hasMnem: 0, missing: [] };
    books[book].total++;
    if (mnemIds.has(v.id)) {
      books[book].hasMnem++;
    } else {
      books[book].missing.push(v);
    }
  }

  for (const [book, info] of Object.entries(books).sort()) {
    console.log(book + ': ' + info.hasMnem + '/' + info.total + ' have mnemonics, ' + info.missing.length + ' missing');
  }

  // Show first 10 missing from B1
  const b1Missing = books['B1']?.missing || [];
  console.log('\nFirst 10 B1 missing:');
  for (const v of b1Missing.slice(0, 10)) {
    console.log('  ' + v.id + ' | ' + (v.traditional || v.simplified) + ' = ' + v.meaning);
  }
}

main().catch(console.error);
