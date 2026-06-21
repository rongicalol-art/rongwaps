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
      }

      // 2. Fetch legacy row for learned_cards, last_activity, updated_at
      const { data: legacyRow, error: legacyError } = await supabase
        .from('user_progress')
        .select('learned_cards, last_activity, updated_at')
        .eq('user_id', userId)
        .single();

      if (legacyError && legacyError.code !== 'PGRST116') {
        console.error("Error fetching legacy progress:", legacyError);
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
      return null;
    }
  },

  // Save granular card progress to user_card_progress table
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

      // Upsert in batches of 100 to avoid payload limits
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
      if (isUnload && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        // Best-effort beacon for unload — fire and forget
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
};
