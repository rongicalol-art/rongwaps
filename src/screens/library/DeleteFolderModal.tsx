import { isFolderOwner } from '../../utils/vocabulary/folderCollaboration';
import type { UserFolder } from '../../types/models';
import { ConfirmationDialog } from '../../lib/widgets';

interface DeleteFolderModalProps {
  deleteFolderTarget: UserFolder | null;
  setDeleteFolderTarget: (target: UserFolder | null) => void;
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
      title={!isFolderOwner(deleteFolderTarget) ? 'Leave folder?' : 'Delete folder?'}
      description={
        <>
          <p className="font-extrabold text-ui-ink">"{deleteFolderTarget.name}"</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted-strong">
            {!isFolderOwner(deleteFolderTarget)
              ? "You'll lose access to this folder and its cards. Cards you added stay in it."
              : (deleteFolderTarget.memberCount ?? 0) > 1
                ? 'This deletes the folder and all its cards for everyone. This can’t be undone.'
                : 'This will delete this folder and every flashcard inside it. This can’t be undone.'}
          </p>
        </>
      }
      confirmLabel={!isFolderOwner(deleteFolderTarget) ? 'Leave folder' : 'Delete'}
      confirmLoadingLabel={!isFolderOwner(deleteFolderTarget) ? 'Leaving…' : 'Deleting…'}
      cancelLabel="Cancel"
      onConfirm={confirmDeleteFolder}
      onCancel={() => setDeleteFolderTarget(null)}
    />
  );
}
