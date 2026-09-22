import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'pulse' | 'shimmer';
}

export function Skeleton({ className, variant = 'shimmer', ...props }: SkeletonProps) {
  if (variant === 'pulse') {
    return (
      <div
        className={cn("animate-pulse rounded-full bg-ui-divider/70", className)}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-ui-divider/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ui-surface/50 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
