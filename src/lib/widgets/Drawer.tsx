import React, { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useReducedMotion, type DragControls } from 'motion/react';
import { cn } from '../../utils/cn';
import { useModalFocus } from '../../hooks/useModalFocus';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';

export type DrawerTone = 'surface' | 'practice' | 'canvas';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export const DRAWER_SIZE_CLASSES: Record<DrawerSize, string> = {
  sm: 'sm:max-w-md sm:mx-auto',
  md: 'sm:max-w-lg md:max-w-xl sm:mx-auto',
  lg: 'sm:max-w-2xl md:max-w-3xl sm:mx-auto',
  xl: 'sm:max-w-4xl sm:mx-auto',
  full: 'w-full',
};

export const DRAWER_TONE_CONTAINER_CLASSES: Record<DrawerTone, string> = {
  surface: 'bg-ui-surface border-t-2 border-x-2 border-ui-border rounded-t-modal',
  practice: 'bg-ui-practice-canvas rounded-t-3xl',
  canvas: 'bg-ui-canvas rounded-t-3xl',
};

export const DRAWER_TONE_STICKY_GRADIENTS: Record<DrawerTone, string> = {
  surface: 'from-ui-surface via-ui-surface/95 to-transparent',
  practice: 'from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent',
  canvas: 'from-ui-canvas via-ui-canvas/95 to-transparent',
};

export interface DrawerRootProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  tone?: DrawerTone;
  workspaceBound?: boolean;
  zIndexClassName?: string;
  portalTarget?: HTMLElement | null;
  children: ReactNode;
}

export interface DrawerContentProps {
  size?: DrawerSize;
  heightClassName?: string;
  dragToDismiss?: boolean;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

interface DrawerContextValue {
  open: boolean;
  onClose: () => void;
  dragControls: DragControls;
  titleId: string;
  tone: DrawerTone;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('Drawer subcomponents must be used within <Drawer.Root>');
  return ctx;
}

export function DrawerRoot({
  open,
  onOpenChange,
  onClose,
  tone = 'surface',
  workspaceBound = true,
  zIndexClassName = 'z-drawer',
  portalTarget,
  children,
}: DrawerRootProps) {
  const dragControls = useDragControls();
  const titleId = useId();
  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };
  const [portalNode] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? (portalTarget ?? document.body) : null
  );

  const output = (
    <DrawerContext.Provider value={{ open, onClose: handleClose, dragControls, titleId, tone }}>
      <AnimatePresence>
        {open && (
          <div
            className={cn(
              'fixed inset-0 pointer-events-none',
              zIndexClassName,
              workspaceBound && 'workspace-window'
            )}
          >
            {children}
          </div>
        )}
      </AnimatePresence>
    </DrawerContext.Provider>
  );
  return portalNode ? createPortal(output, portalNode) : output;
}

export function DrawerBackdrop({ className }: { className?: string }) {
  const { onClose } = useDrawerContext();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onClick={onClose}
      className={cn(
        'absolute inset-0 bg-ui-ink-strong/35 backdrop-blur-sm pointer-events-auto cursor-pointer',
        className
      )}
    />
  );
}

export function DrawerContent({
  size = 'md',
  heightClassName = 'max-h-[85vh]',
  dragToDismiss = true,
  ariaLabel,
  className,
  children,
}: DrawerContentProps) {
  const { open, onClose, dragControls, titleId, tone } = useDrawerContext();
  const drawerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const modalFocus = useModalFocus({ containerRef: drawerRef, isActive: open, onEscape: onClose });

  return (
    <motion.div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
      initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
      drag={dragToDismiss ? 'y' : false}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0 }}
      dragElastic={0.2}
      onDragEnd={(_e, info) => {
        if (info.offset.y > 100 || info.velocity.y > 500) onClose();
      }}
      className={cn(
        'absolute bottom-0 left-0 right-0 shadow-ambient-lg flex flex-col pointer-events-auto overflow-hidden',
        DRAWER_TONE_CONTAINER_CLASSES[tone],
        DRAWER_SIZE_CLASSES[size],
        heightClassName,
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function DrawerHandle({ className }: { className?: string }) {
  const { dragControls } = useDrawerContext();
  return (
    <div
      className={cn('w-full flex justify-center py-2 shrink-0 cursor-grab active:cursor-grabbing', className)}
      onPointerDown={(e) => dragControls.start(e)}
      style={{ touchAction: 'none' }}
    >
      <div className="w-12 h-1.5 bg-ui-divider rounded-full" />
    </div>
  );
}

export function DrawerHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex items-center justify-between px-6 pb-4 shrink-0', className)}>{children}</div>;
}

export function DrawerStickyHeader({ className, children }: { className?: string; children: ReactNode }) {
  const { tone } = useDrawerContext();
  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex w-full shrink-0 flex-col pb-2 pt-2 backdrop-blur-[2px] bg-gradient-to-b',
        DRAWER_TONE_STICKY_GRADIENTS[tone],
        className
      )}
    >
      {children}
    </div>
  );
}

