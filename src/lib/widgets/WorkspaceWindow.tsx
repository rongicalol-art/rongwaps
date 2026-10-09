import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';
import { getWindowMotion, type WindowMotionStyle } from './windowMotion';

export type WorkspaceWindowTone = 'canvas' | 'practice';
/** `overlay`: a hub page the study windows open over (lesson window). `window`:
 *  study windows (Reader, Grammar). `window-detail`: a detail that opens over a
 *  window (dictionary word, character breakdown, settings). */
export type WorkspaceWindowLayer = 'overlay' | 'window' | 'window-detail';

const TONE_CLASS: Record<WorkspaceWindowTone, string> = {
  canvas: 'bg-ui-canvas',
  practice: 'bg-ui-practice-canvas',
};

const LAYER_CLASS: Record<WorkspaceWindowLayer, string> = {
  overlay: 'z-overlay',
  window: 'z-window',
  'window-detail': 'z-window-detail',
};

/** Open/close motion each layer uses unless a window picks another style. */
const LAYER_MOTION: Record<WorkspaceWindowLayer, WindowMotionStyle> = {
  overlay: 'sheet',
  window: 'focus',
  'window-detail': 'pop',
};

export interface WorkspaceWindowProps
  extends Omit<HTMLMotionProps<'div'>, 'children' | 'initial' | 'animate' | 'exit' | 'transition'> {
  tone?: WorkspaceWindowTone;
  layer?: WorkspaceWindowLayer;
  /** Defaults by layer (see `windowMotion.ts`). */
  motionStyle?: WindowMotionStyle;
  /** False skips the enter animation, e.g. a screen replacing its own loader on the same canvas. */
  animateIn?: boolean;
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
    motionStyle = LAYER_MOTION[layer],
    animateIn = true,
    className,
    contentClassName,
    style,
    children,
    ...rest
  },
  ref,
) {
  const motionSpec = getWindowMotion(motionStyle, useReducedMotion());
  return (
    <motion.div
      ref={ref}
      initial={animateIn ? motionSpec.initial : false}
      animate={motionSpec.animate}
      exit={motionSpec.exit}
      transition={motionSpec.transition}
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
