export interface Flashcard {
  id: string;
  bookId: number;
  lessonId: number;
  source?: 'course' | 'dictionary';
  partId?: number;
  front: string;
  back: string;
  /** Raw traditional form as authored (may contain / alternatives and （） optionals). */
  traditional?: string;
  /** Raw simplified form as authored (may contain / alternatives and （） optionals). */
  simplified?: string;
  pinyin?: string; // or pronunciation
  /** Part of speech tag from the vocabulary source (e.g. 'N', 'V', 'Vs'). */
  pos?: string;
  audio?: string;
  notes?: string;
  examples?: {
    chinese: string;
    pinyin: string;
    english: string;
  }[];
}

