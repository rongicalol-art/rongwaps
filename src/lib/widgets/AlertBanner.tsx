import type { ReactNode } from 'react';
import { AppIcon, type AppIconName } from './AppIcon';
import { cn } from '../../utils/cn';

export type AlertVariant = 'danger' | 'warning' | 'info' | 'success';

export interface AlertBannerProps {
  /** The message text or React node to display. */
  message: ReactNode;
  /** Optional title heading before the message. */
  title?: string;
  /** Visual tone of the alert. Defaults to 'danger'. */
  variant?: AlertVariant;
  /** Optional callback when dismiss button is tapped. */
  onDismiss?: () => void;
  /** Optional action slot (e.g. retry button). */
  action?: ReactNode;
  /** ARIA role, defaults to 'alert' for danger, 'status' for others. */
  role?: 'alert' | 'status';
  /** Additional container classes. */
  className?: string;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    classes: string;
    icon: AppIconName;
    iconColor: string;
  }
> = {
  danger: {
    classes: 'border-feedback-danger-edge/30 bg-feedback-danger-surface text-feedback-danger-edge',
    icon: 'error',
    iconColor: 'text-feedback-danger',
  },
  warning: {
    classes: 'border-feedback-warning-edge/30 bg-feedback-warning-surface text-feedback-warning-edge',
    icon: 'lightbulb',
    iconColor: 'text-feedback-warning-edge',
  },
  info: {
    classes: 'border-brand-primary-edge/30 bg-brand-primary-soft text-brand-primary-deep',
    icon: 'lightbulb',
    iconColor: 'text-brand-primary',
  },
  success: {
    classes: 'border-feedback-success-edge/30 bg-feedback-success-surface text-feedback-success',
    icon: 'check',
    iconColor: 'text-feedback-success-edge',
  },
};

export function AlertBanner({
  message,
  title,
  variant = 'danger',
  onDismiss,
  action,
  role,
  className,
}: AlertBannerProps) {
  const config = VARIANT_CONFIG[variant];
  const computedRole = role ?? (variant === 'danger' ? 'alert' : 'status');

  return (
    <div
      role={computedRole}
      className={cn(
        'flex w-full items-start gap-3 rounded-control border-b-[length:var(--depth-sm)] px-4 py-3 text-sm font-bold',
        config.classes,
        className
      )}
    >
      <div className={cn('mt-0.5 shrink-0', config.iconColor)}>
        <AppIcon name={config.icon} size={18} />
      </div>

      <div className="min-w-0 flex-1">
        {title && <div className="font-black text-ui-ink-strong mb-0.5">{title}</div>}
        <div>{message}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 -mr-1 -mt-1 p-1 text-ui-muted hover:text-ui-ink focus-ring rounded-xs transition-colors"
        >
          <AppIcon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
