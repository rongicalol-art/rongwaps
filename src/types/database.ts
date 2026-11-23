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

/** A jsonb argument/result as PostgREST serializes it. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** `user_profiles.settings`: the synced preferences (see `CloudMetadataPayload`). */
export type ProfileSettings = { [key: string]: Json | undefined };

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
      /** Challenge links (20261123130000): only create_challenge, challenge_card and accept_challenge_friend touch it. */
      challenges: {
        Row: {
          code: string; sender: string; sender_name: string; sender_color: string; selection: Json;
          correct: number; total: number; run: number[]; friend_adds: number; created_at: string; expires_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** Study together friends: adds go through add_friend/remove_friend (20261119170000). */
      friend_adds: {
        Row: { adder: string; added: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** Private messages between two friends; written only by send_direct_message. */
      direct_messages: {
        Row: { id: number; sender: string; recipient: string; body: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** Each reader's read spot per private conversation (mark_direct_read). */
      direct_reads: {
        Row: { reader: string; other: string; last_id: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** The visit card a learner last shared and when they were last online (save_profile_card). */
      profile_cards: {
        Row: { user_id: string; card: Json | null; last_seen: string | null; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      usernames: {
        Row: { user_id: string; username: string; findable: boolean; chosen_at: string | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_blocks: {
        Row: { blocker: string; blocked: string; blocked_name: string; blocked_color: string; created_at: string };
        Insert: { blocker?: string; blocked: string; blocked_name?: string; blocked_color?: string; created_at?: string };
        Update: { blocker?: string; blocked?: string; blocked_name?: string; blocked_color?: string; created_at?: string };
        Relationships: [];
      };
      user_review_days: {
        Row: { user_id: string; day: string; count: number; first_at: string; last_at: string };
        Insert: { user_id: string; day: string; count: number; first_at: string; last_at: string };
        Update: { user_id?: string; day?: string; count?: number; first_at?: string; last_at?: string };
        Relationships: [];
      };
      user_review_events: {
        Row: { user_id: string; event_id: string; card_id: string; reviewed_at: string; created_at: string; payload: Json };
        Insert: { user_id: string; event_id: string; card_id: string; reviewed_at: string; created_at?: string; payload: Json };
        Update: { user_id?: string; event_id?: string; card_id?: string; reviewed_at?: string; created_at?: string; payload?: Json };
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
          reviewed_at: string | null;
          learned_at: string | null;
          scheduler_state: Json | null;
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
          reviewed_at?: string | null;
          learned_at?: string | null;
          scheduler_state?: Json | null;
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
          reviewed_at?: string | null;
          learned_at?: string | null;
          scheduler_state?: Json | null;
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
          invite_code: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          created_at?: string | null;
          invite_code?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string | null;
          invite_code?: string | null;
        };
        Relationships: [];
      };
      folder_members: {
        Row: { folder_id: string; user_id: string; role: 'owner' | 'editor' | 'viewer'; created_at: string | null };
        Insert: { folder_id: string; user_id: string; role: 'owner' | 'editor' | 'viewer'; created_at?: string | null };
        Update: { folder_id?: string; user_id?: string; role?: 'owner' | 'editor' | 'viewer'; created_at?: string | null };
        Relationships: [{ foreignKeyName: 'folder_members_folder_id_fkey'; columns: ['folder_id']; isOneToOne: false; referencedRelation: 'user_folders'; referencedColumns: ['id'] }];
      };
      user_profiles: {
        Row: {
          id: string;
          settings: ProfileSettings;
          updated_at: string | null;
          progress_reset_at: string | null;
        };
        Insert: {
          id: string;
          settings?: ProfileSettings;
          updated_at?: string | null;
          progress_reset_at?: string | null;
        };
        Update: {
          id?: string;
          settings?: ProfileSettings;
          updated_at?: string | null;
          progress_reset_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      enforce_folder_member_cap: { Args: Record<PropertyKey, never>; Returns: unknown };
      add_folder_owner: { Args: Record<PropertyKey, never>; Returns: unknown };
      protect_folder_owner: { Args: Record<PropertyKey, never>; Returns: unknown };
      protect_flashcard_creator: { Args: Record<PropertyKey, never>; Returns: unknown };
      enforce_folder_card_cap: { Args: Record<PropertyKey, never>; Returns: unknown };

      create_folder_invite: { Args: { p_folder_id: string }; Returns: string };
      set_folder_member_role: { Args: { p_folder_id: string; p_user_id: string; p_role: 'viewer' | 'editor' }; Returns: undefined };
      clear_folder_invite: { Args: { p_folder_id: string }; Returns: undefined };
      get_folder_invite: {
        Args: { p_code: string };
        Returns: { folder_id: string; name: string; color: string; card_count: number; owner_display_name: string | null; member_count: number; already_member: boolean }[];
      };
      join_folder: { Args: { p_code: string }; Returns: string };
      remove_folder_member: { Args: { p_folder_id: string; p_user_id: string }; Returns: undefined };
      list_folder_members: { Args: { p_folder_id: string }; Returns: { user_id: string; role: 'owner' | 'editor' | 'viewer'; display_name: string | null; avatar_color: string | null }[] };

      submit_feedback: {
        Args: { p_id: string; p_message: string; p_path: string; p_browser: string; p_app_version: string };
        Returns: boolean;
      };
      has_beta_access: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_full_course_access: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      require_school_beta_access: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      block_user: { Args: { p_user: string; p_name?: string; p_color?: string }; Returns: boolean };
      report_user: { Args: { p_target: string; p_reason: string; p_place: string; p_message?: string | null }; Returns: boolean };
      friend_people: { Args: Record<PropertyKey, never>; Returns: { user_id: string; name: string; color: string; i_added: boolean; added_me: boolean }[] };
      add_friend: { Args: { p_user: string }; Returns: string };
      /** Challenge links (20261123130000): share a lesson quiz run, read it by code, befriend its sender in one tap. */
      create_challenge: { Args: { p_code: string; p_selection: Json; p_correct: number; p_total: number; p_run: number[] }; Returns: undefined };
      record_lesson_test_answers: { Args: { p_lesson: string; p_answers: Json }; Returns: undefined };
      challenge_card: { Args: { p_code: string }; Returns: Json | null };
      accept_challenge_friend: { Args: { p_code: string }; Returns: string };
      remove_friend: { Args: { p_user: string }; Returns: undefined };
      direct_inbox: { Args: Record<PropertyKey, never>; Returns: { other: string; last_id: number; last_sender: string; last_body: string; last_at: string; unread: number }[] };
      send_direct_message: { Args: { p_to: string; p_body: string }; Returns: { id: number; sender: string; recipient: string; body: string; created_at: string } };
      mark_direct_read: { Args: { p_other: string; p_id: number }; Returns: undefined };
      save_profile_card: { Args: { p_card: Json | null; p_seen: boolean }; Returns: undefined };
      claim_username: { Args: { p_base: string }; Returns: string };
      set_username: { Args: { p_name: string }; Returns: string };
      set_findable: { Args: { p_on: boolean }; Returns: undefined };
      find_classmates: { Args: { p_text: string }; Returns: { user_id: string; username: string; card: Json | null; last_seen: string | null }[] };
      submit_report: { Args: { p_target: string; p_reason: string; p_place: string; p_message?: string | null; p_message_id?: number | null; p_name?: string | null; p_photo?: string | null }; Returns: number };
      /** The caller's own "I'm 18 or older"; returns the first confirmation time. */
      confirm_age: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      append_review_events: { Args: { p_events: Json }; Returns: undefined };
      upsert_card_progress: {
        Args: { p_records: Json };
        Returns: undefined;
      };
      get_sync_state: {
        Args: { p_since?: string | null };
        Returns: Json;
      };
      get_sync_state_recent: {
        Args: { p_since?: string | null; p_recent_days?: number | null };
        Returns: Json;
      };
      reset_user_learning_progress: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      export_my_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      enforce_user_flashcard_cap: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      touch_user_profile_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
  };
}
