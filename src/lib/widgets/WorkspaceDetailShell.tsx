import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { useModalFocus } from '../../hooks/useModalFocus';
import { ScreenHeader } from './ScreenHeader';

export interface WorkspaceDetailShellProps {
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
  children: ReactNode;
}

export function WorkspaceDetailShell({
  ariaLabel,
  title,
  centerContent,
  onClose,
  onBack,
  rightAction,
  zIndexClassName = 'z-[400]',
  className,
  headerClassName,
  contentClassName,
  contentInnerClassName,
  maxWidthClassName = 'max-w-[1100px]',
  children,
}: WorkspaceDetailShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const modalFocusProps = useModalFocus({
    containerRef,
    isActive: true,
    onEscape: onBack ?? onClose,
  });

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={modalFocusProps.onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      className={cn(
        'absolute inset-0 flex h-full w-full flex-col overflow-hidden bg-ui-practice-canvas font-sans outline-none pointer-events-auto',
        zIndexClassName,
        className,
      )}
    >
      <main className={cn('custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto bg-transparent', contentClassName)}>
        <ScreenHeader
          onClose={onClose}
          onBack={onBack}
          title={title}
          centerContent={centerContent}
          rightAction={rightAction}
          maxWidth="none"
          className={cn(
            'sticky top-0 z-20 w-full max-w-full shrink-0 border-b-0 bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px] px-4 shadow-none sm:px-6 lg:px-10',
            headerClassName,
          )}
        />
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          className={cn(
            'relative mx-auto min-h-full w-full px-4 py-5 pb-12 sm:px-6 sm:py-7 lg:px-8 lg:py-9',
            maxWidthClassName,
            contentInnerClassName,
          )}
        >
          {children}
        </motion.div>
      </main>
    </motion.div>
  );
}
