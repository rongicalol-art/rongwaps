import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
  // Check a few B2 mnemonics for quality
  const { data } = await supabase.from('mnemonics').select('id, character, mnemonic').ilike('id', 'B2%').limit(5);
  for (const r of data || []) {
    const ast = (r.mnemonic?.match(/\*/g) || []).length;
    console.log(r.id, ':', r.character, ':', r.mnemonic?.substring(0, 100), '| *:', ast);
  }
  
  // Count B2 missing
  const { data: allVocab } = await supabase.from('book_vocabulary').select('id').ilike('id', 'B2%');
  const { data: allMnems } = await supabase.from('mnemonics').select('id').ilike('id', 'B2%');
  const vocabIds = new Set((allVocab || []).map(r => r.id));
  const mnemIds = new Set((allMnems || []).map(r => r.id));
  const missing = [...vocabIds].filter(id => !mnemIds.has(id));
  console.log('\nB2 vocab:', vocabIds.size, '| mnemonics:', mnemIds.size, '| missing:', missing.length);
}

main().catch(console.error);
