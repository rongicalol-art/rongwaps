import type { LessonTestItem } from '../../types/lessonTest';

/** Generated lesson-test illustrations, by name (src/assets/images/lesson-tests/<name>.webp). */
const PICTURES = import.meta.glob<string>('../../assets/images/lesson-tests/*.webp', { eager: true, query: '?url', import: 'default' });

export function testPicture(name: string | undefined): string | undefined {
  return name ? PICTURES[`../../assets/images/lesson-tests/${name}.webp`] : undefined;
}

/** Every picture an item shows, so a screen can preload the next one. */
export function itemPictureUrls(item: LessonTestItem): string[] {
  const names: (string | undefined)[] = [];
  if (item.kind === 'picture-hear') names.push(item.picture.picture);
  if (item.kind === 'realia' || item.kind === 'scene-gap') names.push(item.picture);
  for (const question of item.questions) for (const choice of question.choices ?? []) names.push(choice.picture);
  return names.map(testPicture).filter((url): url is string => Boolean(url));
}
