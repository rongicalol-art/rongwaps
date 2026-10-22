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
      <Drawer.Content size="md" mdPlacement="side" ariaLabel={isEdit ? 'Edit folder' : 'New folder'} heightClassName="max-h-[85vh]">
        <Drawer.StickyHeader>
          <Drawer.Handle className="pb-2" />
        </Drawer.StickyHeader>
        <Drawer.Body className="flex flex-col px-4 pb-5 sm:px-6">
      {/* Live Folder Preview */}
      <div className="mb-4 flex flex-col items-center justify-center">
        <div className="relative aspect-[25/21] w-24 drop-shadow-sm transition-transform duration-200 hover:scale-105">
          <FolderSvg
            colorFront={currentColor.front}
            colorBack={currentColor.back}
          />
        </div>
        <span className="mt-1.5 text-xs font-black uppercase tracking-wider text-ui-muted">
          {currentColor.name}
        </span>
      </div>

      <input
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        type="text"
        aria-label="Folder name"
        placeholder="Folder name (e.g. Action Verbs)"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isCreatingFolder && newFolderName.trim()) handleCreateFolder();
        }}
        className="mb-4 w-full rounded-control border-2 border-b-[length:var(--depth-sm)] border-ui-border bg-ui-hover px-4 py-3 font-bold text-ui-ink outline-none placeholder:text-ui-muted focus:border-brand-primary focus:bg-ui-surface focus-visible:ring-inset focus-ring transition-colors"
      />

      {/* Color Palette Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Folder Color
        </label>
        <div
          role="radiogroup"
          aria-label="Select folder color"
          className="grid grid-cols-4 gap-2"
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
                  'relative flex h-8 w-full items-center justify-center rounded-control transition-[transform,box-shadow,background-color] duration-100 outline-none focus-ring',
                  'active:translate-y-[length:var(--depth-sm)] active:shadow-none',
                  isSelected && 'ring-2 ring-ui-ink-strong ring-offset-2 scale-105'
                )}
              >
                {isSelected && (
                  <AppIcon name="check" size={14} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ActionButton
        variant="primary"
        size="md"
        fullWidth
        onClick={handleCreateFolder}
        disabled={!newFolderName.trim()}
        loading={isCreatingFolder}
        loadingLabel={isEdit ? 'Saving folder' : 'Creating folder'}
        className="uppercase tracking-widest"
      >
        {isEdit ? 'Save' : 'Create folder'}
      </ActionButton>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
