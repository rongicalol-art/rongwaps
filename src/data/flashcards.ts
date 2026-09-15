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

export const FLASHCARDS_DATA: Flashcard[] = [
  { id: 'b1l1-1', bookId: 1, lessonId: 1, front: '你好', back: 'Hello', pinyin: 'nǐ hǎo', audio: 'B1L01_01.mp3' },
  { id: 'b1l1-2', bookId: 1, lessonId: 1, front: '再见', back: 'Goodbye', pinyin: 'zài jiàn', audio: 'B1L01_02.mp3' },
  { id: 'b1l1-3', bookId: 1, lessonId: 1, front: '谢谢', back: 'Thank you', pinyin: 'xiè xiè', audio: 'B1L01_03.mp3' },
  { id: 'b1l2-1', bookId: 1, lessonId: 2, front: '一', back: 'One', pinyin: 'yī', audio: 'B1L02_01.mp3' },
  { id: 'b1l2-2', bookId: 1, lessonId: 2, front: '二', back: 'Two', pinyin: 'èr', audio: 'B1L02_02.mp3' },
  { id: 'b1l2-3', bookId: 1, lessonId: 2, front: '三', back: 'Three', pinyin: 'sān', audio: 'B1L02_03.mp3' }
];
