import { debugLogger } from '../../../utils/debugLogger';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ActionButton, AppIcon, DropdownMenu, DropdownMenuItem, Drawer, FolderSvg } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { isTechnicalSense, useSaveWordDestination } from '../hooks/useSaveWordDestination';
import { CUSTOM_FOLDER_OPTIONS, STARRED_FOLDER_COLOR, resolveFolderColor } from '../../../utils/folderColors';
import { cn } from '../../../utils/cn';

export function SaveWordModal() {
  const saveWordTarget = useAppStore((state) => state.saveWordTarget);
  const setSaveWordTarget = useAppStore((state) => state.setSaveWordTarget);

  const isOpen = Boolean(saveWordTarget);

  const {
    headword,
    pinyin,
    senseOptions,
    selectedSense,
    pickSense,
    isFavorite,
    savedFolderCardsMap,
    customFolders,
    toggleFavorite,
    toggleFolder,
    createFolderAndAdd,
  } = useSaveWordDestination(saveWordTarget);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isMeaningOpen, setIsMeaningOpen] = useState(false);
  const [isWritingMeaning, setIsWritingMeaning] = useState(false);
  const [customMeaning, setCustomMeaning] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColorId, setSelectedColorId] = useState<string>(CUSTOM_FOLDER_OPTIONS[0].id);
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  const newFolderColor = resolveFolderColor(selectedColorId);
  const savedCount = (isFavorite ? 1 : 0) + savedFolderCardsMap.size;

  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsWritingMeaning(false);
    setCustomMeaning('');
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
    <Drawer.Root open={isOpen} onClose={handleClose} tone="surface">
      <Drawer.Backdrop />
      <Drawer.Content size="md" mdPlacement="side" ariaLabel="Save word" heightClassName="max-h-[85vh]">
        <Drawer.StickyHeader>
          <Drawer.Handle className="pb-2" />
        </Drawer.StickyHeader>
        <Drawer.Body className="px-4 sm:px-6 flex flex-col">
          {(() => {
            const content = (
              <>
                <span className="font-chinese text-3xl font-bold leading-none text-ui-ink-strong shrink-0">
                  {headword}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  {pinyin && <span className="block text-sm font-black text-brand-primary">{pinyin}</span>}
                  {selectedSense && (
                    <span className="mt-0.5 line-clamp-2 block text-sm font-bold leading-snug text-ui-ink">
                      {selectedSense}
                    </span>
                  )}
                </span>
              </>
            );
            if ((senseOptions.length === 0 && !selectedSense) || isCreatingFolder) {
              return (
                <div className="mb-4 flex shrink-0 items-center gap-3.5 rounded-control bg-ui-canvas p-3.5">
                  {content}
                </div>
              );
            }
            if (isWritingMeaning) {
              const commit = () => {
                const trimmed = customMeaning.trim();
                if (trimmed) pickSense(trimmed);
                setIsWritingMeaning(false);
              };
              return (
                <div className="mb-4 flex shrink-0 items-center gap-3.5 rounded-control border-2 border-brand-primary border-b-[length:var(--depth-md)] bg-ui-surface p-3.5">
                  <span className="font-chinese text-3xl font-bold leading-none text-ui-ink-strong shrink-0">
                    {headword}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    {pinyin && <span className="block text-sm font-black text-brand-primary">{pinyin}</span>}
                    <input
                      autoFocus
                      type="text"
                      aria-label="Your own meaning"
                      placeholder="Type your own meaning"
                      value={customMeaning}
                      onChange={(e) => setCustomMeaning(e.target.value)}
                      onBlur={commit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') {
                          setCustomMeaning('');
                          e.currentTarget.blur();
                        }
                      }}
                      className="mt-0.5 block w-full bg-transparent text-sm font-bold leading-snug text-ui-ink outline-none placeholder:text-ui-muted"
                    />
                  </span>
                </div>
              );
            }
            return (
              <div className="mb-4 shrink-0">
                <DropdownMenu
                  label="Meaning to save"
                  open={isMeaningOpen}
                  onOpenChange={setIsMeaningOpen}
                  align="start"
                  widthClassName="w-full"
                  menuClassName="max-h-[60vh] overflow-y-auto"
                  renderTrigger={(triggerProps) => (
                    <button
                      {...triggerProps}
                      aria-label="Choose meaning to save"
                      className="flex w-full items-center gap-3.5 rounded-control border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface p-3.5 outline-none transition-[background-color] hover:bg-ui-hover focus-ring active:scale-[0.99]"
                    >
                      {content}
                      <motion.span
                        aria-hidden="true"
                        animate={{ rotate: isMeaningOpen ? 180 : 0 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="shrink-0 text-ui-muted"
                      >
                        <AppIcon name="dropdown" size={18} />
                      </motion.span>
                    </button>
                  )}
                >
                  <DropdownMenuItem
                    icon={<AppIcon name="pencil" size={18} />}
                    onClick={() => {
                      setIsMeaningOpen(false);
                      setCustomMeaning('');
                      setIsWritingMeaning(true);
                    }}
                  >
                    Write your own
                  </DropdownMenuItem>
                  {senseOptions.map((sense) => (
                    <DropdownMenuItem
                      key={sense}
                      active={sense === selectedSense}
                      onClick={() => {
                        setIsMeaningOpen(false);
                        pickSense(sense);
                      }}
                    >
                      <span
                        className={cn(
                          'line-clamp-2 block whitespace-normal leading-snug',
                          isTechnicalSense(sense) && sense !== selectedSense && 'font-semibold text-ui-muted',
                        )}
                      >
                        {sense}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenu>
              </div>
            );
          })()}

          {isCreatingFolder ? (
            <div className="flex flex-col items-center gap-4 pb-2">
              <div className="relative aspect-[25/21] w-28">
                <FolderSvg colorFront={newFolderColor.front} colorBack={newFolderColor.back} />
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
                className="w-full rounded-control border-2 border-ui-border bg-ui-surface px-3 py-2.5 text-sm font-bold text-ui-ink outline-none focus-ring"
              />
              <div className="flex flex-wrap items-center justify-center gap-3 py-1">
                {CUSTOM_FOLDER_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    onClick={() => setSelectedColorId(c.id)}
                    className={cn(
                      'h-7 w-7 shrink-0 rounded-full transition-transform active:scale-90 focus-ring',
                      selectedColorId === c.id && 'ring-2 ring-brand-primary ring-offset-2 scale-110',
                    )}
                    style={{ backgroundColor: c.front }}
                  />
                ))}
              </div>
              <div className="flex w-full gap-2">
                <ActionButton variant="secondary" fullWidth onClick={() => setIsCreatingFolder(false)}>
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  fullWidth
                  disabled={!newFolderName.trim() || isSubmittingFolder}
                  onClick={() => void handleCreateAndAdd()}
                >
                  {isSubmittingFolder ? 'Creating...' : 'Create & Add'}
                </ActionButton>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-2 px-0.5 text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
                {savedCount > 0 ? `Saved in ${savedCount} ${savedCount === 1 ? 'folder' : 'folders'}` : 'Save to'}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 pb-2">
                <FolderTile
                  title="Starred Words"
                  front={STARRED_FOLDER_COLOR.front}
                  back={STARRED_FOLDER_COLOR.back}
                  isStarred
                  isSaved={isFavorite}
                  onToggle={toggleFavorite}
                />
                {customFolders.map((folder, idx) => {
                  const color = resolveFolderColor(folder.color, idx);
                  return (
                    <FolderTile
                      key={folder.id}
                      title={folder.name}
                      front={color.front}
                      back={color.back}
                      isSaved={savedFolderCardsMap.has(folder.id)}
                      onToggle={() => void toggleFolder(folder.id)}
                    />
                  );
                })}
                <FolderTile title="New Folder" front="#E8EDF2" back="#D0D8E0" isNew onToggle={() => setIsCreatingFolder(true)} />
              </div>
            </>
          )}
        </Drawer.Body>
        <div className={cn("shrink-0 px-4 pt-3 pb-4 sm:px-6", isCreatingFolder && "hidden")}>
          <ActionButton
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleClose}
          >
            Done
          </ActionButton>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}

function FolderTile({
  title,
  front,
  back,
  isStarred,
  isNew,
  isSaved,
  onToggle,
}: {
  title: string;
  front: string;
  back: string;
  isStarred?: boolean;
  isNew?: boolean;
  isSaved?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role={isNew ? undefined : 'checkbox'}
      aria-checked={isNew ? undefined : Boolean(isSaved)}
      onClick={onToggle}
      className="group flex cursor-pointer select-none flex-col items-center gap-1.5 rounded-control px-1 py-2 outline-none transition-colors hover:bg-ui-hover focus-ring"
    >
      <div className="relative aspect-[25/21] w-full max-w-[120px] transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95 motion-reduce:transition-none">
        <FolderSvg colorFront={front} colorBack={back} isStarred={isStarred} hasPlus={isNew} />
        {isSaved && (
          <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white shadow-ambient-sm">
            <AppIcon name="check" size={16} />
          </span>
        )}
      </div>
      <span
        className={cn(
          'line-clamp-2 w-full px-1 text-center text-[14px] font-black',
          isSaved ? 'text-brand-primary' : 'text-ui-ink-strong',
        )}
      >
        {title}
      </span>
    </button>
  );
}
