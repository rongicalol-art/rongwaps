import { supabase } from './supabaseClient';
import { SRSData } from '../utils/srsEngine';
import { planFolderSync } from '../utils/cloudSyncQueue';
import { rowToSrsData, srsDataToUpsert } from '../utils/srsRowMapping';

export interface UserProgressData {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  lastActivity: string | null;
  lastUpdated?: string;
  /**
   * True when the card-progress query returned rows. Lets the caller merge
   * even when the metadata row's updated_at is older — card updates don't
   * touch user_progress.updated_at.
   */
  hasCardDelta?: boolean;
  /**
   * Max last_updated across returned card rows — a server-derived watermark
   * for incremental pulls. Undefined when no rows were returned.
   */
  serverLastUpdated?: string;
}

export const userService = {
  // Fetch user progress from Supabase (card-level rows).
  // Pass { since } to fetch only rows updated at/after that ISO timestamp
  // (bounded incremental pull); omit for a full pull.
  getProgress: async (
    userId: string,
    options?: { since?: string },
  ): Promise<UserProgressData | null> => {
    try {
      // 1. Fetch from user_card_progress (granular table)
      let query = supabase
        .from('user_card_progress')
        .select('card_id, ease, interval, repetitions, next_review_date, learning_step, last_updated')
        .eq('user_id', userId);
      if (options?.since) {
        query = query.gte('last_updated', options.since);
      }

      // 2. Learned cards from the per-card table (source of truth).
      //    Fails soft: before the learned_cards_table migration deploys the
      //    query errors, and the legacy profile array is used instead.
      const learnedRowsQuery = supabase
        .from('user_learned_cards')
        .select('card_id')
        .eq('user_id', userId);

      const [{ data: cardProgress, error: cardError }, learnedRows] = await Promise.all([
        (async () => {
          const { data, error } = await query;
          return { data, error };
        })(),
        (async () => {
          try {
            const { data, error } = await learnedRowsQuery;
            if (error) throw error;
            return (data ?? [])
              .map((row: { card_id: string }) => row.card_id)
              .filter((id: unknown): id is string => typeof id === 'string');
          } catch (e) {
            console.warn('user_learned_cards read failed, using legacy array:', e);
            return null;
          }
        })(),
      ]);

      if (cardError) {
        console.error("Error fetching card progress:", cardError);
        throw cardError;
      }

      // 3. Metadata (last_activity) from the profile row
      const { data: legacyRow, error: legacyError } = await supabase
        .from('user_profiles')
        .select('learned_cards, last_activity, updated_at')
        .eq('id', userId)
        .single();

      if (legacyError && legacyError.code !== 'PGRST116') {
        console.error("Error fetching legacy progress:", legacyError);
        throw legacyError;
      }

      const legacyLearned = Array.isArray(legacyRow?.learned_cards)
        ? (legacyRow?.learned_cards as unknown[]).filter((id): id is string => typeof id === 'string')
        : [];
      // Transitional read: union the table with the legacy array. The RPCs
      // keep both in sync, but a legacy client (or the direct-upsert
      // fallback while the RPC is missing) writes only the array, so the
      // union is correct through the whole rollout. Once every client is
      // upgraded the array can be dropped and this becomes a plain read.
      const learnedCards = learnedRows !== null
        ? Array.from(new Set([...learnedRows, ...legacyLearned]))
        : legacyLearned;

      // Convert card_progress rows back into SRSData map
      const srsData: Record<string, SRSData> = {};
      let serverLastUpdatedMs = 0;
      if (cardProgress) {
        for (const row of cardProgress) {
          const rowTs = row.last_updated ? new Date(row.last_updated).getTime() : 0;
          if (rowTs > serverLastUpdatedMs) serverLastUpdatedMs = rowTs;
          srsData[row.card_id] = rowToSrsData(row);
        }
      }

      return {
        srsData,
        learnedCards,
        lastActivity: legacyRow?.last_activity || null,
        lastUpdated: legacyRow?.updated_at || undefined,
        hasCardDelta: Object.keys(srsData).length > 0,
        serverLastUpdated: serverLastUpdatedMs > 0
          ? new Date(serverLastUpdatedMs).toISOString()
          : undefined,
      };
    } catch (e) {
      console.error("Fetch exception:", e);
      throw e;
    }
  },

  // Save granular card progress to user_card_progress table.
  // Prefers the batch RPC (one round-trip, server fills user_id and
  // last_updated from the JWT); falls back to direct upserts if the RPC
  // is not deployed in the current environment.
  syncCardProgress: async (userId: string, srsData: Record<string, SRSData>) => {
    try {
      const upserts = Object.entries(srsData).map(([card_id, data]) => srsDataToUpsert(data, card_id));
      const rows = upserts.map((upsert) => ({
        user_id: userId,
        ...upsert,
        last_updated: new Date().toISOString(),
      }));

      if (rows.length === 0) return;

      // RPC path, chunked to stay under PostgREST payload limits.
      const rpcBatchSize = 500;
      let rpcOk = true;
      for (let i = 0; i < upserts.length; i += rpcBatchSize) {
        const batch = upserts.slice(i, i + rpcBatchSize);
        const { error: rpcError } = await supabase.rpc('upsert_card_progress', {
          p_records: batch,
        });
        if (rpcError) {
          console.warn('upsert_card_progress RPC failed, falling back to batch upsert:', rpcError);
          rpcOk = false;
          break;
        }
      }
      if (rpcOk) return;

      // Fallback: direct upserts in batches of 100 to avoid payload limits.
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase
          .from('user_card_progress')
          .upsert(batch, { onConflict: 'user_id,card_id'});
        if (error) {
          console.error("Error upserting card progress batch:", error);
          throw error;
        }
      }
    } catch (e) {
      console.error("Card progress sync exception:", e);
      throw e;
    }
  },

  // Full metadata replace (learned_cards, last_activity). The full-replace
  // RPC keeps the per-card table and the legacy array consistent; when it is
  // not deployed yet, the direct profile upsert still works (the table only
  // catches up on the next append or replace RPC).
  syncMetadata: async (
    userId: string,
    data: { learnedCards: string[]; lastActivity: string | null }
  ) => {
    try {
      const { error: rpcError } = await supabase.rpc('replace_learned_cards', {
        p_cards: data.learnedCards,
      });
      if (!rpcError) return;
      console.warn('replace_learned_cards RPC failed, falling back to direct upsert:', rpcError);

      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: userId,
            learned_cards: data.learnedCards,
            last_activity: data.lastActivity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      if (error) {
        console.error("Error upserting learned cards:", error);
        throw error;
      }
    } catch (e) {
      console.error("Metadata sync exception:", e);
      throw e;
    }
  },

  // Delete only learning progress. Saved words, custom folders, and custom cards
  // deliberately remain intact.
  resetLearningProgress: async (): Promise<void> => {
    const { error } = await supabase.rpc('reset_user_learning_progress');
    if (error) {
      console.error('Learning progress reset failed:', error);
      throw error;
    }
  },

  // Append-only learned-card sync via the `append_learned_cards` RPC: new
  // first passes are added server-side without re-uploading the whole
  // array. Returns false when the RPC is not deployed in the current
  // environment so the caller can fall back to the full metadata write.
  appendLearnedCards: async (userId: string, newCardIds: string[]): Promise<boolean> => {
    if (newCardIds.length === 0) return true;
    try {
      const { error } = await supabase.rpc('append_learned_cards', {
        p_cards: newCardIds,
      });
      if (error) {
        console.warn('append_learned_cards RPC failed:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('appendLearnedCards exception:', e);
      return false;
    }
  },

  // Save only last_activity — deliberately does not touch learned_cards, so
  // an activity change never rewrites the (lifetime-growing) learned array.
  syncLastActivity: async (userId: string, lastActivity: string | null) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: userId,
            last_activity: lastActivity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      if (error) {
        console.error('Error syncing last activity:', error);
        throw error;
      }
    } catch (e) {
      console.error('Last-activity sync exception:', e);
      throw e;
    }
  },

  // Due-card ids for the review session, straight from the server so reviews
  // made on other devices count without waiting for the client pull. Returns
  // null when the RPC is unavailable (not deployed / network error) and the
  // caller falls back to the local SRS due filter.
  getDueCardIds: async (): Promise<string[] | null> => {
    try {
      const { data, error } = await supabase.rpc('get_due_card_ids');
      if (error) {
        console.warn('get_due_card_ids RPC failed, using local due filter:', error);
        return null;
      }
      const ids = (data ?? [])
        .map((row: { card_id: string }) => row.card_id)
        .filter((id: unknown): id is string => typeof id === 'string');
      return ids;
    } catch (e) {
      console.warn('getDueCardIds exception:', e);
      return null;
    }
  },

  // Fetch custom folders for a user
  getCustomFolders: async (userId: string): Promise<{ id: string; name: string; color: string }[]> => {
    try {
      const { data, error } = await supabase
        .from('user_folders')
        .select('id, name, color')
        .eq('user_id', userId);

      if (error) {
        console.warn("Failed to fetch user folders:", error.message);
        throw error;
      }
      return data || [];
    } catch (e) {
      console.error("getCustomFolders exception:", e);
      throw e;
    }
  },

  // Sync custom folders for a user. `tombstoneIds` are sticky deletes: a
  // tombstoned folder is never upserted and its server row is deleted, so a
  // stale local list (another tab/device, or a reload between the delete and
  // the debounced save) can never resurrect a deleted folder.
  syncCustomFolders: async (
    userId: string,
    folders: { id: string; name: string; color: string }[],
    tombstoneIds: string[] = [],
  ): Promise<void> => {
    try {
      // Fetch remote ids first so the plan can split upserts from deletions.
      const { data: remoteFolders, error: fetchError } = await supabase
        .from('user_folders')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) {
        console.error("Error fetching remote folders for reconciliation:", fetchError);
        throw fetchError;
      }

      const plan = planFolderSync(
        folders,
        tombstoneIds,
        (remoteFolders || []).map((row: { id: string }) => row.id),
      );

      if (plan.toUpsert.length > 0) {
        const folderRows = plan.toUpsert.map(f => ({
          id: f.id,
          user_id: userId,
          name: f.name,
          color: f.color,
        }));
        const { error } = await supabase
          .from('user_folders')
          .upsert(folderRows, { onConflict: 'id' });

        if (error) {
          console.error("Error upserting custom folders:", error);
          throw error;
        }
      }

      if (plan.toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_folders')
          .delete()
          .in('id', plan.toDelete)
          .eq('user_id', userId);

        if (deleteError) {
          console.error("Error deleting stale folders:", deleteError);
          throw deleteError;
        }
      }
    } catch (e) {
      console.error("syncCustomFolders exception:", e);
      throw e;
    }
  },
};