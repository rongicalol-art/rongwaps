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
  audio?: string | null;
}

export interface DBDictionaryRow {
  id: number;
  traditional: string;
  simplified: string;
  pinyin_accented: string | null;
  pinyin_flat: string | null;
  definitions: string[] | Record<string, string> | null;
  frequency_score?: number | null;
  curriculum_level?: number | null;
}

export interface DBVocabularyRow {
  /** Part of speech tag (e.g. 'N', 'V', 'Vs', 'Adv'). */
  pos?: string | null;
  id: string;
  traditional: string | null;
  simplified: string | null;
  meaning: string | null;
  pinyin: string | null;
  audio: string | null;
  examples: string | null;
}

// Client-side dictionary entry shape (returned by dictionaryService)
export interface DBDictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin: string[] | null;
  definitions: string[] | Record<string, string> | null;
  frequency_score?: number | null;
  curriculum_level?: number | null;
}

// Maps to `mnemonics` table in Supabase
export interface DBMnemonic {
  id: string;
  character: string;
  mnemonic: string;
  content_type: 'character' | 'word';
  created_at: string;
}
