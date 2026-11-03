import { getReadingIllustration } from '../../data/readingIllustrations';
import type { LessonTestItem } from '../../types/lessonTest';

/** Generated lesson-test illustrations, by name (src/assets/images/lesson-tests/<name>.webp). */
const PICTURES = import.meta.glob<string>('../../assets/images/lesson-tests/*.webp', { eager: true, query: '?url', import: 'default' });

/** A lesson's own reading picture is named `reading:<reading id>` (e.g. `reading:B1L02-R01`). */
export const READING_PICTURE_PREFIX = 'reading:';

export function testPicture(name: string | undefined): string | undefined {
  if (!name) return undefined;
  if (name.startsWith(READING_PICTURE_PREFIX)) return getReadingIllustration(name.slice(READING_PICTURE_PREFIX.length))?.url;
  return PICTURES[`../../assets/images/lesson-tests/${name}.webp`];
}

/** Every picture an item shows, so a screen can preload the next one. */
export function itemPictureUrls(item: LessonTestItem): string[] {
  const names: (string | undefined)[] = [];
  if (item.kind === 'picture-hear') names.push(item.picture.picture);
  if (item.kind === 'realia' || item.kind === 'scene-gap') names.push(item.picture);
  for (const question of item.questions) for (const choice of question.choices ?? []) names.push(choice.picture);
  return names.map(testPicture).filter((url): url is string => Boolean(url));
}
