/**
 * Course book catalog.
 *
 * Each book's colours (accent family, text and line roles, light and dark) live in `src/index.css` under
 * `[data-book="N"]`; `useBookTheme` only sets that attribute. The class/hex fields below point at the shared
 * tokens (never per-book hexes), so a book, the dark theme or the review tone recolours every consumer.
 */

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
};

/** Beta: Books 1-3 are open, Book 4 is locked, Lessons 1-16 (Book 1 also its Introduction). */
import { BETA_LAST_LESSON } from '../../shared/courseAccess';
export { BETA_LAST_LESSON } from '../../shared/courseAccess';


function buildBook(meta: BookMeta): CourseBook {
  return {
    ...meta,
    bg: 'bg-brand-primary-wash',
    accent: 'text-brand-primary',
    accentBg: 'bg-brand-primary',
    accentBorder: 'border-brand-primary',
    accentHex: 'var(--color-brand-primary)',
    edgeHex: 'var(--color-brand-primary-edge)',
    buttonEdge: 'border-brand-primary-edge',
  };
}

export const SAMPLE_BOOKS: CourseBook[] = [
  buildBook(
    { id: 1, label: 'Book 1', title: 'Modern Chinese 1', subtitle: '時代華語 1', level: 'A1', progress: 0, status: 'active' },
  ),
  buildBook(
    { id: 2, label: 'Book 2', title: 'Modern Chinese 2', subtitle: '時代華語 2', level: 'A2', progress: 0, status: 'unlocked' },
  ),
  buildBook(
    { id: 3, label: 'Book 3', title: 'Modern Chinese 3', subtitle: '時代華語 3', level: 'B1', progress: 0, status: 'unlocked' },
  ),
  buildBook(
    { id: 4, label: 'Book 4', title: 'Modern Chinese 4', subtitle: '時代華語 4', level: 'B2', progress: 0, status: 'locked' },
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

export const LOCKED_BOOK_LESSON_TITLES: Record<number, string[]> = {
  2: [
    'Meeting New Friends',
    'I Have to Do Housework',
    'I Want to Rent a House',
    'It’s Fun to Go to the Night Market',
    'Welcome to My House',
    'Let’s Go to KTV to Sing!',
    'Traveling to Hualien by Train',
    'Give Me the Stickers, Please. I Want to Exchange Them for Snoopy!',
    'Are You Afraid of Taking Exams?',
    'Let’s Go Work Out after Class!',
    'Which Club Would You Like to Join?',
    'A Small Clerk? A Big Boss?',
    'I Want to Buy a Laptop',
    'Fish on the Dish, Abundance Year after Year',
    'The Thing That Confucius Did Not Know',
    'Friends from All Over the World',
  ],
  3: [
    'My Dream',
    'Convenience Stores Are So Convenient!',
    'It Won’t Hurt to Shop Around',
    'One Month Old',
    'Earthquakes and Typhoons',
    'Balanced Work and Leisure',
    'Backpacker’s Travel',
    'Clothes and Taste',
    'Who Can Say that There Is No Future unless You are a College Graduate?',
    'Health Examinations Are Easy',
    'Be Careful when Making Online Friends',
    'Do You Have Interview Experience?',
    'Cloud Technology Is Really Convenient',
    'The Story of the Double Seventh Festival',
    'Visit the Historic Sites in Tamsui',
    'Cherishing Food Starts with You and Me',
  ],
  4: [
    'Haven’t Seen You in Ages!',
    'Running Errands: To the Bank',
    'Online Shopping',
    'Sip a Cup of Tea',
    'Reduce, Reuse, Recycle',
    'Good Time at the Concert',
    'Family Trip Abroad',
    'Work and Slow Life',
    'Do Less Parenting',
    'Fortune in Misfortune',
    'Wedding Banquet',
    'All Walks of Life',
    'To the Robot Expo',
    'Celebrating Mid-Autumn Festival',
    'At the Taipei National Palace Museum',
    'Watching the Olympics',
  ],
};


/** True for any beta-locked lesson unless the verified account has a full-course grant. */
export function isLessonLocked(bookId: number, lessonId: number, hasFullCourseAccess = false): boolean {
  if (hasFullCourseAccess) return false;
  if (SAMPLE_BOOKS.find((book) => book.id === bookId)?.status === 'locked') return true;
  // Books 2–3 are open while still being authored (Books 2 and 4 have vocabulary only).
  if (bookId >= 2 && bookId <= 3) return lessonId > 16;
  return SAMPLE_LESSONS.find((lesson) => lesson.id === lessonId)?.status === 'locked';
}
