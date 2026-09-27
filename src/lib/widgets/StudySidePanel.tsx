import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';

export interface StudySidePanelProps {
  ariaLabel: string;
  /** Quiet eyebrow label above the panel content. */
  title: string;
  children: ReactNode;
  className?: string;
  /** Optional callback to hide/close the side panel on desktop. */
  onClose?: () => void;
  /** Accessible label for the close action (defaults to "Hide panel"). */
  closeLabel?: string;
}

/**
 * Shared desktop study panel (reader Study Guide, grammar "don't mix these up"):
 * a right-hand, independently scrollable companion column beside a screen's
 * content column. Screens own the panel content and its data; the panel itself
 * is presentation only and carries no bottom fade — a screen's bottom dock or
 * footer is expected to live inside the content column beside it.
 */
export function StudySidePanel({
  ariaLabel,
  title,
  children,
  className,
  onClose,
  closeLabel = 'Hide panel',
}: StudySidePanelProps) {
  return (
    <aside
      aria-label={ariaLabel}
      className={cn(
        'hidden lg:flex w-72 xl:w-80 shrink-0 flex-col min-h-0 pt-6 mr-4 xl:mr-6 z-20 overflow-y-auto overscroll-contain pr-1 custom-scrollbar',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-ui-ink-strong">{title}</p>
        {onClose && (
          <IconActionButton
            size="sm"
            variant="quiet"
            onClick={onClose}
            icon={<AppIcon name="close" size={16} />}
            label={closeLabel}
            title={closeLabel}
            className="text-ui-muted-strong hover:text-ui-ink -mr-1"
          />
        )}
      </div>
      <div className="flex flex-col gap-3 pb-4">{children}</div>
    </aside>
  );
}
