import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { ActionButton, AppIcon, StickyWorkspaceHeader, type StickyWorkspaceHeaderMenuToggle } from '../../lib/widgets';
import { useLibrary } from './hooks/useLibrary';
import { FolderModal } from './FolderModal';
import { DeleteCardModal } from './DeleteCardModal';
import { DeleteFolderModal } from './DeleteFolderModal';
import { LibrarySkeleton } from './components/LibrarySkeleton';
import { SpellCard } from './components/SpellCard';
import { LibraryHomeView } from './components/LibraryHomeView';
import type { DBDictionaryEntry } from '../../types/database';
import type { UserFlashcard } from '../../types/models';

interface LibraryScreenProps {
  onAddCard?: () => void;
  onPlayFlashcards?: () => void;
  /** Mobile hamburger shown overlaid left in the sticky header (Library home). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
}

function EmptyState({ onAddCard, isStarred }: { onAddCard?: () => void; isStarred: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col items-center justify-center px-6 py-16"
    >
      <div
        className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${
          isStarred ? 'bg-[#FFF3D0]' : 'bg-[#E5F7FF]'
        }`}
      >
        {isStarred ? (
          <AppIcon name="bookmarkFilled" size={38} className="text-[#FFB020]" />
        ) : (
          <AppIcon name="sparkles" size={38} className="text-brand-primary" />
        )}
      </div>

      <h3 className="mb-2 text-center text-[20px] font-black text-ui-ink-strong">
        {isStarred ? 'No saved words' : 'No cards yet'}
      </h3>
      <p className="mb-6 max-w-[250px] text-center text-[14px] font-bold leading-relaxed text-ui-muted">
        {isStarred
          ? 'Save words from Dictionary.'
          : 'Create your first flashcard.'}
      </p>

      {!isStarred && onAddCard && (
        <ActionButton variant="primary" onClick={onAddCard} className="w-auto px-7">
          <AppIcon name="add" size={18} />
          Add card
        </ActionButton>
      )}
    </motion.div>
  );
}

export function LibraryScreen({ onAddCard, onPlayFlashcards, menuToggle }: LibraryScreenProps) {
  const {
    toggleFavorite,
    setDictionaryWord,
    libraryActiveFolder,
    setLibraryActiveFolder,
    deleteFolderTarget,
    setDeleteFolderTarget,
    confirmDeleteFolder,
    searchQuery,
    setSearchQuery,
    allCollections,
    isLoadingFavs,
    showFolderModal,
    setShowFolderModal,
    newFolderName,
    setNewFolderName,
    isCreatingFolder,
    handleCreateFolder,
    deleteTargetId,
    setDeleteTargetId,
    handleDeleteCustomCard,
    confirmDelete,
    activeCollection,
    items,
    recentItems,
    activeView,
    setActiveView,
  } = useLibrary();

  const isStarred = libraryActiveFolder === 'starred';

  return (
    <div className="flex-1 flex w-full flex-col text-ui-ink relative bg-ui-canvas">
      <StickyWorkspaceHeader
        title={activeView === 'folder' ? (activeCollection.title ?? 'Folder') : 'Library'}
        align="left"
        menuToggle={activeView === 'home' ? menuToggle : undefined}
        leftSlot={activeView === 'folder' ? activeCollection.icon : undefined}
        onBack={activeView === 'folder' ? () => { setSearchQuery(''); setActiveView('home'); } : undefined}
        backLabel="Back to Library"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={activeView === 'folder' ? `Search ${activeCollection.title ?? 'Folder'}…` : 'Search folders…'}
        searchLabel={activeView === 'folder' ? `search ${activeCollection.title ?? 'Folder'} folder` : 'search Library'}
      />

      {activeView === 'home' && (
        <motion.div
          key="home-view"
          className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-24 pt-5 md:px-8 md:pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <LibraryHomeView
            collections={allCollections}
            recentItems={recentItems}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCollection={(id) => {
              setLibraryActiveFolder(id);
              setSearchQuery('');
              setActiveView('folder');
            }}
            onDeleteFolder={(id, name) => setDeleteFolderTarget({ id, name })}
            onCreateFolder={() => { setNewFolderName(''); setShowFolderModal(true); }}
            onSelectWord={setDictionaryWord}
          />
        </motion.div>
      )}

      {activeView === 'folder' && (
        <motion.div
          key="folder-view"
          className="flex flex-col w-full min-h-full px-4 md:px-8 pt-5 pb-36 max-w-5xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── CONTENT AREA ── */}
          {isLoadingFavs && isStarred ? (
            <LibrarySkeleton />
          ) : items.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center py-10">
              <EmptyState onAddCard={onAddCard} isStarred={isStarred} />
            </div>
          ) : (
            <div className="w-full">
              {/* Quiet count label */}
              <p className="mb-4 px-1 text-[13px] font-bold text-ui-muted">
                {items.length} {items.length === 1 ? 'card' : 'cards'}
              </p>

              {/* Masonry layout — card height driven by content */}
              <div className="columns-2 gap-3">
                {items.map((item: DBDictionaryEntry | UserFlashcard, idx: number) => {
                  const key = isStarred
                    ? `star-${(item as DBDictionaryEntry).traditional}`
                    : `custom-${(item as UserFlashcard).id}`;
                  return (
                    <SpellCard
                      key={key}
                      item={item}
                      activeTab={libraryActiveFolder}
                      index={idx}
                      onAction={(e) => {
                        e.stopPropagation();
                        if (isStarred) toggleFavorite((item as DBDictionaryEntry).traditional);
                        else handleDeleteCustomCard((item as UserFlashcard).id);
                      }}
                      onClick={() => {
                        setDictionaryWord(
                          isStarred
                            ? (item as DBDictionaryEntry).traditional
                            : (item.traditional || item.simplified)
                        );
                      }}
                    />
                  );
                })}

                {/* Add Card Inline Button */}
                {!isStarred && onAddCard && (
                  <div className="break-inside-avoid mb-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onAddCard}
                      className={cn(
                        "flex min-h-[120px] w-full cursor-pointer select-none flex-col items-center justify-center rounded-[24px] bg-ui-surface text-center text-ui-muted outline-none transition-[background-color,color] duration-150 hover:bg-white hover:text-brand-primary focus-visible:ring-4 focus-visible:ring-brand-primary/20"
                      )}
                    >
                      <AppIcon name="add" size={24} className="mb-2" />
                      <span className="block text-[14px] font-black">
                        Add card
                      </span>
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <FolderModal
        showFolderModal={showFolderModal}
        setShowFolderModal={setShowFolderModal}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        isCreatingFolder={isCreatingFolder}
        handleCreateFolder={handleCreateFolder}
      />
      <DeleteCardModal
        deleteTargetId={deleteTargetId}
        setDeleteTargetId={setDeleteTargetId}
        confirmDelete={confirmDelete}
      />
      <DeleteFolderModal
        deleteFolderTarget={deleteFolderTarget}
        setDeleteFolderTarget={setDeleteFolderTarget}
        confirmDeleteFolder={confirmDeleteFolder}
      />

      {activeView === 'folder' && onPlayFlashcards && (
        <div className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-10">
          <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
            <ActionButton
              size="lg"
              fullWidth
              disabled={activeCollection.count === 0}
              onClick={() => {
                setSearchQuery('');
                onPlayFlashcards();
              }}
              aria-label="Start flashcards"
              className={cn(
                "pointer-events-auto min-h-14 text-white border-b-[5px]",
                activeCollection.accentBg,
                activeCollection.accentBorder
              )}
            >
              <AppIcon name="play" size={20} />
              <span>Start</span>
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}