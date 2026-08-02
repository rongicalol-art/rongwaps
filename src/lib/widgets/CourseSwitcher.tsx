import type React from 'react';
import { cn } from '../../utils/cn';
import { Soft3DButton } from './Soft3DButton';

export interface CourseSwitcherOption {
  id: number;
  label: string;
  accentBackgroundClassName: string;
  backgroundClassName?: string;
  edgeClassName: string;
}

export interface CourseSwitcherProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  options: CourseSwitcherOption[];
  onSelect: (id: number) => void;
  display?: 'labeled' | 'numberTiles';
  variant?: 'panel' | 'bare';
}

export function CourseSwitcher({
  options,
  onSelect,
  display = 'labeled',
  variant = 'panel',
  className,
  ...props
}: CourseSwitcherProps) {
  const isNumberTiles = display === 'numberTiles';

  return (
    <div
      role="group"
      aria-label="Choose a course book"
      className={cn(
        'grid gap-2.5',
        isNumberTiles ? 'grid-cols-4' : 'grid-cols-2',
        variant === 'panel' &&
          'rounded-[24px] border-b-[5px] border-ui-border bg-ui-canvas p-2.5 sm:grid-cols-4 sm:gap-3',
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <Soft3DButton
          key={option.id}
          type="button"
          variant="custom"
          depth="sm"
          onClick={() => onSelect(option.id)}
          aria-label={`Open ${option.label}`}
          className={cn(
            'group min-w-0 text-ui-ink-strong shadow-none',
            isNumberTiles
              ? 'aspect-square min-h-0 rounded-[18px] px-2 py-2 text-center normal-case tracking-normal'
              : 'min-h-[54px] justify-start gap-2.5 rounded-[16px] px-3 py-2 text-left normal-case tracking-normal sm:min-h-[58px]',
            option.backgroundClassName ?? 'bg-white',
            option.edgeClassName,
          )}
        >
          {isNumberTiles ? (
            <span className="text-[24px] font-black leading-none text-ui-ink-strong sm:text-[28px]">
              {option.id}
            </span>
          ) : (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-b-2 text-[15px] font-black text-white transition-transform group-active:translate-y-0.5',
                  option.accentBackgroundClassName,
                  option.edgeClassName,
                )}
              >
                {option.id}
              </span>
              <span className="min-w-0 truncate text-[13px] font-black">{option.label}</span>
            </>
          )}
        </Soft3DButton>
      ))}
    </div>
  );
}
