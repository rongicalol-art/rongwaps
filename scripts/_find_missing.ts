import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
  // Get all B1 vocab IDs
  const { data: allVocab } = await supabase.from('book_vocabulary').select('id').ilike('id', 'B1%');
  const vocabIds = new Set((allVocab || []).map(r => r.id));
  
  // Get all B1 mnemonic IDs
  const { data: allMnems } = await supabase.from('mnemonics').select('id').ilike('id', 'B1%');
  const mnemIds = new Set((allMnems || []).map(r => r.id));
  
  // Find missing
  const missing = [...vocabIds].filter(id => !mnemIds.has(id)).sort();
  console.log('Missing mnemonics:', missing.length);
  for (const id of missing) console.log(id);
}

main().catch(console.error);
