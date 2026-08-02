import type { ComponentProps } from 'react';
import { cn } from '../../utils/cn';
import { Card3D } from './Card3D';

export interface GraphPaperPanelProps extends ComponentProps<'div'> {
  gridSize?: 'compact' | 'roomy';
}

export function GraphPaperPanel({
  children,
  className,
  gridSize = 'roomy',
  ...props
}: GraphPaperPanelProps) {
  const gridClass = gridSize === 'compact' ? 'bg-[size:22px_22px]' : 'bg-[size:28px_28px]';

  return (
    <Card3D
      depth="md"
      className={cn(
        'overflow-hidden bg-white bg-[linear-gradient(to_right,rgba(229,229,229,0.55)_1px,transparent_1px),linear-gradient(to_bottom,rgba(229,229,229,0.55)_1px,transparent_1px)] shadow-none',
        gridClass,
        className,
      )}
      {...props}
    >
      {children}
    </Card3D>
  );
}
