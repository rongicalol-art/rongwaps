import { supabase } from './supabaseClient';
import { DailyProgress } from '../types/models';

function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calcStreak(dailyRecords: { date: string }[]): { current: number; longest: number } {
  if (dailyRecords.length === 0) return { current: 0, longest: 0 };

  // Sort descending by date
  const sorted = [...dailyRecords]
    .map(r => r.date)
    .sort()
    .reverse();

  const today = getLocalDateString();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

  // Current streak: must have studied today or yesterday
  let current = 0;
  if (sorted[0] === today || sorted[0] === yesterday) {
    current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + 'T00:00:00');
      const curr = new Date(sorted[i] + 'T00:00:00');
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longest = 1;
  let run = 1;
  const ascSorted = [...dailyRecords].map(r => r.date).sort();
  for (let i = 1; i < ascSorted.length; i++) {
    const prev = new Date(ascSorted[i - 1] + 'T00:00:00');
    const curr = new Date(ascSorted[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      longest = Math.max(longest, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  return { current, longest };
}

export const progressService = {
  // Get today's daily progress for a user
  getTodayProgress: async (userId: string): Promise<DailyProgress> => {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('user_daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('Error fetching today progress:', error);
    }

    if (data) {
      return {
        date: data.date,
        xpEarned: data.xp_earned || 0,
        cardsReviewed: data.cards_reviewed || 0,
        cardsLearned: data.cards_learned || 0,
        studyTimeMinutes: data.study_time_minutes || 0,
        activitiesBreakdown: data.activities_breakdown || {
          flashcards: 0,
          quiz: 0,
          listening: 0,
          writing: 0,
        },
      };
    }

    // Return empty default
    return {
      date: today,
      xpEarned: 0,
      cardsReviewed: 0,
      cardsLearned: 0,
      studyTimeMinutes: 0,
      activitiesBreakdown: {
        flashcards: 0,
        quiz: 0,
        listening: 0,
        writing: 0,
      },
    };
  },

  // Get last N days of progress for a user
  getRecentProgress: async (userId: string, days: number = 30): Promise<DailyProgress[]> => {
    const startDate = getLocalDateString(new Date(Date.now() - days * 86400000));
    const { data, error } = await supabase
      .from('user_daily_progress')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching recent progress:', error);
      return [];
    }

    if (!data) return [];

    return data.map(d => ({
      date: d.date,
      xpEarned: d.xp_earned || 0,
      cardsReviewed: d.cards_reviewed || 0,
      cardsLearned: d.cards_learned || 0,
      studyTimeMinutes: d.study_time_minutes || 0,
      activitiesBreakdown: d.activities_breakdown || {
        flashcards: 0,
        quiz: 0,
        listening: 0,
        writing: 0,
      },
    }));
  },

  // Upsert today's progress using the database stored procedure
  // This is a single RPC call instead of 2 round-trips (SELECT + UPSERT)
  upsertDailyProgress: async (
    userId: string,
    updates: {
      xpEarned?: number;
      cardsReviewed?: number;
      cardsLearned?: number;
      studyTimeMinutes?: number;
      activityType?: 'flashcards' | 'quiz' | 'listening' | 'writing';
      activityCount?: number;
    },
  ): Promise<DailyProgress | null> => {
    try {
      const today = getLocalDateString();

      const { error } = await supabase.rpc('upsert_daily_progress', {
        p_user_id: userId,
        p_date: today,
        p_xp_earned: updates.xpEarned || 0,
        p_cards_reviewed: updates.cardsReviewed || 0,
        p_cards_learned: updates.cardsLearned || 0,
        p_study_time_minutes: updates.studyTimeMinutes || 0,
        p_activity_type: updates.activityType || null,
        p_activity_count: updates.activityCount || 0,
      });

      if (error) {
        console.error('Error upserting daily progress via RPC:', error);
        return null;
      }

      // Fetch the updated record to return
      const { data } = await supabase
        .from('user_daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (!data) return null;

      return {
        date: data.date,
        xpEarned: data.xp_earned || 0,
        cardsReviewed: data.cards_reviewed || 0,
        cardsLearned: data.cards_learned || 0,
        studyTimeMinutes: data.study_time_minutes || 0,
        activitiesBreakdown: data.activities_breakdown || {
          flashcards: 0, quiz: 0, listening: 0, writing: 0,
        },
      };
    } catch (e) {
      console.error('upsertDailyProgress exception:', e);
      return null;
    }
  },

  // Calculate streak from recent history
  calculateStreak: async (userId: string): Promise<{ current: number; longest: number }> => {
    const { data, error } = await supabase
      .from('user_daily_progress')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error calculating streak:', error);
      return { current: 0, longest: 0 };
    }

    return calcStreak(data || []);
  },

  // Get aggregate stats using the database stored procedure
  // Much more efficient than fetching all rows and computing client-side
  getAggregateStats: async (
    userId: string,
    _recentDays: number = 30,
  ): Promise<{
    totalXp: number;
    totalCardsReviewed: number;
    totalCardsLearned: number;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string | null;
  }> => {
    const { data, error } = await supabase.rpc('get_user_aggregate_stats', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching aggregate stats via RPC:', error);
      return {
        totalXp: 0,
        totalCardsReviewed: 0,
        totalCardsLearned: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      };
    }

    if (!data || data.length === 0) {
      return {
        totalXp: 0,
        totalCardsReviewed: 0,
        totalCardsLearned: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      };
    }

    const row = data[0];
    return {
      totalXp: Number(row.total_xp) || 0,
      totalCardsReviewed: Number(row.total_cards_reviewed) || 0,
      totalCardsLearned: Number(row.total_cards_learned) || 0,
      currentStreak: row.current_streak || 0,
      longestStreak: row.longest_streak || 0,
      lastStudyDate: row.last_study_date || null,
    };
  },
};
