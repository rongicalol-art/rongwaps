import type { ButtonHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, type AppIconName } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

/**
 * Quiet resting look, the destructive exit action, and the selected state of a
 * toggle. `selected` carries no hover treatment, matching the active pill.
 */
const DOCK_BUTTON_TONES = {
  default: 'text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong',
  danger: 'text-ui-muted-strong hover:bg-feedback-danger/10 hover:text-feedback-danger',
  selected: 'text-white',
} as const;

interface WritingDockButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  icon: AppIconName;
  /** Screen-reader text, also the default tooltip. */
  label: string;
  /** Longer accessible name when the tooltip wording is too terse to announce. */
  ariaLabel?: string;
  onClick?: () => void;
  /** `grow` shares the row; `fixed` is a square 40px control. */
  layout?: 'grow' | 'fixed';
  tone?: keyof typeof DOCK_BUTTON_TONES;
  className?: string;
  iconClassName?: string;
  /** Renders the layout-animated selected pill behind the icon. */
  activePillLayoutId?: string;
}

/**
 * One control of the writing dock. The dock repeats this button five times, so
 * the anatomy (resting classes, press-scale wrapper, icon sizing, screen-reader
 * label) lives here and each call site only declares its icon, wording and
 * variant.
 */
export function WritingDockButton({
  icon,
  label,
  ariaLabel,
  title,
  onClick,
  layout = 'grow',
  tone = 'default',
  className,
  iconClassName,
  activePillLayoutId,
  disabled,
  ...buttonProps
}: WritingDockButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      {...buttonProps}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={ariaLabel ?? label}
      className={cn(
        'group relative inline-flex h-10 items-center justify-center rounded-control outline-none select-none transition-colors duration-150 focus-ring',
        layout === 'grow' ? 'min-w-0 flex-1 px-2' : 'w-10',
        DOCK_BUTTON_TONES[tone],
        disabled && 'cursor-not-allowed',
        className,
      )}
    >
      {activePillLayoutId && (
        <motion.div
          layoutId={activePillLayoutId}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  stiffness: 450,
                  damping: 34,
                  mass: 0.8,
                }
          }
          className="absolute inset-0 rounded-control border-b-[length:var(--depth-sm)] border-brand-primary-edge bg-brand-primary shadow-ambient-sm"
        />
      )}
      <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
        <AppIcon
          name={icon}
          size={24}
          className={cn('h-6 w-6 transition-transform group-hover:scale-105', iconClassName)}
        />
        <span className="sr-only">{label}</span>
      </span>
    </button>
  );
}
