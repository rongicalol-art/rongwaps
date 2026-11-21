import { lessonPagePath, type LessonPageRef } from '../../app/routes';
import type { PageMeta } from '../../hooks/usePageMeta';
import { lessonPageData } from './lessonPageData';

export interface LessonPageTitle { en: string; zh: string }

export function lessonPageTitle(ref: LessonPageRef): LessonPageTitle {
  const [en, zh] = lessonPageData(ref).title;
  return { en, zh };
}

/** Search title leads with what people type: the book, the lesson number, "vocabulary". */
export function lessonPageMeta(ref: LessonPageRef): PageMeta {
  const { bookId, lessonId } = ref;
  const { title: [, zh], wordCount, grammar } = lessonPageData(ref);
  // English first, as people search it; the Chinese name follows for those who type it.
  const lead = `Modern Chinese ${bookId} Lesson ${lessonId} (時代華語 第${lessonId}課 ${zh}): all ${wordCount} words with pinyin and English, and ${grammar.length} grammar points.`;
  const close = ' Study it free.';
  return {
    title: `Modern Chinese ${bookId} Lesson ${lessonId} Vocabulary & Grammar · Ron's Mandarin`,
    // A long Chinese title would push the description past what search results show.
    description: lead.length + close.length <= 155 ? lead + close : lead,
    socialDescription: `All ${wordCount} words with pinyin, a tappable conversation and grammar for Modern Chinese ${bookId} Lesson ${lessonId}. Free.`,
    path: lessonPagePath(bookId, lessonId),
  };
}
