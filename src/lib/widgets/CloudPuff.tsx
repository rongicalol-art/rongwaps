import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CloudPuffProps extends HTMLAttributes<HTMLSpanElement> {
  /** Width override for a smaller puff (e.g. `w-44`); scales proportionally. */
  className?: string;
}

/**
 * Flat white puff-cloud silhouette for sky-themed decorative scenes.
 * Purely decorative — render it inside an `aria-hidden` container. Use
 * wrappers with `opacity-*`/`scale-*` to vary depth and size; the circles are
 * opaque white so scaling a wrapper (not the spans) keeps the silhouette
 * seam-free.
 */
export function CloudPuff({ className, ...props }: CloudPuffProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative block h-16 w-52', className)}
      {...props}
    >
      <span className="absolute inset-x-0 bottom-0 h-10 rounded-full bg-ui-surface" />
      <span className="absolute -left-2 bottom-2 h-14 w-14 rounded-full bg-ui-surface" />
      <span className="absolute right-1 bottom-3 h-10 w-10 rounded-full bg-ui-surface" />
      <span className="absolute -left-1 top-2 h-8 w-8 rounded-full bg-ui-surface" />
    </span>
  );
}
