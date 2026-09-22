import { useRef } from 'react';
import { ActionButton, AppIcon, Dialog } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { FolderSvg } from './components/FolderItem';
import {
  CUSTOM_FOLDER_OPTIONS,
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
}: FolderModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentColor = resolveFolderColor(selectedColorId);

  return (
    <Dialog.Root open={showFolderModal} onClose={() => setShowFolderModal(false)}>
      <Dialog.Backdrop />
      <Dialog.Content
        size="sm"
        depth="md"
        initialFocusRef={inputRef}
        className="rounded-feature p-6"
      >
        <Dialog.Header>
          <Dialog.Title>New Folder</Dialog.Title>
          <Dialog.Close label="Close new folder" />
        </Dialog.Header>
        <Dialog.Body>
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
        ref={inputRef}
        type="text"
        aria-label="Folder name"
        placeholder="Folder name (e.g. Action Verbs)"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isCreatingFolder && newFolderName.trim()) handleCreateFolder();
        }}
        className="mb-4 w-full rounded-control border-b-[length:var(--depth-sm)] border-ui-border bg-ui-hover px-4 py-3 font-bold text-ui-ink outline-none placeholder:text-ui-muted focus:border-brand-primary focus:bg-ui-surface focus-ring transition-colors"
      />

      {/* Color Palette Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Folder Color
        </label>
        <div
          role="radiogroup"
          aria-label="Select folder color"
          className="grid grid-cols-4 gap-2 sm:grid-cols-8"
        >
          {CUSTOM_FOLDER_OPTIONS.map((color) => {
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
        loadingLabel="Creating folder"
        className="uppercase tracking-widest"
      >
        Create folder
      </ActionButton>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
}
