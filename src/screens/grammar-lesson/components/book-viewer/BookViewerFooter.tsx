import type { FocusEvent, PointerEvent } from 'react';
import { AppIcon, IconActionButton } from '../../../../lib/widgets';
import { cn } from '../../../../utils/cn';
import {
  BOOK_ZOOM_LEVELS,
  getNextBookZoom,
  getPreviousBookZoom,
  isMaximumBookZoom,
  isMinimumBookZoom,
} from '../../utils/bookViewerLayout';

interface BookViewerFooterProps {
  zoom: number;
  controlVisibilityClass: string;
  onZoomChange: (zoom: number) => void;
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
}

const darkControlClass =
  'border-ui-surface/20 bg-ui-ink-strong/85 text-ui-surface hover:bg-ui-ink-strong hover:text-ui-surface active:bg-ui-ink-strong/95 disabled:border-ui-surface/15 disabled:bg-ui-ink-strong/50 disabled:text-ui-surface/35';

export function BookViewerFooter({
  zoom,
  controlVisibilityClass,
  onZoomChange,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
}: BookViewerFooterProps) {
  return (
    <footer
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom,0px)] transition-opacity duration-200',
        controlVisibilityClass,
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocusCapture={onFocus}
      onBlurCapture={onBlur}
    >
      <div className="flex items-center justify-center gap-2 border-t border-ui-surface/10 bg-ui-ink-strong/90 px-4 py-2 backdrop-blur-sm sm:py-3">
        <IconActionButton
          onClick={() => onZoomChange(getPreviousBookZoom(zoom))}
          disabled={isMinimumBookZoom(zoom)}
          variant="surface"
          icon={<AppIcon name="minus" size={18} />}
          label="Zoom out"
          className={darkControlClass}
        />
        <IconActionButton
          onClick={() => onZoomChange(BOOK_ZOOM_LEVELS[0])}
          variant="surface"
          icon={<span className="text-xs font-black">{Math.round(zoom * 100)}%</span>}
          label="Reset zoom to 100%"
          className={cn('w-auto px-3', darkControlClass)}
        />
        <IconActionButton
          onClick={() => onZoomChange(getNextBookZoom(zoom))}
          disabled={isMaximumBookZoom(zoom)}
          variant="surface"
          icon={<AppIcon name="plus" size={18} />}
          label="Zoom in"
          className={darkControlClass}
        />
      </div>
    </footer>
  );
}
