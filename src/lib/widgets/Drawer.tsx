import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, type DragControls } from 'motion/react';
import { cn } from '../../utils/cn';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
  surface: 'bg-ui-surface rounded-t-modal',
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
  onClose: () => void;
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
  /** md+ presentation: centered `card` (default) or a right-docked `side` panel. */
  mdPlacement?: 'card' | 'side';
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
  workspaceBound: boolean;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('Drawer subcomponents must be used within <Drawer.Root>');
  return ctx;
}

export function DrawerRoot({
  open,
  onClose,
  tone = 'surface',
  workspaceBound = true,
  zIndexClassName = 'z-drawer',
  portalTarget,
  children,
}: DrawerRootProps) {
  const dragControls = useDragControls();
  const titleId = useId();
  const [portalNode] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? (portalTarget ?? document.body) : null
  );

  const output = (
    <DrawerContext.Provider value={{ open, onClose, dragControls, titleId, tone, workspaceBound }}>
      {open && (
        <div className={cn('fixed inset-0 pointer-events-none', zIndexClassName)}>
          {children}
        </div>
      )}
    </DrawerContext.Provider>
  );
  return portalNode ? createPortal(output, portalNode) : output;
}

export function DrawerBackdrop({ className }: { className?: string }) {
  const { onClose } = useDrawerContext();
  return (
    <div
      aria-hidden="true"
      onClick={onClose}
      className={cn(
        'absolute inset-0 bg-ui-ink-strong/35 pointer-events-auto cursor-pointer',
        className
      )}
    />
  );
}

export function DrawerContent({
  size = 'md',
  heightClassName = 'max-h-[85vh]',
  dragToDismiss = true,
  mdPlacement = 'card',
  ariaLabel,
  className,
  children,
}: DrawerContentProps) {
  const { open, onClose, dragControls, titleId, tone, workspaceBound } = useDrawerContext();
  const isCard = useMediaQuery('(min-width: 768px)');
  const isSide = mdPlacement === 'side';
  const drawerRef = useRef<HTMLDivElement>(null);
  const modalFocus = useModalFocus({ containerRef: drawerRef, isActive: open, onEscape: onClose });

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 right-0 md:flex md:p-6',
        isSide ? 'md:justify-end md:p-3' : 'md:items-center md:justify-center',
        workspaceBound ? 'workspace-window' : 'left-0'
      )}
    >
      <motion.div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={modalFocus.onKeyDown}
        drag={dragToDismiss && !isCard ? 'y' : false}
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
          // md+: floating card centered in the workspace instead of a bottom sheet.
          'md:relative md:inset-auto md:rounded-modal md:border-0 md:border-b-[length:var(--depth-xl)] md:border-ui-border',
          isSide
            ? 'md:h-full md:max-h-full md:w-[26rem] md:max-w-full md:mx-0'
            : 'md:h-auto md:max-h-[80vh] md:w-full',
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function DrawerHandle({ className }: { className?: string }) {
  const { dragControls } = useDrawerContext();
  return (
    <div
      className={cn('w-full flex justify-center py-2 shrink-0 cursor-grab active:cursor-grabbing md:hidden', className)}
      onPointerDown={(e) => dragControls.start(e)}
      style={{ touchAction: 'none' }}
    >
      <div className="w-12 h-1.5 bg-ui-divider rounded-full" />
    </div>
  );
}

export function DrawerStickyHeader({ className, children }: { className?: string; children: ReactNode }) {
  const { tone } = useDrawerContext();
  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex w-full shrink-0 flex-col pb-2 pt-2 bg-gradient-to-b',
        DRAWER_TONE_STICKY_GRADIENTS[tone],
        className
      )}
    >
      {children}
    </div>
  );
}

export function DrawerTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { titleId } = useDrawerContext();
  return (
    <h2 id={titleId} className={cn('text-xl font-extrabold text-ui-ink tracking-normal', className)}>
      {children}
    </h2>
  );
}

export function DrawerClose({
  label = 'Close drawer',
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { onClose } = useDrawerContext();
  return (
    <IconActionButton
      icon={<AppIcon name="close" size={20} />}
      label={label}
      size="md"
      onClick={onClose}
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

export interface DrawerProps {
  isOpen: boolean;
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
  heightClassName?: string;
  closeLabel?: string;
  showCloseButton?: boolean;
  dragToDismiss?: boolean;
  zIndexClassName?: string;
  portalTarget?: HTMLElement | null;
}


/**
 * Unified Drawer component: can be used as a simple single-tag drawer
 * `<Drawer isOpen={open} onClose={close} title="...">...</Drawer>`
 * OR composed using subcomponents:
 * `<Drawer.Root> <Drawer.Backdrop /> <Drawer.Content> ... </Drawer.Root>`
 */
export function Drawer({
  isOpen,
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
  heightClassName = 'max-h-[85vh]',
  closeLabel = 'Close drawer',
  showCloseButton = true,
  dragToDismiss = true,
  zIndexClassName = 'z-drawer',
  portalTarget,
}: DrawerProps) {
  const hasHeader = Boolean(title || showCloseButton);

  return (
    <DrawerRoot
      open={isOpen}
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

        <>
          <DrawerHandle className="pt-4 pb-2" />
          {hasHeader && (
            <div className="flex items-center justify-between px-6 pb-4">
              {title &&
                (typeof title === 'string' ? (
                  <DrawerTitle>{title}</DrawerTitle>
                ) : (
                  title
                ))}
              {showCloseButton && (
                <DrawerClose
                  label={closeLabel}
                  className="h-11 w-11 rounded-full"
                />
              )}
            </div>
          )}
        </>

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
Drawer.StickyHeader = DrawerStickyHeader;
Drawer.Title = DrawerTitle;
Drawer.Close = DrawerClose;
Drawer.Body = DrawerBody;
