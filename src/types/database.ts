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

/**
 * The dictionary columns the entry mapper reads. Selects deliberately omit the
 * numeric `id` (see `DICTIONARY_COLUMNS`), so the mapper must not require it.
 */
export type DBDictionaryEntryRow = Omit<DBDictionaryRow, 'id'>;

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

/** A jsonb argument/result as PostgREST serializes it. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * The `public` schema as the Supabase client sees it, so `.from()`/`.rpc()`
 * results are typed instead of arriving as `any`-fielded rows.
 *
 * Hand-maintained (there is no linked project to run `supabase gen types`
 * against in this repo): `supabase/migrations/*.sql` is the source of truth,
 * `docs/DATABASE_SCHEMA.md` its prose mirror, and `tests/databaseTypes.test.ts`
 * fails when a table or function in the migrations is missing here (or vice
 * versa). Regenerate/refresh by reading the migrations, not by guessing.
 *
 * jsonb columns are narrowed to the shapes this app actually reads and writes
 * (Supabase's documented MergeDeep-style override); `english_tsvector` stays
 * `unknown` because it is a generated tsvector the client never reads.
 *
 * The row interfaces above (`DBDictionaryRow`, `DBVocabularyRow`, …) remain the
 * service/pack-facing subsets and are deliberately *not* aliases of these Row
 * types: packs, shards and column-projected selects legitimately carry fewer
 * columns than the table.
 */
