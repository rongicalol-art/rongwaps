import { debugLogger } from '../../../utils/debugLogger';
import { useState, useRef, useEffect } from 'react';
import { ActionButton, AppIcon, Dialog } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useSaveWordDestination } from '../hooks/useSaveWordDestination';
import { CUSTOM_FOLDER_OPTIONS, resolveFolderColor } from '../../../utils/folderColors';
import { cn } from '../../../utils/cn';

export function SaveWordModal() {
  const saveWordTarget = useAppStore((state) => state.saveWordTarget);
  const setSaveWordTarget = useAppStore((state) => state.setSaveWordTarget);

  const isOpen = Boolean(saveWordTarget);

  const {
    headword,
    pinyin,
    definitions,
    isFavorite,
    savedFolderCardsMap,
    customFolders,
    toggleFavorite,
    toggleFolder,
    createFolderAndAdd,
  } = useSaveWordDestination(saveWordTarget);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColorId, setSelectedColorId] = useState<string>(CUSTOM_FOLDER_OPTIONS[0].id);
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsCreatingFolder(false);
    setNewFolderName('');
    setSaveWordTarget(null);
  };

  useEffect(() => {
    if (isCreatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  const handleCreateAndAdd = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || isSubmittingFolder) return;

    setIsSubmittingFolder(true);
    try {
      await createFolderAndAdd(trimmed, selectedColorId);
      setIsCreatingFolder(false);
      setNewFolderName('');
    } catch (err) {
      debugLogger.error('Supabase', 'Failed to create folder and save word:', err);
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onClose={handleClose} zIndexClassName="z-window">
      <Dialog.Backdrop />
      <Dialog.Content size="md" depth="md">
        <Dialog.Header>
          <Dialog.Title>Save Word</Dialog.Title>
          <Dialog.Close label="Close save dialog" />
        </Dialog.Header>
        <Dialog.Body>
      {/* Word Preview Banner */}
      <div className="mb-4 flex items-center gap-3.5 rounded-control bg-ui-canvas p-3 border border-ui-border/60 shrink-0">
        <span className="font-chinese text-2xl font-bold leading-none text-ui-ink-strong shrink-0">
          {headword}
        </span>
        <div className="min-w-0 flex-1">
          {pinyin && (
            <p className="text-xs font-black text-brand-primary truncate">{pinyin}</p>
          )}
          {definitions && (
            <p className="text-xs font-bold text-ui-muted-strong truncate mt-0.5">
              {definitions}
            </p>
          )}
        </div>
      </div>

      {/* Scrollable Destination List */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2.5 min-h-[140px] max-h-[46vh] overscroll-contain">
        <p className="text-[11px] font-black uppercase tracking-wider text-ui-muted-strong px-0.5">
          Save to
        </p>

        {/* 1. Favorites (Starred Words) */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isFavorite}
          onClick={toggleFavorite}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-control border text-left transition-all outline-none focus-ring',
            isFavorite
              ? 'bg-feedback-warning-subtle/30 border-feedback-warning/50 shadow-sm'
              : 'bg-ui-surface border-ui-border hover:bg-ui-hover',
          )}
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-feedback-warning/15 text-feedback-warning-edge">
              <AppIcon name="bookmarkFilled" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-ui-ink-strong leading-snug">
                Favorites
              </p>
              <p className="text-xs font-bold text-ui-muted-strong truncate">
                Quick-access starred words
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
              isFavorite
                ? 'bg-feedback-warning text-white shadow-sm'
                : 'border-2 border-ui-border text-transparent',
            )}
          >
            <AppIcon name="check" size={14} />
          </div>
        </button>

        {/* 2. Custom Folders */}
        {customFolders.map((folder, idx) => {
          const folderColor = resolveFolderColor(folder.color, idx);
          const isInFolder = savedFolderCardsMap.has(folder.id);

          return (
            <button
              key={folder.id}
              type="button"
              role="checkbox"
              aria-checked={isInFolder}
              onClick={() => void toggleFolder(folder.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-control border text-left transition-all outline-none focus-ring',
                isInFolder
                  ? 'bg-brand-primary-soft/30 border-brand-primary/50 shadow-sm'
                  : 'bg-ui-surface border-ui-border hover:bg-ui-hover',
              )}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    folderColor.lightBg,
                    folderColor.accent,
                  )}
                >
                  <AppIcon name="folder" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-ui-ink-strong truncate leading-snug">
                    {folder.name}
                  </p>
                  <p className="text-xs font-bold text-ui-muted-strong truncate">
                    Custom folder
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
                  isInFolder
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'border-2 border-ui-border text-transparent',
                )}
              >
                <AppIcon name="check" size={14} />
              </div>
            </button>
          );
        })}

        {/* 3. Inline Create Folder Form */}
        {isCreatingFolder ? (
          <div className="rounded-control border border-brand-primary/40 bg-brand-primary/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-primary">
                New Folder
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="text-xs font-bold text-ui-muted hover:text-ui-ink"
              >
                Cancel
              </button>
            </div>

            <input
              ref={newFolderInputRef}
              type="text"
              aria-label="Folder name"
              placeholder="Folder name (e.g. HSK 2, Travel)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim() && !isSubmittingFolder) {
                  e.preventDefault();
                  void handleCreateAndAdd();
                }
              }}
              className="w-full rounded-control border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold text-ui-ink outline-none focus-ring"
            />

            {/* Color Swatches */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {CUSTOM_FOLDER_OPTIONS.map((c) => {
                const isSelected = selectedColorId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => setSelectedColorId(c.id)}
                    className={cn(
                      'h-7 w-7 rounded-full shrink-0 transition-transform active:scale-90',
                      isSelected && 'ring-2 ring-brand-primary ring-offset-2 scale-110',
                    )}
                    style={{ backgroundColor: c.front }}
                  />
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <ActionButton
                variant="primary"
                size="sm"
                disabled={!newFolderName.trim() || isSubmittingFolder}
                onClick={() => void handleCreateAndAdd()}
              >
                {isSubmittingFolder ? 'Creating...' : 'Create & Add'}
              </ActionButton>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingFolder(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-control border border-dashed border-ui-border hover:border-brand-primary hover:bg-brand-primary/5 text-ui-muted hover:text-brand-primary text-sm font-bold transition-colors outline-none focus-ring"
          >
            <AppIcon name="plus" size={16} />
            <span>New folder</span>
          </button>
        )}
      </div>
        </Dialog.Body>
        <Dialog.Footer>
          <ActionButton
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleClose}
          >
            Done
          </ActionButton>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
