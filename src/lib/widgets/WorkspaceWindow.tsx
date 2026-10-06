import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

export type WorkspaceWindowTone = 'canvas' | 'practice';
/** `window`: study windows (Reader, Grammar). `window-detail`: a detail that
 *  opens over a window (dictionary word, character breakdown, settings). */
export type WorkspaceWindowLayer = 'window' | 'window-detail';

const TONE_CLASS: Record<WorkspaceWindowTone, string> = {
  canvas: 'bg-ui-canvas',
  practice: 'bg-ui-practice-canvas',
};

const LAYER_CLASS: Record<WorkspaceWindowLayer, string> = {
  window: 'z-window',
  'window-detail': 'z-window-detail',
};

export interface WorkspaceWindowProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  tone?: WorkspaceWindowTone;
  layer?: WorkspaceWindowLayer;
  /** Classes for the content box (the area right of the sidebar). */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * The one frame for any surface that takes over the workspace.
 *
 * It paints the whole viewport in its tone, so the gutter behind the floating
 * sidebar never shows a lower surface, and lays its children out in the content
 * box right of `--workspace-nav-width`. The sidebar (`z-shell`) stays above.
 * Children may fill the content box with `absolute inset-0`.
 */
export const WorkspaceWindow = forwardRef<HTMLDivElement, WorkspaceWindowProps>(function WorkspaceWindow(
  {
    tone = 'canvas',
    layer = 'window',
    className,
    contentClassName,
    style,
    initial,
    animate,
    exit,
    transition,
    children,
    ...rest
  },
  ref,
) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={initial ?? { opacity: 0 }}
      animate={animate ?? { opacity: 1 }}
      exit={exit ?? { opacity: 0 }}
      transition={transition ?? { duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      {...rest}
      style={{ paddingLeft: 'var(--workspace-nav-width)', ...style }}
      className={cn(
        'workspace-shift fixed inset-0 flex flex-col font-sans outline-none',
        LAYER_CLASS[layer],
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col', contentClassName)}>{children}</div>
    </motion.div>
  );
});
