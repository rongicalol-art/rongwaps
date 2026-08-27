import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ActionButton, AppIcon } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';

interface DeleteCardModalProps {
  deleteTargetId: string | null;
  setDeleteTargetId: (id: string | null) => void;
  confirmDelete: () => void;
}

export function DeleteCardModal({
  deleteTargetId,
  setDeleteTargetId,
  confirmDelete,
}: DeleteCardModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useModalFocus({
    containerRef: dialogRef,
    isActive: !!deleteTargetId,
    onEscape: () => setDeleteTargetId(null),
  });

  if (!deleteTargetId) return null;

  return createPortal(
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setDeleteTargetId(null)}
        className="absolute inset-0 bg-ui-ink-strong/40 backdrop-blur-sm"
      />
      <motion.div
        ref={dialogRef}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-flashcard-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative w-full max-w-sm rounded-[24px] border-b-4 border-ui-border bg-ui-surface p-6 shadow-xl outline-none"
      >
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-feedback-danger-surface">
            <AppIcon name="trash" size={32} className="text-feedback-danger" />
          </div>
          <h2 id="delete-flashcard-title" className="text-xl font-extrabold text-ui-ink-strong">Delete Flashcard?</h2>
          <p className="mt-2 text-sm font-bold text-ui-muted">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <ActionButton
            variant="secondary"
            size="md"
            onClick={() => setDeleteTargetId(null)}
            className="min-w-0 flex-1 uppercase tracking-widest"
          >
            Cancel
          </ActionButton>
          <ActionButton
            variant="danger"
            size="md"
            onClick={confirmDelete}
            className="min-w-0 flex-1 uppercase tracking-widest"
          >
            Delete
          </ActionButton>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
