/**
 * Course book catalog.
 *
 * Each book declares its identity plus a single `theme` tone: accent family,
 * text, line and canvas roles. `useBookTheme` writes it onto the global CSS
 * tokens, and the legacy class/hex fields below are derived from the tokens
 * (never from per-book hexes), so a book or the review tone recolours every
 * consumer. Do not add per-book duplicate fields back.
 */

interface BookTheme {
  primary: string;
  primaryEdge: string;
  primaryDeep: string;
  primarySoft: string;
  primarySoftEdge: string;
  primaryTrack: string;
  /** Selected-choice / deck wash behind accent text. */
  primaryWash: string;
  practiceCanvas: string;
  inkStrong: string;
  ink: string;
  mutedStrong: string;
  muted: string;
  border: string;
  divider: string;
}

interface BookMeta {
  id: number;
  label: string;
  title: string;
  subtitle: string;
  level: string;
  progress: number;
  status: 'active' | 'unlocked' | 'locked';
}

type CourseBook = BookMeta & {
  bg: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentHex: string;
  edgeHex: string;
  buttonEdge: string;
  theme: BookTheme;
};

/** Beta: only Book 1, Introduction + Lessons 1-8 are playable. Raise or remove to open more. */
export const BETA_LAST_LESSON = 8;

const BEYOND_BETA_BOOK_STATUS: BookMeta['status'] = 'locked';

function buildBook(meta: BookMeta, theme: BookTheme): CourseBook {
  return {
    ...meta,
    bg: 'bg-brand-primary-wash',
    accent: 'text-brand-primary',
    accentBg: 'bg-brand-primary',
    accentBorder: 'border-brand-primary',
    accentHex: 'var(--color-brand-primary)',
    edgeHex: 'var(--color-brand-primary-edge)',
    buttonEdge: 'border-brand-primary-edge',
    theme,
  };
}

export const SAMPLE_BOOKS: CourseBook[] = [
  buildBook(
    { id: 1, label: 'Book 1', title: 'Modern Chinese 1', subtitle: '時代華語 1', level: 'A1', progress: 0, status: 'active' },
    {
      primary: '#3A7CA5',
      primaryEdge: '#2C6385',
      primaryDeep: '#1F4D6B',
      primarySoft: '#F2F6F8',
      primarySoftEdge: '#C3D7E3',
      primaryTrack: '#D3DBE0',
      primaryWash: '#E4EDF3',
      practiceCanvas: '#F3F2F0',
      inkStrong: '#34312D',
      ink: '#4A4743',
      mutedStrong: '#777777',
      muted: '#8F8B86',
      border: '#CBC8C3',
      divider: '#DEDBD6',
    },
  ),
  buildBook(
    { id: 2, label: 'Book 2', title: 'Modern Chinese 2', subtitle: '時代華語 2', level: 'A2', progress: 0, status: BEYOND_BETA_BOOK_STATUS },
    {
      primary: '#D4793A',
      primaryEdge: '#B05F27',
      primaryDeep: '#8A4A1E',
      primarySoft: '#FBF5EF',
      primarySoftEdge: '#EBCFB5',
      primaryTrack: '#E3D9CE',
      primaryWash: '#F7E8D8',
      practiceCanvas: '#F3F2F0',
      inkStrong: '#3A302A',
      ink: '#54483F',
      mutedStrong: '#7D7268',
      muted: '#968B80',
      border: '#D1C7BB',
      divider: '#E3DACF',
    },
  ),
  buildBook(
    { id: 3, label: 'Book 3', title: 'Modern Chinese 3', subtitle: '時代華語 3', level: 'B1', progress: 0, status: BEYOND_BETA_BOOK_STATUS },
    {
      primary: '#A0522D',
      primaryEdge: '#8B4513',
      primaryDeep: '#6E3510',
      primarySoft: '#FBF7F3',
      primarySoftEdge: '#E6D3C5',
      primaryTrack: '#DDD3CB',
      primaryWash: '#F6EDE5',
      practiceCanvas: '#F3F2F0',
      inkStrong: '#37302B',
      ink: '#4F4640',
      mutedStrong: '#7A7068',
      muted: '#93887F',
      border: '#CFC5BC',
      divider: '#E0D8D0',
    },
  ),
  buildBook(
    { id: 4, label: 'Book 4', title: 'Modern Chinese 4', subtitle: '時代華語 4', level: 'B2', progress: 0, status: BEYOND_BETA_BOOK_STATUS },
    {
      primary: '#4F9F2A',
      primaryEdge: '#3F8420',
      primaryDeep: '#2C5F16',
      primarySoft: '#F6FAF3',
      primarySoftEdge: '#C9E4B4',
      primaryTrack: '#CED9C7',
      primaryWash: '#EDF9E2',
      practiceCanvas: '#F3F2F0',
      inkStrong: '#2F352C',
      ink: '#454B41',
      mutedStrong: '#70776B',
      muted: '#8A9185',
      border: '#C6CDC0',
      divider: '#DBE0D6',
    },
  ),
];

