/**
 * Lesson titles in the curriculum registry may include a Chinese subtitle
 * for contexts that teach from both languages. Selectors use the shorter
 * English-only label to keep the course list scannable.
 */
export function getEnglishLessonTitle(title: string) {
  return title.split('·', 1)[0].trim();
}
