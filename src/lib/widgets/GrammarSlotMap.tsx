import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface GrammarSlotMapItem {
  label: string;
  detail?: string;
}

export interface GrammarSlotMapProps extends HTMLAttributes<HTMLDivElement> {
  slots: GrammarSlotMapItem[];
  activeIndex?: number;
  gridClassName?: string;
}

export function GrammarSlotMap({
  slots,
  activeIndex = 0,
  gridClassName,
  className,
  ...props
}: GrammarSlotMapProps) {
  return (
    <div
      className={cn('grid overflow-hidden rounded-[14px] bg-brand-primary', gridClassName, className)}
      {...props}
    >
      {slots.map((slot, index) => (
        <div
          key={`${slot.label}-${index}`}
          className={cn(
            'min-w-0 border-b-4 border-l border-b-brand-primary-edge border-l-ui-surface/20 px-2 py-3 text-center text-ui-surface first:border-l-0 sm:px-4',
            index === activeIndex && 'border-b-brand-primary-deep bg-brand-primary-edge',
          )}
        >
          <span className="block text-[11px] font-black leading-tight sm:text-xs">{slot.label}</span>
          {slot.detail && (
            <span className="mt-1 block text-[10px] font-bold leading-tight text-ui-surface/75">
              {slot.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