const BOOK_LESSONS = [
  { id: 1, label: 'Lesson 1', title: 'The New Classmate · 新同學', status: 'available' },
  { id: 2, label: 'Lesson 2', title: 'What Time Do You Go to School? · 你幾點去學校？', status: 'available' },
  { id: 3, label: 'Lesson 3', title: 'Buying Birthday Gifts · 買生日禮物', status: 'available' },
  { id: 4, label: 'Lesson 4', title: 'Coffee or Tea? · 你要咖啡還是茶？', status: 'available' },
  { id: 5, label: 'Lesson 5', title: 'Where Is My Wallet? · 我的錢包在哪裡？', status: 'available' },
  { id: 6, label: 'Lesson 6', title: 'Let’s Play Tennis This Weekend! · 週末去打網球吧！', status: 'available' },
  { id: 7, label: 'Lesson 7', title: 'How Do We Get to the Hotel? · 怎麼到飯店去？', status: 'available' },
  { id: 8, label: 'Lesson 8', title: 'This Skirt Is Very Beautiful · 這條裙子真好看', status: 'available' },
  { id: 9, label: 'Lesson 9', title: 'My Chinese Class · 我的中文課', status: 'available' },
  { id: 10, label: 'Lesson 10', title: 'Many People Got Colds Recently · 最近感冒的人很多', status: 'available' },
  { id: 11, label: 'Lesson 11', title: 'How Did You Meet Each Other? · 你們是怎麼認識的？', status: 'available' },
  { id: 12, label: 'Lesson 12', title: 'What Job Do You Want to Do? · 你想做什麼工作？', status: 'available' },
  { id: 13, label: 'Lesson 13', title: 'Get on the Internet with a Cell Phone · 用手機上網', status: 'available' },
  { id: 14, label: 'Lesson 14', title: 'New Year’s Eve Celebration · 跨年活動', status: 'available' },
  { id: 15, label: 'Lesson 15', title: 'The Chinese Animal Zodiac · 十二生肖', status: 'available' },
  { id: 16, label: 'Lesson 16', title: 'Traveling in Taiwan · 在台灣旅行', status: 'available' },
];

export const SAMPLE_LESSONS = BOOK_LESSONS.map((lesson) => ({
  ...lesson,
  status: lesson.id > BETA_LAST_LESSON ? 'locked' : 'available',
}));


/** True for any lesson in a locked book or a locked lesson of Book 1 (Introduction, id 0, is open). */
export function isLessonLocked(bookId: number, lessonId: number): boolean {
  if (SAMPLE_BOOKS.find((book) => book.id === bookId)?.status === 'locked') return true;
  return SAMPLE_LESSONS.find((lesson) => lesson.id === lessonId)?.status === 'locked';
}
