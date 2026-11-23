import { PART_1_LESSONS } from './part1';
import { PART_2_LESSONS } from './part2';
import { PART_3_LESSONS } from './part3';
import { PART_4_LESSONS } from './part4';
import { PART_5_LESSONS } from './part5';
import { PART_6_LESSONS } from './part6';
import type { StartHereLesson, StartHerePartMeta } from './types';

export { READY_CHECK_QUESTIONS, READY_CHECK_PASS } from './readyCheck';

export const START_HERE_LESSONS: StartHereLesson[] = [
  ...PART_1_LESSONS,
  ...PART_2_LESSONS,
  ...PART_3_LESSONS,
  ...PART_4_LESSONS,
  ...PART_5_LESSONS,
  ...PART_6_LESSONS,
];

export const START_HERE_PARTS: StartHerePartMeta[] = [
  {
    id: 1, title: 'How Chinese sounds work',
    subtitle: 'Pinyin, the three pieces of a syllable, the four tones, and the six basic finals.',
    lessonIds: PART_1_LESSONS.map(({ id }) => id),
  },
  {
    id: 2, title: 'Easy initials and longer finals',
    subtitle: 'Feel the puff of air in an initial and hear how longer finals end.',
    lessonIds: PART_2_LESSONS.map(({ id }) => id),
  },
  {
    id: 3, title: 'The new sounds',
    subtitle: 'Learn three families of initials and tell them apart by ear.',
    lessonIds: PART_3_LESSONS.map(({ id }) => id),
  },
  {
    id: 4, title: 'Longer finals and the full chart',
    subtitle: 'Read longer finals that start with i, u or ü, then explore the pinyin chart.',
    lessonIds: PART_4_LESSONS.map(({ id }) => id),
  },
  {
    id: 5, title: 'Tones in real words',
    subtitle: 'Hear the light tone and how nearby tones change the way a word sounds.',
    lessonIds: PART_5_LESSONS.map(({ id }) => id),
  },
  {
    id: 6, title: 'Characters and your first words',
    subtitle: 'Look inside traditional characters and learn 13 words for Lesson 1.',
    lessonIds: PART_6_LESSONS.map(({ id }) => id),
  },
];

export function getStartHereLesson(id: number): StartHereLesson | undefined {
  return START_HERE_LESSONS.find((lesson) => lesson.id === id);
}
