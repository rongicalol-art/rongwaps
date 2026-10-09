import { Dialog, FolderSvg } from '../../lib/widgets';

interface MoveTarget {
  id: string;
  title: string;
  count: number;
  colorFront?: string;
  colorBack?: string;
}

interface MoveCardsDialogProps {
  open: boolean;
  selectedCount: number;
  folders: MoveTarget[];
  onMove: (folderId: string) => void;
  onClose: () => void;
}

/** Pick a folder for the selected cards. */
export function MoveCardsDialog({ open, selectedCount, folders, onMove, onClose }: MoveCardsDialogProps) {
  return (
    <Dialog.Root open={open} onClose={onClose}>
      <Dialog.Backdrop />
      <Dialog.Content size="sm" depth="md" className="rounded-feature p-6">
        <Dialog.Header>
          <Dialog.Title>Move {selectedCount} {selectedCount === 1 ? 'card' : 'cards'}</Dialog.Title>
          <Dialog.Close label="Close move dialog" />
        </Dialog.Header>
        <Dialog.Body>
          <div className="flex flex-col">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onMove(folder.id)}
                className="flex items-center gap-3 border-b-2 border-ui-divider px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-ui-hover focus-ring"
              >
                <span className="aspect-[25/21] w-12 shrink-0">
                  <FolderSvg colorFront={folder.colorFront ?? '#1CB0F6'} colorBack={folder.colorBack ?? '#1899D6'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black text-ui-ink-strong">{folder.title}</span>
                  <span className="text-[13px] font-extrabold text-ui-muted">{folder.count} {folder.count === 1 ? 'card' : 'cards'}</span>
                </span>
              </button>
            ))}
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
}