export interface Database {
  public: {
    Tables: {
      book_vocabulary: {
        Row: {
          id: string;
          traditional: string | null;
          simplified: string | null;
          pinyin: string | null;
          pos: string | null;
          meaning: string | null;
          examples: string | null;
          variants: string | null;
          audio: string | null;
          tags: string | null;
        };
        Insert: {
          id: string;
          traditional?: string | null;
          simplified?: string | null;
          pinyin?: string | null;
          pos?: string | null;
          meaning?: string | null;
          examples?: string | null;
          variants?: string | null;
          audio?: string | null;
          tags?: string | null;
        };
        Update: {
          id?: string;
          traditional?: string | null;
          simplified?: string | null;
          pinyin?: string | null;
          pos?: string | null;
          meaning?: string | null;
          examples?: string | null;
          variants?: string | null;
          audio?: string | null;
          tags?: string | null;
        };
        Relationships: [];
      };
      character_breakdowns_v2: {
        Row: {
          character: string;
          radical: string | null;
          pinyin: string[] | null;
          definition: string | null;
          decomposition: string | null;
          components_historical: string[] | null;
        };
        Insert: {
          character: string;
          radical?: string | null;
          pinyin?: string[] | null;
          definition?: string | null;
          decomposition?: string | null;
          components_historical?: string[] | null;
        };
        Update: {
          character?: string;
          radical?: string | null;
          pinyin?: string[] | null;
          definition?: string | null;
          decomposition?: string | null;
          components_historical?: string[] | null;
        };
        Relationships: [];
      };
      dictionary: {
        Row: {
          id: number;
          traditional: string;
          simplified: string;
          pinyin_numbered: string | null;
          pinyin_accented: string | null;
          pinyin_flat: string | null;
          pinyin_syllables: string | null;
          /** jsonb; the table only ever stores the string-map/list forms. */
          definitions: string[] | Record<string, string>;
          /** Generated column — never read by the client. */
          english_tsvector: unknown;
          frequency_score: number | null;
          curriculum_level: number | null;
          is_book_vocab: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          traditional: string;
          simplified: string;
          pinyin_numbered?: string | null;
          pinyin_accented?: string | null;
          pinyin_flat?: string | null;
          pinyin_syllables?: string | null;
          definitions: string[] | Record<string, string>;
          frequency_score?: number | null;
          curriculum_level?: number | null;
          is_book_vocab?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          traditional?: string;
          simplified?: string;
          pinyin_numbered?: string | null;
          pinyin_accented?: string | null;
          pinyin_flat?: string | null;
          pinyin_syllables?: string | null;
          definitions?: string[] | Record<string, string>;
          frequency_score?: number | null;
          curriculum_level?: number | null;
          is_book_vocab?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      mnemonics: {
        Row: {
          id: string;
          character: string;
          mnemonic: string;
          content_type: string;
          created_at: string | null;
        };
        Insert: {
          id: string;
          character: string;
          mnemonic: string;
          content_type?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          character?: string;
          mnemonic?: string;
          content_type?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      user_card_progress: {
        Row: {
          user_id: string;
          card_id: string;
          ease: number;
          interval: number;
          repetitions: number;
          next_review_date: string | null;
          learning_step: number | null;
          last_updated: string | null;
        };
        Insert: {
          user_id: string;
          card_id: string;
          ease?: number;
          interval?: number;
          repetitions?: number;
          next_review_date?: string | null;
          learning_step?: number | null;
          last_updated?: string | null;
        };
        Update: {
          user_id?: string;
          card_id?: string;
          ease?: number;
          interval?: number;
          repetitions?: number;
          next_review_date?: string | null;
          learning_step?: number | null;
          last_updated?: string | null;
        };
        Relationships: [];
      };
      user_daily_progress: {
        Row: {
          user_id: string;
          date: string;
          xp_earned: number;
          cards_reviewed: number;
          cards_learned: number;
          study_time_minutes: number;
          activities_breakdown: Record<string, number>;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          date: string;
          xp_earned?: number;
          cards_reviewed?: number;
          cards_learned?: number;
          study_time_minutes?: number;
          activities_breakdown?: Record<string, number>;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          date?: string;
          xp_earned?: number;
          cards_reviewed?: number;
          cards_learned?: number;
          study_time_minutes?: number;
          activities_breakdown?: Record<string, number>;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_flashcards: {
        Row: {
          id: string;
          user_id: string;
          folder_id: string | null;
          simplified: string;
          traditional: string | null;
          pinyin: string | null;
          translation: string;
          notes: string | null;
          measure_words: string[] | null;
          created_at: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          folder_id?: string | null;
          simplified: string;
          traditional?: string | null;
          pinyin?: string | null;
          translation: string;
          notes?: string | null;
          measure_words?: string[] | null;
          created_at: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          folder_id?: string | null;
          simplified?: string;
          traditional?: string | null;
          pinyin?: string | null;
          translation?: string;
          notes?: string | null;
          measure_words?: string[] | null;
          created_at?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_flashcards_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'user_folders';
            referencedColumns: ['id'];
          },
        ];
      };
      user_folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      user_learned_cards: {
        Row: {
          user_id: string;
          card_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          card_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          card_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          learned_cards: string[];
          last_activity: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          learned_cards?: string[];
          last_activity?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          learned_cards?: string[];
          last_activity?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      search_dictionary: {
        Args: { search_query: string; result_limit?: number };
        Returns: Array<{
          id: number;
          traditional: string;
          simplified: string;
          pinyin_accented: string | null;
          definitions: string[] | Record<string, string> | null;
          match_type: string;
          total_score: number;
        }>;
      };
      upsert_card_progress: {
        Args: { p_records: Json };
        Returns: undefined;
      };
      upsert_daily_progress: {
        Args: {
          p_user_id: string;
          p_date: string;
          p_xp_earned?: number;
          p_cards_reviewed?: number;
          p_cards_learned?: number;
          p_study_time_minutes?: number;
          p_activity_type?: string | null;
          p_activity_count?: number;
        };
        Returns: undefined;
      };
      get_due_card_ids: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{ card_id: string }>;
      };
      append_learned_cards: {
        Args: { p_cards: string[] };
        Returns: undefined;
      };
      replace_learned_cards: {
        Args: { p_cards: string[] };
        Returns: undefined;
      };
      reset_user_learning_progress: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
  };
}
