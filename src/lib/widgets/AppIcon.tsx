import type { IconBaseProps, IconType } from 'react-icons';
import {
  PiArrowLeftBold,
  PiArrowRightBold,
  PiChartBarFill,
  PiBookmarkSimpleBold,
  PiBookmarkSimpleFill,
  PiBookOpenTextBold,
  PiBooksBold,
  PiCardsFill,
  PiPuzzlePieceFill,
  PiCaretDownBold,
  PiCaretRightBold,
  PiChartDonutFill,
  PiCheckCircleFill,
  PiClockFill,
  PiDeviceMobileBold,
  PiExportBold,
  PiXCircleFill,
  PiFireFill,
  PiFolderFill,
  PiGraduationCapFill,
  PiGaugeBold,
  PiEyeBold,
  PiEyeSlashBold,
  PiKeyboardBold,
  PiLightbulbBold,
  PiListChecksBold,
  PiListBold,
  PiLockKeyFill,
  PiMagnifyingGlassBold,
  PiBookBookmarkFill,
  PiPauseFill,
  PiPaintBrushFill,
  PiLightningFill,
  PiPlayFill,
  PiPlayCircleFill,
  PiSkipBackFill,
  PiSkipForwardFill,
  PiPlusBold,
  PiMinusBold,
  PiSparkleFill,
  PiStarFill,
  PiTargetFill,
  PiCursorTextBold,
  PiSlidersHorizontalBold,
  PiShuffleBold,
  PiSidebarSimpleBold,
  PiArrowCounterClockwiseBold,
  PiGearSixFill,
  PiSignInBold,
  PiSignOutBold,
  PiTrashBold,
  PiTrophyFill,
  PiUserBold,
  PiXBold,
  PiHashBold,
  PiHandWavingBold,
  PiBowlFoodBold,
  PiUsersThreeBold,
  PiSwatchesBold,
  PiPersonBold,
  PiLightningBold,
  PiMapPinBold,
  PiTreeBold,
  PiDogBold,
  PiBackpackBold,
  PiShoppingBagBold,
  PiPaperPlaneBold,
  PiTextAaBold,
  PiHouseBold,
  PiQuestionBold,
  PiRulerBold,
  PiLeafFill,
  PiPlantFill,
  PiFlowerFill,
  PiDropFill,
  PiPencilFill,
  PiSquaresFourFill,
  PiBookOpenFill,
} from 'react-icons/pi';

export type AppIconName =
  | 'add'
  | 'analytics'
  | 'appSettings'
  | 'audio'
  | 'back'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'books'
  | 'breakdown'
  | 'cards'
  | 'check'
  | 'clock'
  | 'close'
  | 'choices'
  | 'deviceMobile'
  | 'dictionary'
  | 'dropdown'
  | 'expand'
  | 'exam'
  | 'error'
  | 'eye'
  | 'eyeSlash'
  | 'flashcard'
  | 'flame'
  | 'folder'
  | 'forward'
  | 'grammar'
  | 'lightbulb'
  | 'hint'
  | 'keyboard'
  | 'lock'
  | 'level'
  | 'menu'
  | 'minus'
  | 'pause'
  | 'play'
  | 'pronounce'
  | 'progress'
  | 'profile'
  | 'practice'
  | 'plus'
  | 'search'
  | 'sidebarToggle'
  | 'sparkles'
  | 'star'
  | 'settings'
  | 'share'
  | 'controls'
  | 'shuffle'
  | 'slowAudio'
  | 'skipBack'
  | 'skipForward'
  | 'flow'
  | 'restart'
  | 'signIn'
  | 'signOut'
  | 'trash'
  | 'trophy'
  | 'target'
  | 'typeText'
  | 'next'
  | 'numbers'
  | 'greeting'
  | 'food'
  | 'family'
  | 'colors'
  | 'body'
  | 'actions'
  | 'places'
  | 'nature'
  | 'animals'
  | 'school'
  | 'shopping'
  | 'travel'
  | 'describe'
  | 'home'
  | 'questions'
  | 'measure'
  | 'leaf'
  | 'plant'
  | 'flower'
  | 'drop'
  | 'pencil'
  | 'grid'
  | 'quiz'
  | 'writing'
  | 'book';

/**
 * Soft rounded speaker glyph used for every play/pronounce affordance.
 * Phosphor's speaker reads too angular beside the app's rounded geometry, so
 * this bespoke path keeps the filled body+cone silhouette with round-capped
 * waves in the Duolingo-like soft voice.
 */
