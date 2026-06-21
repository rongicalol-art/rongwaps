export interface Flashcard {
  id: string;
  bookId: number;
  lessonId: number;
  front: string;
  back: string;
  pinyin?: string; // or pronunciation
  audio?: string;
  notes?: string;
  examples?: {
    chinese: string;
    pinyin: string;
    english: string;
  }[];
}

export const FLASHCARDS_DATA: Flashcard[] = [
  { id: 'b1l1-1', bookId: 1, lessonId: 1, front: '你好', back: 'Hello', pinyin: 'nǐ hǎo' },
  { id: 'b1l1-2', bookId: 1, lessonId: 1, front: '再见', back: 'Goodbye', pinyin: 'zài jiàn' },
  { id: 'b1l1-3', bookId: 1, lessonId: 1, front: '谢谢', back: 'Thank you', pinyin: 'xiè xiè' },
  { id: 'b1l2-1', bookId: 1, lessonId: 2, front: '一', back: 'One', pinyin: 'yī' },
  { id: 'b1l2-2', bookId: 1, lessonId: 2, front: '二', back: 'Two', pinyin: 'èr' },
  { id: 'b1l2-3', bookId: 1, lessonId: 2, front: '三', back: 'Three', pinyin: 'sān' }
];