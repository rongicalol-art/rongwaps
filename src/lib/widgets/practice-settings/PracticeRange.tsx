import type React from 'react';
import { cn } from '../../../utils/cn';

export interface PracticeRangeProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  valueLabel?: string;
  startLabel?: string;
  endLabel?: string;
}

export function PracticeRange({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueLabel = String(value),
  startLabel,
  endLabel,
  className,
  ...props
}: PracticeRangeProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <label className={cn('block rounded-[18px] bg-ui-surface px-4 py-4', className)}>
      <span className="mb-3 flex items-center justify-between gap-3">
        <span className="font-extrabold text-ui-ink">{label}</span>
        <span className="rounded-full bg-[#EAF7FF] px-3 py-1 text-xs font-black text-[#1899D6]">{valueLabel}</span>
      </span>
      <span className="relative block h-7">
        <span className="absolute left-0 right-0 top-2 h-3 rounded-full bg-ui-border" />
        <span className="absolute left-0 top-2 h-3 rounded-full bg-[#1CB0F6]" style={{ width: `${percentage}%` }} />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          className="absolute inset-x-0 top-0 h-7 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#1CB0F6] [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-8px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#1CB0F6] [&::-webkit-slider-thumb]:shadow-md focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-[#BFE9FF]"
          {...props}
        />
      </span>
      {(startLabel || endLabel) && (
        <span className="mt-1 flex justify-between text-[11px] font-extrabold text-ui-muted">
          <span>{startLabel}</span><span>{endLabel}</span>
        </span>
      )}
    </label>
  );
}
