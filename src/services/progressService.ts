import { supabase } from './supabaseClient';

function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Daily-progress persistence for signed-in users. The client deliberately
 * stopped earning/tracking XP and streaks (they were removed from the
 * product); only review/learned card counts and study time are meaningful
 * now. The legacy `xp_earned` column is kept server-side and written as 0 so
 * historical rows keep their schema.
 */
export const progressService = {
  // Upsert today's progress using the database stored procedure
  // This is a single RPC call instead of 2 round-trips (SELECT + UPSERT)
  upsertDailyProgress: async (
    userId: string,
    updates: {
      cardsReviewed?: number;
      cardsLearned?: number;
      studyTimeMinutes?: number;
      activityType?: 'flashcards' | 'quiz' | 'listening' | 'writing';
      activityCount?: number;
    },
  ): Promise<void> => {
    try {
      const today = getLocalDateString();

      const { error } = await supabase.rpc('upsert_daily_progress', {
        p_user_id: userId,
        p_date: today,
        p_xp_earned: 0,
        p_cards_reviewed: updates.cardsReviewed || 0,
        p_cards_learned: updates.cardsLearned || 0,
        p_study_time_minutes: updates.studyTimeMinutes || 0,
        p_activity_type: updates.activityType || null,
        p_activity_count: updates.activityCount || 0,
      });

      if (error) {
        console.error('Error upserting daily progress via RPC:', error);
        throw error;
      }
    } catch (e) {
      console.error('upsertDailyProgress exception:', e);
      throw e;
    }
  },
};
