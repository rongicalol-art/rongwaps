import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface BrandWordmarkProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
}

export function BrandWordmark({
  name = "Ron's Mandarin",
  className,
  ...props
}: BrandWordmarkProps) {
  const [owner, ...subjectParts] = name.split(' ');
  const subject = subjectParts.join(' ');

  return (
    <div
      aria-label={name}
      className={cn('flex min-w-0 items-center gap-2.5', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] border-b-2 border-[#DFA900] bg-feedback-warning"
      >
        <span className="font-chinese translate-y-px text-[23px] font-bold leading-none text-ui-ink">
          文
        </span>
      </span>

      <span aria-hidden="true" className="min-w-0 text-[19px] font-black leading-none">
        <span className="text-ui-ink">{owner}</span>{' '}
        <span className="text-[#D99B00]">{subject}</span>
      </span>
    </div>
  );
}
