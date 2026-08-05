import type { IconBaseProps, IconType } from 'react-icons';
import {
  PiArrowLeftBold,
  PiArrowRightBold,
  PiChartBarFill,
  PiBookmarkSimpleBold,
  PiBookmarkSimpleFill,
  PiBookOpenTextBold,
  PiBooksBold,
  PiCardsThreeBold,
  PiPuzzlePieceFill,
  PiCaretDownBold,
  PiCaretRightBold,
  PiChartDonutFill,
  PiCheckCircleFill,
  PiClockFill,
  PiExamFill,
  PiXCircleFill,
  PiFireFill,
  PiFolderFill,
  PiGraduationCapFill,
  PiGaugeBold,
  PiHeadphonesBold,
  PiKeyboardBold,
  PiLightbulbBold,
  PiListChecksBold,
  PiListBold,
  PiLockKeyFill,
  PiMagnifyingGlassBold,
  PiNotebookBold,
  PiPauseCircleFill,
  PiPencilSimpleBold,
  PiPlayFill,
  PiPlayCircleFill,
  PiPlusBold,
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
  | 'pause'
  | 'play'
  | 'pronounce'
  | 'progress'
  | 'profile'
  | 'practice'
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
  | 'next';

const ICONS: Record<AppIconName, IconType> = {
  add: PiPlusBold,
  analytics: PiChartBarFill,
  appSettings: PiGearSixBold,
  audio: PiHeadphonesBold,
  back: PiArrowLeftBold,
  bookmark: PiBookmarkSimpleBold,
  bookmarkFilled: PiBookmarkSimpleFill,
  books: PiBooksBold,
  breakdown: PiPuzzlePieceFill,
  cards: PiCardsThreeBold,
  check: PiCheckCircleFill,
  clock: PiClockFill,
  close: PiXBold,
  choices: PiListChecksBold,
  dictionary: PiBookOpenTextBold,
  expand: PiCaretDownBold,
  exam: PiExamFill,
  error: PiXCircleFill,
  flame: PiFireFill,
  folder: PiFolderFill,
  forward: PiArrowRightBold,
  grammar: PiNotebookBold,
  lightbulb: PiLightbulbBold,
  keyboard: PiKeyboardBold,
  lock: PiLockKeyFill,
  level: PiGraduationCapFill,
  menu: PiListBold,
  pause: PiPauseCircleFill,
  play: PiPlayFill,
  pronounce: PiSpeakerHighFill,
  progress: PiChartDonutFill,
  profile: PiUserBold,
  practice: PiPencilSimpleBold,
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
};

export interface AppIconProps extends Omit<IconBaseProps, 'children'> {
  name: AppIconName;
}

export function AppIcon({ name, 'aria-hidden': ariaHidden = true, ...props }: AppIconProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden={ariaHidden} {...props} />;
}
