import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton } from './ActionButton';
import { AppIcon, type AppIconName } from './AppIcon';
import { cn } from '../../utils/cn';

export interface TopToastProps {
  open: boolean;
  title: string;
  message?: string;
  icon?: AppIconName;
  /** Quiet button on the left. */
  dismissLabel?: string;
  onDismiss: () => void;
  /** The one primary action. */
  actionLabel: string;
  onAction: () => void;
  /** Flow in place instead of floating at the top (DEV previews). */
  inline?: boolean;
}

/**
 * A notice card that drops in from the top, the same card, spring and corner as the quiz-invite
 * toast: an icon with the title and message, then a quiet dismiss and the one primary action.
 */
export function TopToast({ open, title, message, icon = 'bell', dismissLabel = 'Not now', onDismiss, actionLabel, onAction, inline = false }: TopToastProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          initial={reduce ? false : { opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className={cn(
            'flex flex-col gap-3 rounded-feature border-2 border-b-[6px] border-ui-border bg-ui-surface p-4',
            inline
              ? 'relative max-w-sm'
              : 'fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-popover md:left-auto md:right-6 md:w-[24rem]',
          )}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-compact bg-brand-primary-soft text-brand-primary">
              <AppIcon name={icon} size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black text-ui-ink-strong">{title}</span>
              {message && <span className="mt-0.5 block text-sm font-bold leading-snug text-ui-muted-strong">{message}</span>}
            </span>
          </div>
          <div className="flex gap-2.5">
            <ActionButton variant="secondary" size="md" fullWidth onClick={onDismiss}>{dismissLabel}</ActionButton>
            <ActionButton variant="primary" size="md" fullWidth onClick={onAction}>{actionLabel}</ActionButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
