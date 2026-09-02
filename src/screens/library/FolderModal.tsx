import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ActionButton, AppIcon, IconActionButton } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';
import { cn } from '../../utils/cn';
import { FolderSvg } from './components/FolderItem';
import {
  CUSTOM_FOLDER_OPTIONS,
  resolveFolderColor,
} from './utils/folderColors';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { onKeyDown } = useModalFocus({
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    isActive: showFolderModal,
    onEscape: () => setShowFolderModal(false),
  });

  if (!showFolderModal) return null;

  const currentColor = resolveFolderColor(selectedColorId);

  return createPortal(
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowFolderModal(false)}
        className="absolute inset-0 bg-ui-ink-strong/40 backdrop-blur-sm"
      />
      <motion.div
        ref={dialogRef}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-folder-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative w-full max-w-sm rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-6 shadow-ambient-lg outline-none"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="new-folder-title" className="text-xl font-extrabold text-ui-ink-strong">New Folder</h2>
          <IconActionButton
            icon={<AppIcon name="close" size={20} />}
            label="Close new folder"
            size="md"
            onClick={() => setShowFolderModal(false)}
          />
        </div>

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
                    borderColor: color.back,
                  }}
                  className={cn(
                    'relative flex h-8 w-full items-center justify-center rounded-control border-b-[length:var(--depth-sm)] transition-all outline-none focus-ring',
                    'active:translate-y-[length:var(--depth-sm)] active:border-b-0',
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
      </motion.div>
    </div>,
    document.body,
  );
}
