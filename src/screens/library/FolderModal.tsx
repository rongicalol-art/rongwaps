import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ActionButton, AppIcon, IconActionButton } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';

interface FolderModalProps {
  showFolderModal: boolean;
  setShowFolderModal: (show: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  isCreatingFolder: boolean;
  handleCreateFolder: () => void;
}

export function FolderModal({
  showFolderModal,
  setShowFolderModal,
  newFolderName,
  setNewFolderName,
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
        className="relative w-full max-w-sm rounded-[24px] border-b-4 border-ui-border bg-ui-surface p-6 shadow-xl outline-none"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="new-folder-title" className="text-xl font-extrabold text-ui-ink-strong">New Folder</h2>
          <IconActionButton
            icon={<AppIcon name="close" size={20} />}
            label="Close new folder"
            size="md"
            onClick={() => setShowFolderModal(false)}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          aria-label="Folder name"
          placeholder="Folder name (e.g. Action Verbs)"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isCreatingFolder) handleCreateFolder();
          }}
          className="mb-6 w-full rounded-[16px] border-2 border-ui-border bg-ui-hover px-4 py-3 font-bold text-ui-ink outline-none placeholder:text-ui-muted focus:border-brand-primary focus:bg-ui-surface focus-visible:ring-4 focus-visible:ring-brand-primary/20 transition-colors"
        />

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
