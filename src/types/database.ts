// Maps to `user_progress` table in Supabase (legacy — kept for backwards compat)
export interface DBUserProgress {
  user_id: string;
  srs_data: Record<string, any>;
  learned_cards: string[];
  last_activity: string | null;
  updated_at: string;
}

// Maps to `user_daily_progress` table in Supabase
export interface DBDailyProgress {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  xp_earned: number;
  cards_reviewed: number;
  cards_learned: number;
  study_time_minutes: number;
  activities_breakdown: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Maps to `character_breakdowns_v2` table in Supabase
export interface DBCharacterBreakdown {
  character: string;
  radical: string | null;
  pinyin: string[] | null;
  definition: string | null;
  decomposition: string | null;
  components_historical: string[] | null;
}

// Maps to `global_dictionary` table in Supabase
export interface DBDictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin: string[] | null;
  definitions: Record<string, string> | null;
}

// Maps to `mnemonics` table in Supabase
export interface DBMnemonic {
  id: string;
  character: string;
  mnemonic: string;
  content_type: 'character' | 'word';
  created_at: string;
}
