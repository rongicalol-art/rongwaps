import type { ButtonHTMLAttributes, ReactNode } from 'react';
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

const stateClasses: Record<PracticeChoiceState, string> = {
  idle: 'border-ui-border bg-ui-surface text-ui-ink hover:bg-ui-hover',
  selected: '',
  correct: 'translate-y-[length:var(--depth-md)] border-feedback-success-edge bg-feedback-success-surface text-feedback-success-edge',
  wrong: 'translate-y-[length:var(--depth-md)] border-feedback-danger-edge bg-feedback-danger-surface text-feedback-danger-edge',
  muted: 'translate-y-[length:var(--depth-md)] border-ui-border bg-ui-surface text-ui-muted opacity-80',
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
        'relative flex w-full select-none items-center rounded-control border-b-[length:var(--depth-md)] px-6 py-4 outline-none',
        'transition-[transform,background-color,border-color,color] duration-150 focus-ring',
        stateClasses[state],
        state === 'selected' && selectedClassName,
        isRaised && 'active:translate-y-[length:var(--depth-md)] active:border-b-0',
        className,
      )}
      style={{
        borderBottomColor: isRaised ? edgeColor : undefined,
        ...style,
      }}
      {...buttonProps}
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
    </button>
  );
}
