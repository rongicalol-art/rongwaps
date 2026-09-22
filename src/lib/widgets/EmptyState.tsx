import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { AppIcon, type AppIconName } from './AppIcon';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  /** Icon name or custom React node to display in the circular badge. */
  icon?: AppIconName | ReactNode;
  /** Primary headline for the empty state. */
  title: ReactNode;
  /** Secondary explanatory description. */
  description?: ReactNode;
  /** Action slot (e.g. an ActionButton). */
  action?: ReactNode;
  /** Custom background class for the icon circle (e.g. 'bg-feedback-warning/15'). */
  iconBg?: string;
  /** Custom text color class for the icon (e.g. 'text-feedback-warning-edge'). */
  iconColor?: string;
  /** Reduces vertical padding and icon size for compact contexts (e.g. inside popovers or split lists). */
  compact?: boolean;
  /** Additional container classes. */
  className?: string;
}

export function EmptyState({
  icon = 'sparkles',
  title,
  description,
  action,
  iconBg,
  iconColor,
  compact = false,
  className,
}: EmptyStateProps) {
  const isIconName = typeof icon === 'string';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full shrink-0',
          compact ? 'mb-3.5 h-14 w-14' : 'mb-5 h-20 w-20',
          iconBg || 'bg-brand-primary-soft'
        )}
      >
        {isIconName ? (
          <AppIcon
            name={icon as AppIconName}
            size={compact ? 26 : 38}
            className={iconColor || 'text-brand-primary'}
          />
        ) : (
          icon
        )}
      </div>

      <h3
        className={cn(
          'font-black text-ui-ink-strong tracking-tight',
          compact ? 'mb-1 text-base' : 'mb-2 text-xl'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'font-bold leading-relaxed text-ui-muted-strong',
            compact ? 'mb-4 max-w-[240px] text-xs' : 'mb-6 max-w-[280px] text-sm'
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-1 flex items-center justify-center">{action}</div>}
    </motion.div>
  );
}