const SoftSpeakerIcon: IconType = ({ size = '1em', color = 'currentColor', className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={color}
    className={className}
    {...props}
  >
    <path d="M12.6 5.6C12.6 3.4 10.8 2.2 9.4 3.3L5.1 6.3H2.8A1.9 1.9 0 0 0 .9 8.2v7.6a1.9 1.9 0 0 0 1.9 1.9h2.3l4.3 3c1.4 1.1 3.2-.1 3.2-2.3V5.6Z" />
    <path d="M16 9a4.4 4.4 0 0 1 0 6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M19.2 6.2a8.4 8.4 0 0 1 0 11.6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/**
 * Colorful study-guide bulb: a flat, gold bulb (no outline) with a darker
 * base and a glossy highlight, matching the playful brand accents instead of
 * Phosphor's monochrome outline bulb. Purely decorative — the
 * owning button carries the accessible label.
 */
const StudyBulbIcon: IconType = ({ size = '1em', className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path
      d="M12 1.9c-4.25 0-7.6 3.2-7.6 7.2 0 2.6 1.2 4.55 2.7 6.25.75.85 1.1 1.5 1.15 2.45h7.5c.05-.95.4-1.6 1.15-2.45 1.5-1.7 2.7-3.65 2.7-6.25 0-4-3.35-7.2-7.6-7.2Z"
      fill="var(--color-feedback-warning)"
    />
    <rect
      x="8.6"
      y="18.3"
      width="6.8"
      height="3.2"
      rx="1.5"
      fill="var(--color-feedback-warning-edge)"
    />
    <circle cx="9.4" cy="7.2" r="1.6" fill="var(--color-ui-surface)" opacity="0.9" />
  </svg>
);

/**
 * Colorful settings gear: Phosphor's filled gear geometry baked with the
 * brand blue so every settings affordance shares one playful, flat mark
 * (current-color states cannot recolor it, so open/disabled cues use chips
 * or opacity at the call sites).
 */
const StudyGearIcon: IconType = ({ size = '1em', className, ...props }) => (
  <PiGearSixFill
    size={size}
    className={className}
    {...props}
    color="var(--color-brand-primary)"
  />
);

const ICONS: Record<AppIconName, IconType> = {
  add: PiPlusBold,
  analytics: PiChartBarFill,
  appSettings: StudyGearIcon,
  audio: SoftSpeakerIcon,
  back: PiArrowLeftBold,
  bookmark: PiBookmarkSimpleBold,
  bookmarkFilled: PiBookmarkSimpleFill,
  books: PiBooksBold,
  breakdown: PiPuzzlePieceFill,
  cards: PiCardsFill,
  check: PiCheckCircleFill,
  clock: PiClockFill,
  close: PiXBold,
  choices: PiListChecksBold,
  deviceMobile: PiDeviceMobileBold,
  dictionary: PiBookOpenTextBold,
  dropdown: PiCaretDownBold,
  expand: PiCaretDownBold,
  exam: PiLightningFill,
  error: PiXCircleFill,
  eye: PiEyeBold,
  eyeSlash: PiEyeSlashBold,
  flashcard: PiCardsFill,
  flame: PiFireFill,
  folder: PiFolderFill,
  forward: PiArrowRightBold,
  grammar: PiBookBookmarkFill,
  lightbulb: PiLightbulbBold,
  hint: StudyBulbIcon,
  keyboard: PiKeyboardBold,
  lock: PiLockKeyFill,
  level: PiGraduationCapFill,
  menu: PiListBold,
  minus: PiMinusBold,
  pause: PiPauseFill,
  play: PiPlayFill,
  pronounce: SoftSpeakerIcon,
  progress: PiChartDonutFill,
  profile: PiUserBold,
  practice: PiPaintBrushFill,
  plus: PiPlusBold,
  quiz: PiLightningFill,
  writing: PiPaintBrushFill,
  search: PiMagnifyingGlassBold,
  sidebarToggle: PiSidebarSimpleBold,
  sparkles: PiSparkleFill,
  star: PiStarFill,
  settings: StudyGearIcon,
  share: PiExportBold,
  controls: PiSlidersHorizontalBold,
  shuffle: PiShuffleBold,
  slowAudio: PiGaugeBold,
  skipBack: PiSkipBackFill,
  skipForward: PiSkipForwardFill,
  flow: PiPlayCircleFill,
  restart: PiArrowCounterClockwiseBold,
  signIn: PiSignInBold,
  signOut: PiSignOutBold,
  trash: PiTrashBold,
  trophy: PiTrophyFill,
  target: PiTargetFill,
  typeText: PiCursorTextBold,
  next: PiCaretRightBold,
  numbers: PiHashBold,
  greeting: PiHandWavingBold,
  food: PiBowlFoodBold,
  family: PiUsersThreeBold,
  colors: PiSwatchesBold,
  body: PiPersonBold,
  actions: PiLightningBold,
  places: PiMapPinBold,
  nature: PiTreeBold,
  animals: PiDogBold,
  school: PiBackpackBold,
  shopping: PiShoppingBagBold,
  travel: PiPaperPlaneBold,
  describe: PiTextAaBold,
  home: PiHouseBold,
  questions: PiQuestionBold,
  measure: PiRulerBold,
  leaf: PiLeafFill,
  plant: PiPlantFill,
  flower: PiFlowerFill,
  drop: PiDropFill,
  pencil: PiPencilFill,
  grid: PiSquaresFourFill,
  book: PiBookOpenFill,
};

export interface AppIconProps extends IconBaseProps {
  name: AppIconName;
}

export function AppIcon({ name, title, 'aria-label': ariaLabel, ...props }: AppIconProps) {
  const IconComponent = ICONS[name] ?? PiBookOpenFill;
  // Icons sit beside visible text in almost every call site, so they are
  // decorative by default and stay out of the accessibility tree (they would
  // otherwise be announced as unlabeled graphics). Pass `title` or `aria-label`
  // when the icon itself carries meaning — the MUI SvgIcon contract.
  const hasAccessibleName = Boolean(title || ariaLabel);
  return (
    <IconComponent
      {...props}
      title={title}
      role={hasAccessibleName ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={hasAccessibleName ? undefined : true}
    />
  );
}
