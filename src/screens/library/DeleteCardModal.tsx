import { ConfirmationDialog } from '../../lib/widgets';

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
  if (!deleteTargetId) return null;

  return (
    <ConfirmationDialog
      title="Delete Flashcard?"
      description="This action cannot be undone."
      confirmLabel="Delete"
      confirmLoadingLabel="Deleting..."
      cancelLabel="Cancel"
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTargetId(null)}
    />
  );
}
