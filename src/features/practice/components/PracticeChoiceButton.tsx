import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { DESIGN_TOKENS } from '../../../data/designTokens';
import { cn } from '../../../utils/cn';

export type PracticeChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';

interface PracticeChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  index: number;
  children: ReactNode;
  state?: PracticeChoiceState;
  selectedClassName?: string;
  selectedEdgeColor?: string;
}

const edgeClasses: Record<PracticeChoiceState, string> = {
  idle: 'bg-[var(--choice-edge,var(--color-ui-border))]',
  selected: 'bg-[var(--choice-edge,var(--color-brand-primary-edge))]',
  correct: 'bg-feedback-success-edge',
  wrong: 'bg-feedback-danger-edge',
  muted: 'bg-ui-border',
};

const surfaceClasses: Record<PracticeChoiceState, string> = {
  idle: 'border-2 border-ui-border bg-ui-surface text-ui-ink hover:bg-ui-hover group-active:translate-y-[length:var(--depth-md)]',
  selected: 'border-2 border-brand-primary bg-brand-primary-soft text-brand-primary-deep group-active:translate-y-[length:var(--depth-md)]',
  correct: 'border-2 border-feedback-success-edge bg-feedback-success-surface text-feedback-success-edge translate-y-[length:var(--depth-md)]',
  wrong: 'border-2 border-feedback-danger-edge bg-feedback-danger-surface text-feedback-danger-edge translate-y-[length:var(--depth-md)]',
  muted: 'border-2 border-ui-border bg-ui-surface text-ui-muted opacity-60 translate-y-[length:var(--depth-md)]',
};

export function PracticeChoiceButton({
  index,
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
  const hasEmphasizedNumber = state === 'selected' || state === 'correct' || state === 'wrong';

  return (
    <button
      type="button"
      className={cn(
        'group relative flex w-full p-0 border-none bg-transparent rounded-control outline-none select-none text-left focus-ring',
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
          'relative flex w-full select-none items-center rounded-[inherit] px-6 py-4 outline-none mb-[length:var(--depth-md)]',
          'transition-[transform,background-color,border-color,color] duration-75',
          surfaceClasses[state],
          state === 'selected' && selectedClassName,
        )}
      >
        <span
          className={cn(
            'mr-4 w-8 shrink-0 text-sm font-bold',
            hasEmphasizedNumber ? 'text-current' : 'text-ui-muted',
          )}
        >
          {index + 1}
        </span>
        <span className="flex-1 text-left text-[19px] font-bold leading-tight">
          {children}
        </span>
      </span>
    </button>
  );
}
