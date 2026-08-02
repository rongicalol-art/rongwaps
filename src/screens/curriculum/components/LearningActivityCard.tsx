import { AppIcon, Soft3DButton, type AppIconName } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface LearningActivityCardProps {
  label: string;
  title: string;
  description: string;
  icon: AppIconName;
  iconClassName: string;
  iconBackgroundClassName: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function LearningActivityCard({
  label,
  title,
  description,
  icon,
  iconClassName,
  iconBackgroundClassName,
  disabled = false,
  onClick,
}: LearningActivityCardProps) {
  return (
    <Soft3DButton
      type="button"
      variant="custom"
      depth="sm"
      disabled={disabled}
      onClick={onClick}
      className="relative z-10 min-h-[106px] items-stretch justify-start rounded-[17px] border-ui-border bg-ui-surface px-3.5 py-3 text-left normal-case tracking-normal shadow-none hover:scale-[1.01] lg:min-h-[clamp(88px,12.5dvh,106px)] lg:px-[clamp(0.65rem,1.45dvh,0.875rem)] lg:py-[clamp(0.55rem,1.35dvh,0.75rem)]"
    >
      <span className="flex w-full min-w-0 items-start gap-2.5">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] lg:h-[clamp(34px,5dvh,40px)] lg:w-[clamp(34px,5dvh,40px)]',
            disabled ? 'bg-ui-border text-ui-muted' : iconBackgroundClassName,
            !disabled && iconClassName,
          )}
        >
          <AppIcon name={disabled ? 'lock' : icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-ui-muted">
            {label}
          </span>
          <span className="mt-0.5 block text-[14px] font-black leading-tight text-ui-ink-strong lg:text-[clamp(12px,1.75dvh,14px)]">
            {title}
          </span>
          <span className="mt-1 block line-clamp-2 text-[11px] font-bold leading-tight text-ui-muted-strong lg:mt-[clamp(0.15rem,0.7dvh,0.25rem)] lg:text-[clamp(10px,1.35dvh,11px)]">
            {description}
          </span>
        </span>
      </span>
    </Soft3DButton>
  );
}
