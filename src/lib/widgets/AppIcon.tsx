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
  PiXCircleFill,
  PiFireFill,
  PiFolderFill,
  PiGraduationCapFill,
  PiGaugeBold,
  PiHeadphonesFill,
  PiKeyboardBold,
  PiLightbulbBold,
  PiListChecksBold,
  PiListBold,
  PiLockKeyFill,
  PiMagnifyingGlassBold,
  PiBookBookmarkFill,
  PiPauseCircleFill,
  PiPaintBrushFill,
  PiLightningFill,
  PiPlayFill,
  PiPlayCircleFill,
  PiPlusBold,
  PiMinusBold,
  PiSparkleFill,
  PiStarFill,
  PiTargetFill,
  PiCursorTextBold,
  PiSlidersHorizontalBold,
  PiShuffleBold,
  PiSidebarSimpleBold,
  PiSpeakerHighFill,
  PiArrowCounterClockwiseBold,
  PiGearSixBold,
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
  | 'dictionary'
  | 'expand'
  | 'exam'
  | 'error'
  | 'flame'
  | 'folder'
  | 'forward'
  | 'grammar'
  | 'lightbulb'
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
  | 'controls'
  | 'shuffle'
  | 'slowAudio'
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

const ICONS: Record<AppIconName, IconType> = {
  add: PiPlusBold,
  analytics: PiChartBarFill,
  appSettings: PiGearSixBold,
  audio: PiHeadphonesFill,
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
  dictionary: PiBookOpenTextBold,
  expand: PiCaretDownBold,
  exam: PiLightningFill,
  error: PiXCircleFill,
  flame: PiFireFill,
  folder: PiFolderFill,
  forward: PiArrowRightBold,
  grammar: PiBookBookmarkFill,
  lightbulb: PiLightbulbBold,
  keyboard: PiKeyboardBold,
  lock: PiLockKeyFill,
  level: PiGraduationCapFill,
  menu: PiListBold,
  minus: PiMinusBold,
  pause: PiPauseCircleFill,
  play: PiPlayFill,
  pronounce: PiSpeakerHighFill,
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
  settings: PiSlidersHorizontalBold,
  controls: PiSlidersHorizontalBold,
  shuffle: PiShuffleBold,
  slowAudio: PiGaugeBold,
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

export interface AppIconProps extends Omit<IconBaseProps, 'children'> {
  name: AppIconName;
}

export function AppIcon({ name, 'aria-hidden': ariaHidden = true, ...props }: AppIconProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden={ariaHidden} {...props} />;
}
