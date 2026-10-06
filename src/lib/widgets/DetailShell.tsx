import { forwardRef, useRef, type CSSProperties, type ReactNode, type Ref, type UIEventHandler } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { useModalFocus } from '../../hooks/useModalFocus';
import { ScreenHeader } from './ScreenHeader';
import { WorkspaceWindow } from './WorkspaceWindow';

export type DetailShellTone = 'practice' | 'canvas';

export interface DetailShellRootProps {
  ariaLabel: string;
  tone?: DetailShellTone;
  /** Open as its own workspace window (`z-window-detail`, portaled to the
   *  body) instead of filling the nearest positioned host. */
  windowed?: boolean;
  zIndexClassName?: string;
  className?: string;
  style?: CSSProperties;
  onEscape?: () => void;
  portalTarget?: HTMLElement | null | false;
  children: ReactNode;
}

export interface DetailShellScrollerProps {
  ref?: Ref<HTMLDivElement>;
  onScroll?: UIEventHandler<HTMLDivElement>;
  className?: string;
  children: ReactNode;
}

export interface DetailShellContentProps {
  maxWidthClassName?: string;
  className?: string;
  children: ReactNode;
}

export function DetailShellRoot({
  ariaLabel,
  tone = 'practice',
  windowed = false,
  zIndexClassName = 'z-detail',
  className,
  style,
  onEscape,
  portalTarget = false,
  children,
}: DetailShellRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const modalFocus = useModalFocus({ containerRef, isActive: true, onEscape });
  const dialogProps = {
    ref: containerRef,
    role: 'dialog',
    'aria-modal': true,
    'aria-label': ariaLabel,
    tabIndex: -1,
    onKeyDown: modalFocus.onKeyDown,
  } as const;

  if (windowed) {
    const windowOutput = (
      <WorkspaceWindow {...dialogProps} layer="window-detail" tone={tone} style={style} className={className}>
        {children}
      </WorkspaceWindow>
    );
    return typeof document !== 'undefined' ? createPortal(windowOutput, portalTarget || document.body) : windowOutput;
  }

  const output = (
    <motion.div
      {...dialogProps}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      style={style}
      className={cn(
        'absolute inset-0 flex h-full w-full flex-col font-sans outline-none pointer-events-auto',
        tone === 'canvas' ? 'bg-ui-canvas' : 'bg-ui-practice-canvas',
        zIndexClassName,
        className
      )}
    >
      {children}
    </motion.div>
  );

  if (portalTarget && typeof document !== 'undefined') {
    return createPortal(output, portalTarget);
  }
  return output;
}

export const DetailShellScroller = forwardRef<HTMLDivElement, DetailShellScrollerProps>(
  function DetailShellScroller({ onScroll, className, children }, ref) {
    return (
      <main
        ref={ref}
        onScroll={onScroll}
        className={cn('custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto bg-transparent', className)}
      >
        {children}
      </main>
    );
  }
);

export function DetailShellContent({
  maxWidthClassName = 'max-w-[1100px]',
  className,
  children,
}: DetailShellContentProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
      className={cn(
        'relative mx-auto min-h-full w-full px-4 py-5 pb-12 sm:px-6 sm:py-7 lg:px-8 lg:py-9',
        maxWidthClassName,
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function DetailShellFloating({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}

export interface DetailShellProps {
  ariaLabel: string;
  title?: string;
  centerContent?: ReactNode;
  onClose?: () => void;
  onBack?: () => void;
  rightAction?: ReactNode;
  zIndexClassName?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  contentInnerClassName?: string;
  maxWidthClassName?: string;
  headerMaxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
  tone?: DetailShellTone;
  windowed?: boolean;
  style?: CSSProperties;
  scrollRef?: Ref<HTMLElement>;
  onScroll?: UIEventHandler<HTMLElement>;
  disableInnerSlide?: boolean;
  portalTarget?: HTMLElement | null | false;
  floatingContent?: ReactNode;
  children: ReactNode;
}


/**
 * Unified DetailShell component:
 * Single-tag usage: `<DetailShell title="..." onClose={...}>...</DetailShell>`
 * Compound usage: `<DetailShell.Root> <DetailShell.Scroller> ... </DetailShell.Root>`
 */
export function DetailShell({
  ariaLabel,
  title,
  centerContent,
  onClose,
  onBack,
  rightAction,
  zIndexClassName = 'z-detail',
  className,
  headerClassName,
  contentClassName,
  contentInnerClassName,
  maxWidthClassName = 'max-w-[1100px]',
  headerMaxWidth = 'none',
  tone = 'practice',
  windowed = false,
  style,
  scrollRef,
  onScroll,
  disableInnerSlide = false,
  portalTarget = false,
  floatingContent,
  children,
}: DetailShellProps) {
  return (
    <DetailShellRoot
      ariaLabel={ariaLabel}
      tone={tone}
      windowed={windowed}
      zIndexClassName={zIndexClassName}
      className={className}
      style={style}
      onEscape={onBack ?? onClose}
      portalTarget={portalTarget}
    >
      <DetailShellScroller
        ref={scrollRef as Ref<HTMLDivElement>}
        onScroll={onScroll as UIEventHandler<HTMLDivElement>}
        className={contentClassName}
      >
        <ScreenHeader
          variant="panel"
          tone={tone}
          onClose={onClose}
          onBack={onBack}
          title={title}
          centerContent={centerContent}
          rightAction={rightAction}
          maxWidth={headerMaxWidth}
          className={headerClassName}
        />

        {disableInnerSlide ? (
          children
        ) : (
          <DetailShellContent maxWidthClassName={maxWidthClassName} className={contentInnerClassName}>
            {children}
          </DetailShellContent>
        )}
      </DetailShellScroller>
      {floatingContent && <DetailShellFloating>{floatingContent}</DetailShellFloating>}
    </DetailShellRoot>
  );
}

// Attach subcomponents directly to DetailShell
DetailShell.Root = DetailShellRoot;
DetailShell.Scroller = DetailShellScroller;
DetailShell.Content = DetailShellContent;
DetailShell.Floating = DetailShellFloating;
