const lessonLandscapeFiles = [
  'lesson-01-city.svg',
  'lesson-02-school.svg',
  'lesson-03-festival.svg',
  'lesson-04-tea-garden.svg',
  'lesson-05-search.svg',
  'lesson-06-weekend.svg',
  'lesson-07-travel.svg',
  'lesson-08-fashion.svg',
  'lesson-09-chinese.svg',
  'lesson-10-cold.svg',
  'lesson-11-meeting.svg',
  'lesson-12-work.svg',
  'lesson-13-internet.svg',
  'lesson-14-new-year.svg',
  'lesson-15-review.svg',
  'lesson-16-practice.svg',
] as const;

export const INTRODUCTION_ART = new URL(
  '../assets/lesson-landscapes/introduction-book.svg',
  import.meta.url,
).href;

export const LESSON_LANDSCAPE_ART = Object.fromEntries(
  lessonLandscapeFiles.map((fileName, index) => [
    index + 1,
    new URL(`../assets/lesson-landscapes/${fileName}`, import.meta.url).href,
  ]),
) as Record<number, string>;
