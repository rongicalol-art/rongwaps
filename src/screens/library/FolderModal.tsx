import { ActionButton, AppIcon, Drawer, FolderSvg } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import {
  FOLDER_COLOR_PALETTE,
  resolveFolderColor,
} from '../../utils/folderColors';

interface FolderModalProps {
  showFolderModal: boolean;
  setShowFolderModal: (show: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  selectedColorId: string;
  setSelectedColorId: (id: string) => void;
  isCreatingFolder: boolean;
  handleCreateFolder: () => void;
  /** `edit` renames/recolours an existing folder; the submit handler is the same prop. */
  mode?: 'create' | 'edit';
}

export function FolderModal({
  showFolderModal,
  setShowFolderModal,
  newFolderName,
  setNewFolderName,
  selectedColorId,
  setSelectedColorId,
  isCreatingFolder,
  handleCreateFolder,
  mode = 'create',
}: FolderModalProps) {
  const isEdit = mode === 'edit';
  const currentColor = resolveFolderColor(selectedColorId);

  return (
    <Drawer.Root open={showFolderModal} onClose={() => setShowFolderModal(false)} tone="surface">
      <Drawer.Backdrop />
      <Drawer.Content size="md" mdPlacement="side" ariaLabel={isEdit ? 'Edit folder' : 'New folder'}>
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <Drawer.Title>{isEdit ? 'Edit folder' : 'New Folder'}</Drawer.Title>
          <Drawer.Close label={isEdit ? 'Close edit folder' : 'Close new folder'} />
        </div>

        <Drawer.Body className="flex flex-col px-4 pb-2 sm:px-6">
          {/* Live Folder Preview */}
          <div className="mb-5 flex flex-col items-center justify-center">
            <div className="relative aspect-[25/21] w-28 drop-shadow-sm transition-transform duration-200 hover:scale-105">
              <FolderSvg
                colorFront={currentColor.front}
                colorBack={currentColor.back}
              />
            </div>
            <span className="mt-2 text-xs font-black uppercase tracking-wider text-ui-muted">
              {currentColor.name}
            </span>
          </div>

          <div className="mb-5 flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <label className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">
              Folder name
            </label>
            <input
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              type="text"
              aria-label="Folder name"
              placeholder="e.g. Action Verbs"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreatingFolder && newFolderName.trim()) handleCreateFolder();
              }}
              className="w-full bg-transparent text-base font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
            />
          </div>

          {/* Color Palette Selector */}
          <div className="mb-4">
            <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
              Folder Color
            </label>
            <div
              role="radiogroup"
              aria-label="Select folder color"
              className="grid grid-cols-4 gap-2.5"
            >
              {FOLDER_COLOR_PALETTE.map((color) => {
                const isSelected = color.id === currentColor.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={color.name}
                    onClick={() => setSelectedColorId(color.id)}
                    style={{
                      backgroundColor: color.front,
                      boxShadow: `0 var(--depth-sm) 0 ${color.back}`,
                    }}
                    className={cn(
                      'relative flex h-9 w-full items-center justify-center rounded-control transition-[transform,box-shadow,background-color] duration-100 outline-none focus-ring',
                      'active:translate-y-[length:var(--depth-sm)] active:shadow-none',
                      isSelected && 'ring-2 ring-ui-ink-strong ring-offset-2 scale-105'
                    )}
                  >
                    {isSelected && (
                      <AppIcon name="check" size={16} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Drawer.Body>

        <div className="shrink-0 px-4 pb-6 pt-3 sm:px-6">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            loading={isCreatingFolder}
            loadingLabel={isEdit ? 'Saving folder' : 'Creating folder'}
          >
            {isEdit ? 'Save' : 'Create folder'}
          </ActionButton>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
