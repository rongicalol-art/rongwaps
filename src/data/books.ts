/**
 * Course book catalog.
 *
 * Each book declares its identity plus a single `theme` object; every legacy
 * class/hex field (bg, accentBgLight, lightBg, accentHex, ...) is derived
 * below so a color change only ever touches one place. The derived shape is
 * what the UI consumes — do not add per-book duplicate fields back.
 */

interface BookTheme {
  primary: string;
  primaryEdge: string;
  primaryDeep: string;
  primarySoft: string;
  primarySoftEdge: string;
  primaryTrack: string;
  practiceCanvas: string;
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

interface BookColors {
  /** Book's soft background tint (used as page/deck wash). */
  softBg: string;
  /** Tailwind accent token when one exists; hex fallback otherwise. */
  accentToken?: 'brand-primary' | 'brand-secondary' | 'feedback-success';
  /** Border-edge class token override (defaults to the edge hex). */
  edgeToken?: string;
  theme: BookTheme;
  neutral: {
    bg: string;
    border: string;
    text: string;
    muted: string;
  };
}

type CourseBook = BookMeta & {
  bg: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentBgLight: string;
  ring: string;
  lightBg: string;
  gradientFrom: string;
  gradientTo: string;
  accentHex: string;
  edgeHex: string;
  buttonEdge: string;
  patternOpacity: number;
  neutralBg: string;
  neutralBorder: string;
  neutralText: string;
  neutralMuted: string;
  theme: BookTheme;
};

function buildBook(meta: BookMeta, colors: BookColors): CourseBook {
  const accentInner = colors.accentToken ?? `[${colors.theme.primary}]`;
  const edgeInner = colors.edgeToken ?? `[${colors.theme.primaryEdge}]`;
  return {
    ...meta,
    bg: `bg-[${colors.softBg}]`,
    accent: `text-${accentInner}`,
    accentBg: `bg-${accentInner}`,
    accentBorder: `border-${accentInner}`,
    accentBgLight: `bg-[${colors.softBg}]`,
    ring: `ring-${accentInner}/40`,
    lightBg: `bg-[${colors.softBg}]`,
    gradientFrom: colors.softBg,
    gradientTo: '#ffffff',
    accentHex: colors.theme.primary,
    edgeHex: colors.theme.primaryEdge,
    buttonEdge: `border-${edgeInner}`,
    patternOpacity: 0.1,
    neutralBg: colors.neutral.bg,
    neutralBorder: colors.neutral.border,
    neutralText: colors.neutral.text,
    neutralMuted: colors.neutral.muted,
    theme: colors.theme,
  };
}

export const SAMPLE_BOOKS: CourseBook[] = [
  buildBook(
    { id: 1, label: 'Book 1', title: 'Modern Chinese 1', subtitle: '時代華語 1', level: 'A1', progress: 0, status: 'active' },
    {
      softBg: '#DDF4FF',
      accentToken: 'brand-primary',
      edgeToken: 'brand-primary-edge',
      theme: {
        primary: '#1CB0F6',
        primaryEdge: '#1899D6',
        primaryDeep: '#117CAD',
        primarySoft: '#F1F8FB',
        primarySoftEdge: '#BFE9FF',
        primaryTrack: '#C7D6E1',
        practiceCanvas: '#E9EEF1',
      },
      neutral: { bg: '#F4F9FC', border: '#E0EAEF', text: '#464D54', muted: '#A6B2BD' },
    },
  ),
  buildBook(
    { id: 2, label: 'Book 2', title: 'Modern Chinese 2', subtitle: '時代華語 2', level: 'A2', progress: 0, status: 'unlocked' },
    {
      softBg: '#FFEFDC',
      accentToken: 'brand-secondary',
      theme: {
        primary: '#FF9600',
        primaryEdge: '#E58700',
        primaryDeep: '#B86800',
        primarySoft: '#FFF9F3',
        primarySoftEdge: '#FFDEB8',
        primaryTrack: '#E0D6C8',
        practiceCanvas: '#F2F1EE',
      },
      neutral: { bg: '#FCF8F4', border: '#ECE5DE', text: '#4D4A46', muted: '#B1AA9F' },
    },
  ),
  buildBook(
    { id: 3, label: 'Book 3', title: 'Modern Chinese 3', subtitle: '時代華語 3', level: 'B1', progress: 0, status: 'unlocked' },
    {
      softBg: '#F6EDE5',
      theme: {
        primary: '#A0522D',
        primaryEdge: '#8B4513',
        primaryDeep: '#6E3510',
        primarySoft: '#FBF7F3',
        primarySoftEdge: '#E6D3C5',
        primaryTrack: '#DDD3CB',
        practiceCanvas: '#F2F0ED',
      },
      neutral: { bg: '#FCF8F5', border: '#EBE5E0', text: '#4D4845', muted: '#B1A8A2' },
    },
  ),
  buildBook(
    { id: 4, label: 'Book 4', title: 'Modern Chinese 4', subtitle: '時代華語 4', level: 'B2', progress: 0, status: 'unlocked' },
    {
      softBg: '#EDF9E2',
      accentToken: 'feedback-success',
      theme: {
        primary: '#58CC02',
        primaryEdge: '#58A700',
        primaryDeep: '#3F8F00',
        primarySoft: '#F6FAF3',
        primarySoftEdge: '#C9E4B4',
        primaryTrack: '#CED9C7',
        practiceCanvas: '#F0F2EE',
      },
      neutral: { bg: '#F6FAF2', border: '#E2EADF', text: '#484D45', muted: '#A9B3A5' },
    },
  ),
];

export const SAMPLE_LESSONS = [
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
