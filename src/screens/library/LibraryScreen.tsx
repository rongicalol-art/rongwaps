import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../utils/cn';
import {
  ActionButton,
  AppIcon,
  ConfirmationDialog,
  EmptyState,
  ProfileAvatarButton,
  StickyWorkspaceHeader,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { useLibrary } from './hooks/useLibrary';
import { ReviewHubCard } from './components/ReviewHubCard';
import { useReviewOverview } from './hooks/useReviewOverview';
import { useTocflReadiness } from '../../hooks/useTocflReadiness';
import { LibraryTocflProgressCard } from './components/LibraryTocflProgressCard';
import { FolderModal } from './FolderModal';
import { DeleteCardModal } from './DeleteCardModal';
import { DeleteFolderModal } from './DeleteFolderModal';
import { LibrarySkeleton } from './components/LibrarySkeleton';
import { LibraryCardGrid } from './components/LibraryCardGrid';
import { LibraryHomeView } from './components/LibraryHomeView';
import { LibrarySearchField } from './components/LibrarySearchField';
import { MoveCardsDialog } from './MoveCardsDialog';
import { EditCardDialog } from './EditCardDialog';
import { AddCardDialog } from './AddCardDialog';
import { LibraryContextMenu, type LibraryMenuAction, type MenuPoint } from './components/LibraryContextMenu';
import type { DBDictionaryEntry } from '../../types/database';
import type { UserFlashcard } from '../../types/models';

interface LibraryScreenProps {
  onStartReview: () => void;
  onStartMoreReview: () => void;
  onNavigateToPath: () => void;
  onAddCard?: () => void;
  onPlayFlashcards?: () => void;
  /** Mobile hamburger shown overlaid left in the sticky header (Library home). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
  onProfileClick?: () => void;
  profileAvatarUrl?: string;
}

export function LibraryScreen({ onStartReview, onStartMoreReview, onNavigateToPath, onAddCard, onPlayFlashcards, menuToggle, onProfileClick, profileAvatarUrl }: LibraryScreenProps) {
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
    editFolderId,
    openEditFolder,
    editCardTarget,
    setEditCardTarget,
    saveEditedCard,
    deleteTargetId,
    setDeleteTargetId,
    handleDeleteCustomCard,
    confirmDelete,
    activeCollection,
    items,
    recentItems,
    activeView,
    setActiveView,
    isSelecting,
    selectedKeys,
    toggleSelected,
    getItemKey,
    bulkRemoveOpen,
    setBulkRemoveOpen,
    confirmBulkRemove,
    moveOpen,
    setMoveOpen,
    moveSelectedTo,
  } = useLibrary();

  const overview = useReviewOverview();
  const tocflReadiness = useTocflReadiness();

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

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const handleOpenAddCard = useCallback(() => {
    if (onAddCard) {
      onAddCard();
      return;
    }
    setIsAddCardOpen(true);
  }, [onAddCard]);

  const [menu, setMenu] = useState<{ kind: 'folder' | 'card'; id: string; name: string; point: MenuPoint } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const handleCardMenu = useCallback(
    (card: DBDictionaryEntry | UserFlashcard, point: MenuPoint) => {
      const custom = card as UserFlashcard;
      setMenu({ kind: 'card', id: custom.id, name: custom.traditional || custom.simplified, point });
    },
    [],
  );

  const menuActions: LibraryMenuAction[] = !menu
    ? []
    : menu.kind === 'folder'
      ? [
          { id: 'edit', label: 'Edit folder', icon: 'pencil', onSelect: () => openEditFolder(menu.id) },
          { id: 'delete', label: 'Delete folder', icon: 'trash', danger: true, onSelect: () => setDeleteFolderTarget({ id: menu.id, name: menu.name }) },
        ]
      : [
          {
            id: 'edit',
            label: 'Edit card',
            icon: 'pencil',
            onSelect: () => {
              const card = (items as UserFlashcard[]).find((item) => item.id === menu.id);
              if (card) setEditCardTarget(card);
            },
          },
          { id: 'delete', label: 'Delete card', icon: 'trash', danger: true, onSelect: () => void handleDeleteCustomCard(menu.id) },
        ];

  return (
    <div className="relative flex flex-1 w-full flex-col text-ui-ink">
      <StickyWorkspaceHeader
        title={activeView === 'folder' ? (activeCollection.title ?? 'Folder') : 'Library'}
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
          ) : onProfileClick ? (
            <ProfileAvatarButton onClick={onProfileClick} src={profileAvatarUrl} />
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
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-5 md:px-8">
        <LibrarySearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={activeView === 'folder' ? `Search ${activeCollection.title ?? 'folder'}` : 'Search folders'}
          label={activeView === 'folder' ? `Search ${activeCollection.title ?? 'folder'}` : 'Search the library'}
        />
      </div>

      {activeView === 'home' && (
        <motion.div
          key="home-view"
          className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-32 pt-0 md:px-8 sm:pb-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <LibraryHomeView
            reviewCard={<ReviewHubCard overview={overview} onStartReview={onStartReview} onStartMoreReview={onStartMoreReview} onNavigateToPath={onNavigateToPath} />}
            progressCard={<LibraryTocflProgressCard readiness={tocflReadiness} />}
            collections={allCollections}
            recentItems={recentItems}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCollection={(id) => {
              setLibraryActiveFolder(id);
              setSearchQuery('');
              setActiveView('folder');
            }}
            onFolderMenu={(id, point) => {
              const folder = allCollections.find((collection) => collection.id === id);
              if (folder) setMenu({ kind: 'folder', id, name: folder.title, point });
            }}
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
          className="mx-auto flex w-full min-h-full max-w-6xl flex-col px-4 pb-36 pt-0 md:px-8"
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
                  !isStarred ? (
                    <ActionButton variant="primary" onClick={handleOpenAddCard} className="w-auto px-7">
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
                onAddCard={handleOpenAddCard}
                onRemoveCard={handleRemoveCard}
                onOpenCard={handleOpenCard}
                onCardMenu={handleCardMenu}
                isSelecting={isSelecting}
                selectedKeys={selectedKeys}
                getItemKey={getItemKey}
                onToggleSelect={(card) => toggleSelected(getItemKey(card))}
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
        mode={editFolderId ? 'edit' : 'create'}
      />
      <AddCardDialog
        open={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        folderId={libraryActiveFolder}
        folderTitle={activeCollection?.title}
      />
      <EditCardDialog card={editCardTarget} onSave={saveEditedCard} onClose={() => setEditCardTarget(null)} />
      {menu && <LibraryContextMenu point={menu.point} label={menu.kind === 'folder' ? `${menu.name} folder options` : `${menu.name} card options`} actions={menuActions} onClose={closeMenu} />}
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

      {bulkRemoveOpen && (
        <ConfirmationDialog
          title={`Remove ${selectedKeys.size} ${selectedKeys.size === 1 ? 'card' : 'cards'}?`}
          description={isStarred ? 'They will leave your saved words.' : 'This action cannot be undone.'}
          confirmLabel="Remove"
          confirmLoadingLabel="Removing..."
          cancelLabel="Cancel"
          onConfirm={confirmBulkRemove}
          onCancel={() => setBulkRemoveOpen(false)}
        />
      )}
      <MoveCardsDialog
        open={moveOpen}
        selectedCount={selectedKeys.size}
        folders={allCollections.filter((collection) => collection.id !== 'starred' && collection.id !== libraryActiveFolder)}
        onMove={(folderId) => void moveSelectedTo(folderId)}
        onClose={() => setMoveOpen(false)}
      />

      {activeView === 'folder' && isSelecting && (
        <div className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-sheet-safe pt-10">
          <div className="mx-auto w-full max-w-md px-4 md:px-6">
            {selectedKeys.size === 0 ? (
              <p className="pointer-events-auto pb-3 text-center text-[15px] font-extrabold text-ui-muted">Tap cards to select them</p>
            ) : (
              <div className="pointer-events-auto flex gap-3">
                {!isStarred && (
                  <ActionButton variant="secondary" size="lg" fullWidth onClick={() => setMoveOpen(true)} edgeColor="var(--color-ui-divider)" className="!border-ui-divider">
                    <span>Move {selectedKeys.size}</span>
                  </ActionButton>
                )}
                <ActionButton variant="danger" size="lg" fullWidth onClick={() => setBulkRemoveOpen(true)}>
                  <span>Remove {selectedKeys.size}</span>
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'folder' && !isSelecting && onPlayFlashcards && activeCollection.count > 0 && (
        <div className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-sheet-safe pt-10">
          <div className="mx-auto w-full max-w-md px-4 md:px-6">
            <ActionButton
              size="lg"
              fullWidth
              onClick={() => {
                setSearchQuery('');
                onPlayFlashcards();
              }}
              edgeColor={activeCollection.colorBack}
              aria-label="Start flashcards"
              className="pointer-events-auto min-h-14 btn-touch-primary"
              frontClassName={cn(activeCollection.accentBg, activeCollection.onAccent)}
            >
              <AppIcon name="play" size={20} />
              <span>Study {activeCollection.count} {activeCollection.count === 1 ? 'card' : 'cards'}</span>
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
