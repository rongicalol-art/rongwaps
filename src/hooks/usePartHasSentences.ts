import { useEffect, useState } from 'react';
import { fetchCourseExampleRecords, fetchReadingsPack } from '../services/contentPacks';

/**
 * Whether these parts have sentences (Sentences is offered only then). Book 1 has course-example
 * records; a book without them (Book 3) reads its dialogues (dialogue n = part n) and its words'
 * own examples, so any part with words or a dialogue has some.
 */
export function usePartHasSentences(bookId: number, lessonId: number | null, partIds: number[], hasWords: boolean): boolean {
  const [hasSentences, setHasSentences] = useState(false);
  const partsKey = partIds.join(',');
  useEffect(() => {
    if (lessonId === null) { setHasSentences(false); return undefined; }
    let current = true;
    const parts = new Set(partsKey.split(',').map(Number));
    void Promise.all([fetchCourseExampleRecords(), fetchReadingsPack(bookId)]).then(([records, readings]) => {
      if (!current) return;
      const hasCourseRecords = records.some((r) => r.bookId === bookId);
      setHasSentences(hasCourseRecords
        ? records.some((r) => r.bookId === bookId && r.lessonId === lessonId && parts.has(r.partId))
        : hasWords || Boolean(readings?.some((r) => r.lessonId === lessonId && parts.has(r.dialogueNumber))));
    });
    return () => { current = false; };
  }, [bookId, hasWords, lessonId, partsKey]);
  return hasSentences;
}
