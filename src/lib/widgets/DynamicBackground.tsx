import { memo } from 'react';

interface DynamicBackgroundProps {
  variant?: 'default' | 'practice';
}

export const DynamicBackground = memo(function DynamicBackground({ variant = 'default' }: DynamicBackgroundProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 transition-colors duration-300 ${variant === 'practice' ? 'bg-ui-practice-canvas' : 'bg-ui-canvas'}`} />
  );
});
