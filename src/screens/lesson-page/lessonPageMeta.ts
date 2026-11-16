import { lessonPagePath } from '../../app/routes';
import { SAMPLE_LESSONS } from '../../data/books';
import type { PageMeta } from '../../hooks/usePageMeta';
import { LESSON_PAGES } from './lessonPageData';

export interface LessonPageTitle { en: string; zh: string }

export function lessonPageTitle(lessonId: number): LessonPageTitle {
  const [en, zh = ''] = (SAMPLE_LESSONS.find((lesson) => lesson.id === lessonId)?.title ?? '').split(' · ');
  return { en, zh };
}

/** Search title leads with what people type: the book, the lesson number, "vocabulary". */
export function lessonPageMeta(lessonId: number): PageMeta {
  const { zh } = lessonPageTitle(lessonId);
  const { wordCount, grammar } = LESSON_PAGES[lessonId];
  const description = `時代華語 1 第${lessonId}課 ${zh}: hear the words, tap through a short conversation and see the ${grammar.length} grammar points. Study all ${wordCount} words free.`;
  return {
    title: `Modern Chinese 1 Lesson ${lessonId} Vocabulary & Grammar · Ron's Mandarin`,
    description,
    socialDescription: `Words with Taiwan audio, a tappable conversation and grammar for 時代華語 1 Lesson ${lessonId}. Free.`,
    path: lessonPagePath(lessonId),
  };
}
