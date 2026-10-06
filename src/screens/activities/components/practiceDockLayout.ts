import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { PracticeDockStyle } from '../../../store/useAppStore';

export interface PracticeDockLayout {
  /** Icons stacked in a column (md+ only; below md every style is a horizontal pill). */
  isVertical: boolean;
  /** Where popovers and tooltips open relative to their button. */
  side: 'top' | 'left' | 'right';
  /** Classes for `FloatingDock.Root`. */
  rootClassName: string;
  /** Classes for the practice window itself (drops the bottom-dock clearance). */
  insetClassName: string;
  /** Invisible edge strip that brings back a scroll-hidden dock on hover. */
  revealZoneClassName: string;
  /** Shrinks the absolutely positioned header and screens so they clear a vertical dock. */
  edgeInsetClassName: string;
}

const VERTICAL_STYLES: ReadonlySet<PracticeDockStyle> = new Set([
  'right-column',
  'right-middle',
  'top-right',
  'left-column',
]);

/** A vertical dock doesn't need the bottom-dock clearance the practice screens reserve, so drop it. */
const VERTICAL_INSET_CLASS = 'md:[&_.pb-dock-clearance]:pb-12';

/** Single owner of where the practice dock sits for each `dockStyle`. */
export function getPracticeDockLayout(style: PracticeDockStyle, isWide: boolean): PracticeDockLayout {
  const isVertical = isWide && VERTICAL_STYLES.has(style);
  const horizontalRoot =
    style === 'bottom-center'
      ? 'justify-center px-4'
      : style === 'left-column'
        ? 'justify-start px-5'
        : 'justify-end px-5 md:px-10';

  if (!isVertical) {
    return { isVertical, side: 'top', rootClassName: horizontalRoot,
      insetClassName: '',
      edgeInsetClassName: '',
      revealZoneClassName: 'inset-x-0 bottom-0 h-14',
    };
  }
  if (style === 'left-column') {
    return {
      isVertical,
      side: 'right',
      rootClassName: 'right-auto left-4 justify-start px-0 lg:left-6',
      insetClassName: VERTICAL_INSET_CLASS,
      edgeInsetClassName: 'md:left-20',
      revealZoneClassName: 'inset-y-0 left-0 w-20',
    };
  }
  return {
    isVertical,
    side: 'left',
    rootClassName: [
      'left-auto right-4 justify-end px-0 lg:right-6',
      style === 'right-middle' && 'top-1/2 bottom-auto! -translate-y-1/2',
      // Top edge matches the main side panel (SIDE_NAV_GUTTER = 16px).
      style === 'top-right' && 'top-4 bottom-auto! lg:right-4',
    ]
      .filter(Boolean)
      .join(' '),
    insetClassName: VERTICAL_INSET_CLASS,
    edgeInsetClassName: 'md:right-20',
    revealZoneClassName: 'inset-y-0 right-0 w-20',
  };
}

export function usePracticeDockLayout(style: PracticeDockStyle): PracticeDockLayout {
  const isWide = useMediaQuery('(min-width: 768px)');
  return getPracticeDockLayout(style, isWide);
}
