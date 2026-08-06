import { supabase } from './supabaseClient';
import { SRSData } from '../utils/srsEngine';

export interface UserProgressData {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  lastActivity: string | null;
  lastUpdated?: string;
}

export const userService = {
  // Fetch user progress from Supabase (card-level rows)
  getProgress: async (userId: string): Promise<UserProgressData | null> => {
    try {
      // 1. Fetch from user_card_progress (granular table)
      const { data: cardProgress, error: cardError } = await supabase
        .from('user_card_progress')
        .select('card_id, ease, interval, repetitions, next_review_date')
        .eq('user_id', userId);

      if (cardError) {
        console.error("Error fetching card progress:", cardError);
        throw cardError;
      }

      // 2. Fetch legacy row for learned_cards, last_activity, updated_at
      const { data: legacyRow, error: legacyError } = await supabase
        .from('user_progress')
        .select('learned_cards, last_activity, updated_at')
        .eq('user_id', userId)
        .single();

      if (legacyError && legacyError.code !== 'PGRST116') {
        console.error("Error fetching legacy progress:", legacyError);
        throw legacyError;
      }

      // Convert card_progress rows back into SRSData map
      const srsData: Record<string, SRSData> = {};
      if (cardProgress) {
        for (const row of cardProgress) {
          const nextReviewMs = row.next_review_date
            ? new Date(row.next_review_date).getTime()
            : Date.now();
          srsData[row.card_id] = {
            cardId: row.card_id,
            efactor: Number(row.ease),
            interval: row.interval,
            repetition: row.repetitions,
            nextReviewDate: nextReviewMs,
          };
        }
      }

      return {
        srsData,
        learnedCards: legacyRow?.learned_cards || [],
        lastActivity: legacyRow?.last_activity || null,
        lastUpdated: legacyRow?.updated_at || undefined,
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
      const rows = Object.entries(srsData).map(([card_id, data]) => ({
        user_id: userId,
        card_id,
        ease: data.efactor,
        interval: data.interval,
        repetitions: data.repetition,
        next_review_date: new Date(data.nextReviewDate).toISOString(),
        last_updated: new Date().toISOString(),
      }));

      if (rows.length === 0) return;

      // RPC path, chunked to stay under PostgREST payload limits.
      const rpcBatchSize = 500;
      let rpcOk = true;
      for (let i = 0; i < rows.length; i += rpcBatchSize) {
        const batch = rows.slice(i, i + rpcBatchSize);
        const { error: rpcError } = await supabase.rpc('upsert_card_progress', {
          p_records: batch.map((row) => ({
            card_id: row.card_id,
            ease: row.ease,
            interval: row.interval,
            repetitions: row.repetitions,
            next_review_date: row.next_review_date,
          })),
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

  // Save metadata (learned_cards, last_activity) to user_progress
  syncMetadata: async (
    userId: string,
    data: { learnedCards: string[]; lastActivity: string | null }
  ) => {
    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            learned_cards: data.learnedCards,
            last_activity: data.lastActivity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (error) {
        console.error("Error syncing metadata:", error);
        throw error;
      }
    } catch (e) {
      console.error("Metadata sync exception:", e);
      throw e;
    }
  },

  // Legacy: full sync (kept for backward compat, delegates to new methods)
  syncProgress: async (
    userId: string,
    progress: Partial<UserProgressData>,
    isUnload: boolean = false
  ) => {
    const promises: Promise<void>[] = [];

    if (progress.srsData) {
      if (isUnload) {
        // Best-effort save during unload — fire and forget
        promises.push(
          userService.syncCardProgress(userId, progress.srsData).catch(() => {})
        );
      } else {
        promises.push(userService.syncCardProgress(userId, progress.srsData));
      }
    }

    if (progress.learnedCards || progress.lastActivity) {
      promises.push(
        userService.syncMetadata(userId, {
          learnedCards: progress.learnedCards || [],
          lastActivity: progress.lastActivity || null,
        })
      );
    }

    await Promise.all(promises);
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

  // Sync custom folders for a user
  syncCustomFolders: async (userId: string, folders: { id: string; name: string; color: string }[]): Promise<void> => {
    try {
      // Upsert current folders so the server matches local state.
      if (folders.length > 0) {
        const folderRows = folders.map(f => ({
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

      // Reconcile deletions: remove server folders that no longer exist locally.
      // This closes the gap where a previous explicit delete failed silently,
      // leaving stale folders on the server that would otherwise resurrect.
      const { data: remoteFolders, error: fetchError } = await supabase
        .from('user_folders')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) {
        console.error("Error fetching remote folders for reconciliation:", fetchError);
        throw fetchError;
      }

      const localIds = new Set(folders.map(f => f.id));
      const staleIds = (remoteFolders || [])
        .map((row: { id: string }) => row.id)
        .filter(id => !localIds.has(id));

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_folders')
          .delete()
          .in('id', staleIds)
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