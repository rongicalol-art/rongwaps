import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = createClient(url, key);

// Check which tables exist
const tables = ['book_vocab', 'vocabulary', 'flashcards', 'cards', 'words', 'lessons', 'books', 'mnemonics', 'user_profiles', 'user_progress', 'user_card_progress', 'user_folders', 'daily_progress'];

for (const t of tables) {
  try {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (!error) {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
      console.log(`TABLE: ${t} (${count} rows)`);
    }
  } catch (e) {
    // skip
  }
}
