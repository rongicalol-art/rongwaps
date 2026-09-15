import { ConfirmationDialog } from '../../lib/widgets';

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
  if (!deleteFolderTarget) return null;

  return (
    <ConfirmationDialog
      title="Delete Folder?"
      description={
        <>
          <p className="font-extrabold text-ui-ink">"{deleteFolderTarget.name}"</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted">
            This will remove this folder. Your flashcards inside will not be deleted but kept in custom cards.
          </p>
        </>
      }
      confirmLabel="Delete"
      confirmLoadingLabel="Deleting..."
      cancelLabel="Cancel"
      onConfirm={confirmDeleteFolder}
      onCancel={() => setDeleteFolderTarget(null)}
    />
  );
}