export function DrawerTitle({
  variant = 'standard',
  className,
  children,
}: {
  variant?: 'standard' | 'eyebrow';
  className?: string;
  children: ReactNode;
}) {
  const { titleId } = useDrawerContext();
  const base =
    variant === 'eyebrow'
      ? 'text-xs font-black uppercase tracking-wider text-ui-ink-strong'
      : 'text-xl font-extrabold text-ui-ink tracking-normal';
  return (
    <h2 id={titleId} className={cn(base, className)}>
      {children}
    </h2>
  );
}

export function DrawerClose({
  label = 'Close drawer',
  className,
  onClick,
}: {
  label?: string;
  className?: string;
  onClick?: () => void;
}) {
  const { onClose } = useDrawerContext();
  return (
    <IconActionButton
      icon={<AppIcon name="close" size={20} />}
      label={label}
      size="md"
      onClick={onClick ?? onClose}
      className={className}
    />
  );
}

export function DrawerBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 pb-safe-area custom-scrollbar min-h-0', className)}>
      {children}
    </div>
  );
}

export type BottomDrawerTone = DrawerTone;
export type BottomDrawerSize = DrawerSize;
export type BottomDrawerHeaderVariant = 'standard' | 'sticky-fade';
export type BottomDrawerTitleVariant = 'standard' | 'eyebrow';

export interface DrawerProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  title?: ReactNode;
  topAccessory?: ReactNode;
  ariaLabel?: string;
  workspaceBound?: boolean;
  tone?: DrawerTone;
  size?: DrawerSize;
  headerVariant?: BottomDrawerHeaderVariant;
  titleVariant?: BottomDrawerTitleVariant;
  heightClassName?: string;
  closeLabel?: string;
  showCloseButton?: boolean;
  dragToDismiss?: boolean;
  zIndexClassName?: string;
  portalTarget?: HTMLElement | null;
}

export type BottomDrawerProps = DrawerProps;

/**
 * Unified Drawer component: can be used as a simple single-tag drawer
 * `<Drawer isOpen={open} onClose={close} title="...">...</Drawer>`
 * OR composed using subcomponents:
 * `<Drawer.Root> <Drawer.Backdrop /> <Drawer.Content> ... </Drawer.Root>`
 */
export function Drawer({
  isOpen,
  open,
  onClose,
  children,
  className,
  contentClassName,
  title,
  topAccessory,
  ariaLabel,
  workspaceBound = true,
  tone = 'surface',
  size = 'md',
  headerVariant = 'standard',
  titleVariant = 'standard',
  heightClassName = 'max-h-[85vh]',
  closeLabel = 'Close drawer',
  showCloseButton = true,
  dragToDismiss = true,
  zIndexClassName = 'z-drawer',
  portalTarget,
}: DrawerProps) {
  const isVisible = isOpen ?? open ?? false;
  const isStickyFade = headerVariant === 'sticky-fade';
  const hasHeader = Boolean(title || showCloseButton);
  const HeaderContainer = isStickyFade ? DrawerStickyHeader : React.Fragment;

  return (
    <DrawerRoot
      open={isVisible}
      onClose={onClose}
      tone={tone}
      workspaceBound={workspaceBound}
      zIndexClassName={zIndexClassName}
      portalTarget={portalTarget}
    >
      <DrawerBackdrop />
      <DrawerContent
        size={size}
        heightClassName={heightClassName}
        dragToDismiss={dragToDismiss}
        ariaLabel={title ? undefined : (ariaLabel ?? 'Drawer')}
        className={className}
      >
        {topAccessory && (
          <div className="absolute bottom-[calc(100%-18px)] left-0 right-0 w-full flex justify-start z-10 pointer-events-none px-4 md:px-6">
            <div className="pointer-events-auto w-full">{topAccessory}</div>
          </div>
        )}

        <HeaderContainer>
          <DrawerHandle className={isStickyFade ? 'pb-2' : 'pt-4 pb-2'} />
          {hasHeader && (
            <div className={cn('flex items-center justify-between', isStickyFade ? 'px-4 sm:px-6' : 'px-6 pb-4')}>
              {title &&
                (typeof title === 'string' ? (
                  <DrawerTitle variant={titleVariant}>{title}</DrawerTitle>
                ) : (
                  title
                ))}
              {showCloseButton && (
                <DrawerClose
                  label={closeLabel}
                  className={isStickyFade ? undefined : 'h-11 w-11 rounded-full'}
                />
              )}
            </div>
          )}
        </HeaderContainer>

        <DrawerBody className={cn(contentClassName)}>{children}</DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  );
}

// Attach subcomponents directly to Drawer
Drawer.Root = DrawerRoot;
Drawer.Backdrop = DrawerBackdrop;
Drawer.Content = DrawerContent;
Drawer.Handle = DrawerHandle;
Drawer.Header = DrawerHeader;
Drawer.StickyHeader = DrawerStickyHeader;
Drawer.Title = DrawerTitle;
Drawer.Close = DrawerClose;
Drawer.Body = DrawerBody;

// Backward-compatible alias
export const BottomDrawer = Drawer;
