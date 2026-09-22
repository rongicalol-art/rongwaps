import { useId, useRef, type ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';
import { Dialog } from './Dialog';
import { cn } from '../../utils/cn';

export interface ConfirmationDialogProps {
  cancelLabel?: string;
  confirmLabel: string;
  confirmLoadingLabel?: string;
  description: ReactNode;
  errorMessage?: string | null;
  icon?: ReactNode;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  className?: string;
}

export function ConfirmationDialog({
  cancelLabel = 'Cancel',
  className,
  confirmLabel,
  confirmLoadingLabel = 'Please wait...',
  description,
  errorMessage,
  icon = <AppIcon name="trash" size={32} />,
  isConfirming = false,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  return (
    <Dialog.Root open={true} onClose={isConfirming ? () => {} : onCancel}>
      <Dialog.Backdrop closeOnClick={!isConfirming} />
      <Dialog.Content
        role="alertdialog"
        size="sm"
        depth="md"
        initialFocusRef={cancelRef}
        closeOnEscape={!isConfirming}
        className={cn('rounded-feature p-6 text-center', className)}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-control bg-feedback-danger/10 text-feedback-danger">
          {icon}
        </div>
        <Dialog.Title as="h2" className="text-xl font-extrabold text-ui-ink text-center">
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-sm font-bold leading-relaxed text-ui-muted-strong text-center mb-0">
          {description}
        </Dialog.Description>
        {errorMessage && (
          <p id={errorId} role="alert" className="mt-3 rounded-compact bg-feedback-danger/10 px-3 py-2 text-sm font-bold text-feedback-danger-edge">
            {errorMessage}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <ActionButton ref={cancelRef} variant="secondary" fullWidth disabled={isConfirming} onClick={onCancel}>
            {cancelLabel}
          </ActionButton>
          <ActionButton
            variant="danger"
            fullWidth
            loading={isConfirming}
            loadingLabel={confirmLoadingLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </ActionButton>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
