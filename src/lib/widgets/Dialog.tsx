import { createContext, useContext, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { useModalFocus } from '../../hooks/useModalFocus';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';

export const DIALOG_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-full',
};

export const DIALOG_DEPTHS = {
  sm: 'border-b-[length:var(--depth-sm)]',
  md: 'border-b-[length:var(--depth-md)]',
  lg: 'border-b-[length:var(--depth-lg)]',
  xl: 'border-b-[length:var(--depth-xl)]',
};

export interface DialogRootProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  portalTarget?: HTMLElement | null;
  zIndexClassName?: string;
  children: ReactNode;
}

export interface DialogContentProps {
  size?: keyof typeof DIALOG_SIZES;
  depth?: keyof typeof DIALOG_DEPTHS;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  className?: string;
  children: ReactNode;
}

interface DialogContextValue {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('Dialog subcomponents must be within <Dialog.Root>');
  return context;
}

export function DialogRoot({
  open,
  onOpenChange,
  onClose,
  portalTarget,
  zIndexClassName = 'z-dialog',
  children,
}: DialogRootProps) {
  const titleId = useId();
  const descriptionId = useId();
  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };
  const [portalNode] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? portalTarget ?? document.body : null
  );

  const output = (
    <DialogContext.Provider value={{ open, onClose: handleClose, titleId, descriptionId }}>
      <AnimatePresence>
        {open && (
          <div
            className={cn(
              'fixed inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-auto',
              zIndexClassName
            )}
          >
            {children}
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
  return portalNode ? createPortal(output, portalNode) : output;
}

export function DialogBackdrop({
  className,
  closeOnClick = true,
}: {
  className?: string;
  closeOnClick?: boolean;
}) {
  const { onClose } = useDialogContext();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
      onClick={closeOnClick ? onClose : undefined}
      className={cn('absolute inset-0 bg-ui-ink-strong/40 backdrop-blur-sm cursor-pointer', className)}
    />
  );
}

export function DialogContent({
  size = 'md',
  depth = 'md',
  role = 'dialog',
  ariaLabel,
  initialFocusRef,
  closeOnEscape = true,
  className,
  children,
}: DialogContentProps) {
  const { open, onClose, titleId, descriptionId } = useDialogContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const modalFocus = useModalFocus({
    containerRef: dialogRef,
    initialFocusRef,
    isActive: open,
    onEscape: closeOnEscape ? onClose : undefined,
  });

  return (
    <motion.div
      ref={dialogRef}
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
      initial={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 16 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 26, stiffness: 320, mass: 0.8 }}
      className={cn(
        'relative w-full rounded-modal border-ui-border bg-ui-surface p-5 sm:p-6 shadow-ambient-lg outline-none flex flex-col max-h-[90vh]',
        DIALOG_SIZES[size],
        DIALOG_DEPTHS[depth],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex items-center justify-between pb-3 shrink-0', className)}>{children}</div>;
}

export function DialogTitle({
  as: Comp = 'h2',
  className,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'span';
  className?: string;
  children: ReactNode;
}) {
  const { titleId } = useDialogContext();
  return (
    <Comp id={titleId} className={cn('text-xl font-black text-ui-ink-strong truncate', className)}>
      {children}
    </Comp>
  );
}

export function DialogDescription({ className, children }: { className?: string; children: ReactNode }) {
  const { descriptionId } = useDialogContext();
  return (
    <div id={descriptionId} className={cn('mb-4 text-sm font-bold leading-relaxed text-ui-muted-strong', className)}>
      {children}
    </div>
  );
}

export function DialogClose({
  label = 'Close dialog',
  size = 'md',
  className,
  onClick,
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}) {
  const { onClose } = useDialogContext();
  return (
    <IconActionButton
      icon={<AppIcon name="close" size={20} />}
      label={label}
      size={size}
      onClick={onClick ?? onClose}
      className={className}
    />
  );
}

export function DialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col', className)}>{children}</div>;
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('pt-4 mt-2 border-t border-ui-divider/60 shrink-0', className)}>{children}</div>;
}

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  role?: 'dialog' | 'alertdialog';
  size?: keyof typeof DIALOG_SIZES;
  depth?: keyof typeof DIALOG_DEPTHS;
  showCloseButton?: boolean;
  closeLabel?: string;
  headerAccessory?: ReactNode;
  headerClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  portalTarget?: HTMLElement | null;
  zIndexClassName?: string;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Unified Dialog component: can be used as a simple single-tag modal
 * `<Dialog isOpen={open} onClose={close} title="...">...</Dialog>`
 * OR composed using subcomponents:
 * `<Dialog.Root> <Dialog.Backdrop /> <Dialog.Content> ... </Dialog.Root>`
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  ariaLabel,
  role = 'dialog',
  size = 'md',
  depth = 'md',
  showCloseButton = true,
  closeLabel = 'Close dialog',
  headerAccessory,
  headerClassName,
  initialFocusRef,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  portalTarget,
  zIndexClassName = 'z-dialog',
  className,
  bodyClassName,
  footer,
  children,
}: DialogProps) {
  const hasHeader = Boolean(title || showCloseButton || headerAccessory);

  return (
    <DialogRoot
      open={isOpen}
      onClose={onClose}
      portalTarget={portalTarget}
      zIndexClassName={zIndexClassName}
    >
      <DialogBackdrop closeOnClick={closeOnBackdropClick} />
      <DialogContent
        role={role}
        size={size}
        depth={depth}
        ariaLabel={title ? undefined : (ariaLabel ?? 'Modal dialog')}
        initialFocusRef={initialFocusRef}
        closeOnEscape={closeOnEscape}
        className={className}
      >
        {hasHeader && (
          <DialogHeader className={headerClassName}>
            <div className="flex items-center gap-2 min-w-0 pr-2">
              {title && (typeof title === 'string' ? <DialogTitle>{title}</DialogTitle> : title)}
              {headerAccessory}
            </div>
            {showCloseButton && <DialogClose label={closeLabel} />}
          </DialogHeader>
        )}

        {description &&
          (typeof description === 'string' ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <div className="mb-4 text-sm font-bold leading-relaxed text-ui-muted-strong">{description}</div>
          ))}

        <DialogBody className={bodyClassName}>{children}</DialogBody>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </DialogRoot>
  );
}

// Attach subcomponents directly to Dialog
Dialog.Root = DialogRoot;
Dialog.Backdrop = DialogBackdrop;
Dialog.Content = DialogContent;
Dialog.Header = DialogHeader;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.Close = DialogClose;
Dialog.Body = DialogBody;
Dialog.Footer = DialogFooter;

// Alias ModalDialog to Dialog for 100% backward compatibility
export const ModalDialog = Dialog;
export type ModalDialogProps = DialogProps;
