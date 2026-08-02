import { useId, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';
import { cn } from '../../utils/cn';
import { useModalFocus } from '../../hooks/useModalFocus';

export interface ConfirmationDialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  cancelLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  errorMessage?: string | null;
  icon?: ReactNode;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
}

export function ConfirmationDialog({
  cancelLabel = 'Cancel',
  className,
  confirmLabel,
  description,
  errorMessage,
  icon = <AppIcon name="trash" size={32} />,
  isConfirming = false,
  onCancel,
  onConfirm,
  title,
  ...props
}: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const modalFocus = useModalFocus({
    containerRef: dialogRef,
    initialFocusRef: cancelRef,
    isActive: true,
    onEscape: isConfirming ? undefined : onCancel,
  });

  return (
    <div className="workspace-window fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.16 }}
        onClick={isConfirming ? undefined : onCancel}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 12 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        className="relative w-full max-w-sm"
      >
        <div
          ref={dialogRef}
          onKeyDown={modalFocus.onKeyDown}
          {...props}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={`${descriptionId}${errorMessage ? ` ${errorId}` : ''}`}
          tabIndex={-1}
          className={cn('rounded-[24px] border-2 border-ui-border bg-ui-surface p-6 shadow-xl', className)}
        >
          <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-feedback-danger/10 text-feedback-danger">
            {icon}
          </div>
          <h2 id={titleId} className="text-xl font-extrabold text-ui-ink">{title}</h2>
          <div id={descriptionId} className="mt-2 text-sm font-bold leading-relaxed text-ui-muted">{description}</div>
          {errorMessage && (
            <p id={errorId} role="alert" className="mt-3 rounded-[14px] bg-feedback-danger/10 px-3 py-2 text-sm font-bold text-feedback-danger-edge">
              {errorMessage}
            </p>
          )}
          </div>
          <div className="flex gap-3">
            <ActionButton ref={cancelRef} variant="secondary" fullWidth disabled={isConfirming} onClick={onCancel}>
              {cancelLabel}
            </ActionButton>
            <ActionButton
              variant="danger"
              fullWidth
              loading={isConfirming}
              loadingLabel="Resetting"
              onClick={onConfirm}
            >
              {confirmLabel}
            </ActionButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
