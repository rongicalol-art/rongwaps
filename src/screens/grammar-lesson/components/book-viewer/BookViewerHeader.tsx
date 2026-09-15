import type { FocusEvent, PointerEvent } from 'react';
import { AppIcon, IconActionButton } from '../../../../lib/widgets';
import { cn } from '../../../../utils/cn';

interface BookViewerHeaderProps {
  page: number;
  lessonId: number;
  pageIndex: number;
  totalPages: number;
  controlVisibilityClass: string;
  onClose: () => void;
  onPageChange: (delta: number) => void;
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
}

const darkControlClass =
  'border-ui-surface/20 bg-ui-ink-strong/85 text-ui-surface hover:bg-ui-ink-strong hover:text-ui-surface active:bg-ui-ink-strong/95 disabled:border-ui-surface/15 disabled:bg-ui-ink-strong/50 disabled:text-ui-surface/35';

export function BookViewerHeader({
  page,
  lessonId,
  pageIndex,
  totalPages,
  controlVisibilityClass,
  onClose,
  onPageChange,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
}: BookViewerHeaderProps) {
  return (
    <header
      className={cn(
        'absolute inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top,0px)] transition-opacity duration-200',
        controlVisibilityClass,
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocusCapture={onFocus}
      onBlurCapture={onBlur}
    >
      <div className="flex items-center gap-3 border-b border-ui-surface/10 bg-ui-ink-strong/90 px-3 py-2 backdrop-blur-sm sm:px-5">
        <IconActionButton
          onClick={onClose}
          variant="surface"
          icon={<AppIcon name="close" size={20} />}
          label="Close book reference"
          className={darkControlClass}
        />
        <p className="min-w-0 flex-1 truncate text-center text-sm font-black text-ui-surface">
          Printed page {page}
          <span className="ml-2 hidden font-bold text-ui-surface/65 sm:inline">
            Lesson {lessonId} · Book reference
          </span>
        </p>
        <div className="flex min-w-[104px] shrink-0 items-center justify-end gap-1">
          {pageIndex > 0 && (
            <IconActionButton
              onClick={() => onPageChange(-1)}
              variant="surface"
              icon={<AppIcon name="back" size={17} />}
              label="Previous book page"
              className={darkControlClass}
            />
          )}
          <span aria-live="polite" className="min-w-10 text-center text-xs font-black tabular-nums text-ui-surface">
            {pageIndex + 1}/{totalPages}
          </span>
          {pageIndex < totalPages - 1 && (
            <IconActionButton
              onClick={() => onPageChange(1)}
              variant="surface"
              icon={<AppIcon name="forward" size={17} />}
              label="Next book page"
              className={darkControlClass}
            />
          )}
        </div>
      </div>
    </header>
  );
}
