import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ActionButton, AppIcon } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';

interface DeleteFolderModalProps {
  deleteFolderTarget: { id: string; name: string } | null;
  setDeleteFolderTarget: (target: { id: string; name: string } | null) => void;
  confirmDeleteFolder: () => void;
}

export function DeleteFolderModal({
  deleteFolderTarget,
  setDeleteFolderTarget,
  confirmDeleteFolder,
}: DeleteFolderModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useModalFocus({
    containerRef: dialogRef,
    isActive: !!deleteFolderTarget,
    onEscape: () => setDeleteFolderTarget(null),
  });

  if (!deleteFolderTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setDeleteFolderTarget(null)}
        className="absolute inset-0 bg-ui-ink-strong/40 backdrop-blur-sm"
      />
      <motion.div
        ref={dialogRef}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-folder-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative w-full max-w-sm rounded-[24px] border-b-4 border-ui-border bg-ui-surface p-6 shadow-xl outline-none"
      >
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-feedback-danger-surface">
            <AppIcon name="trash" size={32} className="text-feedback-danger" />
          </div>
          <h2 id="delete-folder-title" className="text-xl font-extrabold text-ui-ink-strong">Delete Folder?</h2>
          <p className="mt-2 text-base font-extrabold text-ui-ink">"{deleteFolderTarget.name}"</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-ui-muted">
            This will remove this folder. Your flashcards inside will not be deleted but kept in custom cards.
          </p>
        </div>
        <div className="flex gap-3">
          <ActionButton
            variant="secondary"
            size="md"
            onClick={() => setDeleteFolderTarget(null)}
            className="min-w-0 flex-1 uppercase tracking-widest"
          >
            Cancel
          </ActionButton>
          <ActionButton
            variant="danger"
            size="md"
            onClick={confirmDeleteFolder}
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
