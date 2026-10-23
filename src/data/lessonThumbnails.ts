/**
 * Small square crops of each lesson's first reading picture (160 px webp, ~6 KB) for the Books tiles.
 * Lessons without one keep their landscape icon (`lessonLandscapeArt`).
 */
const THUMBNAILS: Record<string, string> = {
  '1:1': new URL('../assets/images/lesson-thumbs/b1l01.webp', import.meta.url).href,
  '1:2': new URL('../assets/images/lesson-thumbs/b1l02.webp', import.meta.url).href,
  '1:3': new URL('../assets/images/lesson-thumbs/b1l03.webp', import.meta.url).href,
  '1:4': new URL('../assets/images/lesson-thumbs/b1l04.webp', import.meta.url).href,
  '1:5': new URL('../assets/images/lesson-thumbs/b1l05.webp', import.meta.url).href,
  '1:6': new URL('../assets/images/lesson-thumbs/b1l06.webp', import.meta.url).href,
  '1:7': new URL('../assets/images/lesson-thumbs/b1l07.webp', import.meta.url).href,
  '1:8': new URL('../assets/images/lesson-thumbs/b1l08.webp', import.meta.url).href,
};

export const lessonThumbnail = (bookId: number, lessonId: number): string | undefined => THUMBNAILS[`${bookId}:${lessonId}`];
