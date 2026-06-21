export interface UserFlashcard {
  id: string; // generate this using crypto.randomUUID()
  folderId?: string; // which custom folder it belongs to
  simplified: string;
  traditional?: string;
  pinyin?: string;
  translation: string;
  notes?: string;
  measure_words?: string[];
  createdAt: number;
  userId: string;
}

export interface UserFolder {
  id: string;
  name: string;
  color: string;
}

export interface UserProgressData {
  srsData: Record<string, any>;
  learnedCards: string[];
  lastActivity: string | null;
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD
  xpEarned: number;
  cardsReviewed: number;
  cardsLearned: number;
  studyTimeMinutes: number;
  activitiesBreakdown: {
    flashcards: number;
    quiz: number;
    listening: number;
    writing: number;
  };
}

export interface ProgressStats {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  totalCardsReviewed: number;
  totalCardsLearned: number;
  todayXp: number;
  todayCardsReviewed: number;
  weekXp: number;
  dailyHistory: DailyProgress[];
  lastStudyDate: string | null;
}

export interface SessionProgress {
  xpEarned: number;
  cardsReviewed: number;
  cardsLearned: number;
  startTime: number;
}

export interface FlashcardBase {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  translation: string;
  audio?: string;
  decomposition?: string;
  composition?: string;
  radicals?: string;
  notes?: string;
  measure_words?: string[];
  // related to curriculum
  curriculum_lesson?: number; 
  curriculum_book?: number;
}

