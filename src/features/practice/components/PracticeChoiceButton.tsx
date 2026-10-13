import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { DESIGN_TOKENS } from '../../../data/designTokens';
import { cn } from '../../../utils/cn';

export type PracticeChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';

/** The button state for a choice once an answer may have been checked. */
export function getPracticeChoiceState(isSelected: boolean, isChecked: boolean, isCorrectOption: boolean): PracticeChoiceState {
  if (isSelected && !isChecked) return 'selected';
  if (isChecked && isCorrectOption) return 'correct';
  if (isChecked && isSelected) return 'wrong';
  return isChecked ? 'muted' : 'idle';
}

interface PracticeChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Number badge (keyboard shortcut). Omit with `compact` for tiles in a grid. */
  index?: number;
  /** Centred content, no badge, tighter padding. */
  compact?: boolean;
  children: ReactNode;
  state?: PracticeChoiceState;
  selectedClassName?: string;
  selectedEdgeColor?: string;
}

const edgeClasses: Record<PracticeChoiceState, string> = {
  idle: 'bg-[var(--choice-edge,var(--color-ui-border))]',
  selected: 'bg-[var(--choice-edge,var(--color-brand-primary-edge))]',
  correct: 'bg-feedback-success',
  wrong: 'bg-feedback-danger',
  muted: 'bg-ui-border',
};

const surfaceClasses: Record<PracticeChoiceState, string> = {
  idle: 'border-2 border-ui-border bg-ui-surface text-ui-ink hover:bg-ui-hover group-active:translate-y-[length:var(--depth-md)]',
  selected: 'border-2 border-brand-primary bg-brand-primary-soft text-brand-primary-deep group-active:translate-y-[length:var(--depth-md)]',
  correct: 'border-2 border-feedback-success bg-feedback-success-surface text-ui-ink-strong translate-y-[length:var(--depth-md)]',
  wrong: 'border-2 border-feedback-danger bg-feedback-danger-surface text-ui-ink-strong translate-y-[length:var(--depth-md)]',
  muted: 'border-2 border-ui-border bg-ui-surface text-ui-muted opacity-75 translate-y-[length:var(--depth-md)]',
};

const badgeClasses: Record<PracticeChoiceState, string> = {
  idle: 'border-ui-divider text-ui-muted',
  selected: 'border-current text-current',
  correct: 'border-feedback-success text-feedback-success',
  wrong: 'border-feedback-danger text-feedback-danger',
  muted: 'border-ui-divider text-ui-muted',
};

export function PracticeChoiceButton({
  index,
  compact = false,
  children,
  state = 'idle',
  selectedClassName,
  selectedEdgeColor,
  className,
  style,
  ...buttonProps
}: PracticeChoiceButtonProps) {
  const isRaised = state === 'idle' || state === 'selected';
  const edgeColor = state === 'selected'
    ? selectedEdgeColor ?? DESIGN_TOKENS.color.brand.primary
    : DESIGN_TOKENS.color.border;

  return (
    <button
      type="button"
      className={cn(
        'group relative flex w-full p-0 border-none bg-transparent rounded-control outline-none select-none text-left focus-ring',
        state === 'correct' && 'rw-choice-correct',
        state === 'wrong' && 'rw-choice-wrong',
        className,
      )}
      style={{
        ...(isRaised && edgeColor ? ({ '--choice-edge': edgeColor } as CSSProperties) : {}),
        ...style,
      }}
      {...buttonProps}
    >
      {/* Stationary 3D Edge / Base (Bottom border stays fixed) */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 top-[length:var(--depth-md)] rounded-[inherit]',
          edgeClasses[state],
        )}
      />

      {/* Moving Front Surface (Pushes down towards baseline on active) */}
      <span
        className={cn(
          'relative flex w-full select-none items-center rounded-[inherit] outline-none mb-[length:var(--depth-md)]',
          compact ? 'justify-center px-3 py-4' : 'px-6 py-4',
          'transition-[transform,background-color,border-color,color] duration-75',
          surfaceClasses[state],
          state === 'selected' && selectedClassName,
        )}
      >
        {!compact && index !== undefined && (
        <span
          className={cn(
            'mr-4 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black',
            badgeClasses[state],
          )}
        >
          {index + 1}
        </span>
        )}
        <span className={cn('flex-1 text-[19px] font-bold leading-tight', compact ? 'text-center' : 'text-left')}>
          {children}
        </span>
      </span>
    </button>
  );
}
