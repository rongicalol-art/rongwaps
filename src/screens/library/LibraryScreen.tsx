import { useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../utils/cn';
import {
  ActionButton,
  AppIcon,
  EmptyState,
  StickyWorkspaceHeader,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { useLibrary } from './hooks/useLibrary';
import { FolderModal } from './FolderModal';
import { DeleteCardModal } from './DeleteCardModal';
import { DeleteFolderModal } from './DeleteFolderModal';
import { LibrarySkeleton } from './components/LibrarySkeleton';
import { LibraryCardGrid } from './components/LibraryCardGrid';
import { LibraryHomeView } from './components/LibraryHomeView';
import type { DBDictionaryEntry } from '../../types/database';
import type { UserFlashcard } from '../../types/models';

interface LibraryScreenProps {
  onAddCard?: () => void;
  onPlayFlashcards?: () => void;
  /** Mobile hamburger shown overlaid left in the sticky header (Library home). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
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
    selectedFolderColorId,
    setSelectedFolderColorId,
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
  const totalCount = activeCollection?.count ?? 0;

  const handleOpenCard = useCallback(
    (card: DBDictionaryEntry | UserFlashcard) => {
      setDictionaryWord(
        isStarred
          ? (card as DBDictionaryEntry).traditional
          : (card as UserFlashcard).traditional || card.simplified
      );
    },
    [isStarred, setDictionaryWord]
  );

  const handleRemoveCard = useCallback(
    (card: DBDictionaryEntry | UserFlashcard) => {
      if (isStarred) toggleFavorite((card as DBDictionaryEntry).traditional);
      else void handleDeleteCustomCard((card as UserFlashcard).id);
    },
    [isStarred, toggleFavorite, handleDeleteCustomCard]
  );

  return (
    <div className="relative flex flex-1 w-full flex-col text-ui-ink">
      <StickyWorkspaceHeader
        title={activeView === 'folder' ? (activeCollection.title ?? 'Folder') : 'Library'}
        align="left"
        menuToggle={activeView === 'home' ? menuToggle : undefined}
        leftSlot={activeView === 'folder' ? activeCollection.icon : undefined}
        rightContent={
          activeView === 'folder' ? (
            <span
              className="whitespace-nowrap text-[11px] font-black uppercase tracking-widest text-ui-muted"
              aria-label={`${totalCount} ${totalCount === 1 ? 'card' : 'cards'}`}
            >
              {totalCount} {totalCount === 1 ? 'card' : 'cards'}
            </span>
          ) : undefined
        }
        onBack={
          activeView === 'folder'
            ? () => {
                setSearchQuery('');
                setActiveView('home');
              }
            : undefined
        }
        backLabel="Back to Library"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          activeView === 'folder'
            ? `Search ${activeCollection.title ?? 'Folder'}…`
            : 'Search folders…'
        }
        searchLabel={
          activeView === 'folder'
            ? `search ${activeCollection.title ?? 'Folder'} folder`
            : 'search Library'
        }
      />

      {activeView === 'home' && (
        <motion.div
          key="home-view"
          className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-32 pt-0 md:px-8 sm:pb-24"
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
            onCreateFolder={() => {
              setNewFolderName('');
              setShowFolderModal(true);
            }}
            onSelectWord={setDictionaryWord}
          />
        </motion.div>
      )}

      {activeView === 'folder' && (
        <motion.div
          key="folder-view"
          className="mx-auto flex w-full min-h-full max-w-5xl flex-col px-4 pb-36 pt-0 md:px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <AnimatePresence mode="wait">
            {isLoadingFavs && isStarred ? (
              <motion.div
                key="library-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="w-full"
              >
                <LibrarySkeleton />
              </motion.div>
            ) : items.length === 0 && searchQuery.trim() ? (
              <EmptyState
                key="empty-search"
                icon="search"
                iconBg="bg-ui-surface"
                iconColor="text-ui-muted"
                title="No matching cards"
                description={`Nothing in ${activeCollection.title ?? 'this folder'} matches your search.`}
                action={
                  <ActionButton variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                    Clear search
                  </ActionButton>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                key="empty-folder"
                icon={isStarred ? 'bookmarkFilled' : 'sparkles'}
                iconBg={
                  activeCollection?.lightBg ||
                  (isStarred ? 'bg-feedback-warning/15' : 'bg-brand-primary-soft')
                }
                iconColor={
                  isStarred
                    ? 'text-feedback-warning-edge'
                    : activeCollection?.accentColor || 'text-brand-primary'
                }
                title={isStarred ? 'No saved words' : 'No cards yet'}
                description={
                  isStarred ? 'Save words from Dictionary.' : 'Create your first flashcard.'
                }
                action={
                  !isStarred && onAddCard ? (
                    <ActionButton variant="primary" onClick={onAddCard} className="w-auto px-7">
                      <AppIcon name="add" size={18} />
                      Add card
                    </ActionButton>
                  ) : undefined
                }
              />
            ) : (
              <LibraryCardGrid
                items={items}
                isStarred={isStarred}
                libraryActiveFolder={libraryActiveFolder}
                onAddCard={onAddCard}
                onRemoveCard={handleRemoveCard}
                onOpenCard={handleOpenCard}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <FolderModal
        showFolderModal={showFolderModal}
        setShowFolderModal={setShowFolderModal}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        selectedColorId={selectedFolderColorId}
        setSelectedColorId={setSelectedFolderColorId}
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
        <div className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-sheet-safe pt-10">
          <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
            <ActionButton
              size="lg"
              fullWidth
              disabled={activeCollection.count === 0}
              onClick={() => {
                setSearchQuery('');
                onPlayFlashcards();
              }}
              edgeColor={activeCollection.colorBack}
              aria-label="Start flashcards"
              className={cn(
                'pointer-events-auto min-h-14 btn-touch-primary text-white',
                activeCollection.accentBg
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