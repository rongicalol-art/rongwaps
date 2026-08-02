import { motion } from 'motion/react';
import { PiPlusBold, PiBookmarkSimpleFill, PiSparkleFill, PiCaretLeftBold } from 'react-icons/pi';
import { useLibrary } from './hooks/useLibrary';
import { FolderModal } from './FolderModal';
import { DeleteCardModal } from './DeleteCardModal';
import { DeleteFolderModal } from './DeleteFolderModal';
import { LibrarySkeleton } from './components/LibrarySkeleton';
import { SpellCard } from './components/SpellCard';
import { LibraryHomeView } from './components/LibraryHomeView';
import { SearchBar3D, Soft3DButton } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import type { DBDictionaryEntry } from '../../types/database';
import type { UserFlashcard } from '../../types/models';

interface LibraryScreenProps {
  onAddCard?: () => void;
  onPlayFlashcards?: () => void;
}

// Clean Duo-style empty state
function EmptyState({ onAddCard, isStarred }: { onAddCard?: () => void; isStarred: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col items-center justify-center py-20 px-6"
    >
      {/* Big friendly icon */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          isStarred ? 'bg-[#FFF3D0]' : 'bg-[#E5F7FF]'
        }`}
      >
        {isStarred ? (
          <PiBookmarkSimpleFill size={48} className="text-[#FFB020]" />
        ) : (
          <PiSparkleFill size={48} className="text-[#1CB0F6]" />
        )}
      </motion.div>

      <h3 className="font-black text-ui-ink-strong text-[20px] mb-2 text-center">
        {isStarred ? 'No starred words yet!' : 'Nothing here yet!'}
      </h3>
      <p className="text-[14px] font-bold text-ui-muted text-center leading-relaxed max-w-[260px] mb-6">
        {isStarred
          ? 'Tap the star on words in the dictionary to save them here.'
          : 'Create your first flashcard to start collecting!'}
      </p>

      {!isStarred && onAddCard && (
        <Soft3DButton variant="primary" onClick={onAddCard} className="w-auto px-8">
          <PiPlusBold size={18} />
          Create Card
        </Soft3DButton>
      )}
    </motion.div>
  );
}

export function LibraryScreen({ onAddCard, onPlayFlashcards }: LibraryScreenProps) {
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
    activeView,
    setActiveView,
  } = useLibrary();

  const isStarred = libraryActiveFolder === 'starred';

  return (
    <div className="flex-1 flex flex-col w-full text-ui-ink h-full overflow-y-auto relative bg-ui-canvas">
      {activeView === 'home' && (
        <motion.div
          key="home-view"
          className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-24 pt-5 md:px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <LibraryHomeView
            collections={allCollections}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCollection={(id) => {
              setLibraryActiveFolder(id);
              setSearchQuery('');
              setActiveView('folder');
            }}
            onDeleteFolder={(id, name) => setDeleteFolderTarget({ id, name })}
            onCreateFolder={() => { setNewFolderName(''); setShowFolderModal(true); }}
            onPracticeCollection={onPlayFlashcards ? (id) => {
              setLibraryActiveFolder(id);
              onPlayFlashcards();
            } : undefined}
            onAddCard={onAddCard}
          />
        </motion.div>
      )}

      {activeView === 'folder' && (
        <motion.div
          key="folder-view"
          className="flex flex-col w-full min-h-full px-4 md:px-8 pt-6 pb-24 max-w-5xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Folder Header (Combined Back + Title) */}
          <div className="flex items-center gap-3 mb-6 mt-2 w-full">
            <button
              onClick={() => { setSearchQuery(''); setActiveView('home'); }}
              className="p-2 -ml-2 text-ui-muted hover:text-ui-ink transition-colors rounded-full hover:bg-ui-divider active:scale-95"
            >
              <PiCaretLeftBold size={24} />
            </button>
            <div className="text-ui-ink scale-110 ml-1">
              {activeCollection.icon}
            </div>
            <h1 className="font-black text-[24px] sm:text-[28px] text-ui-ink-strong truncate pr-4">
              {activeCollection.title}
            </h1>
          </div>

          {/* ── Divider ── */}
          <div className="w-full mb-6">
            <div className="h-[3px] w-full bg-ui-border rounded-full" />
          </div>

          <SearchBar3D
            value={searchQuery}
            onValueChange={setSearchQuery}
            onSubmit={setSearchQuery}
            showSubmit={false}
            placeholder={`Search ${activeCollection.title}...`}
            className="mb-6"
          />

          {/* ── CONTENT AREA ── */}
          {isLoadingFavs && isStarred ? (
            <LibrarySkeleton />
          ) : items.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center py-10">
              <EmptyState onAddCard={onAddCard} isStarred={isStarred} />
            </div>
          ) : (
            <div className="w-full">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="font-black text-[16px] text-ui-ink-strong">
                  {items.length} {items.length === 1 ? 'card' : 'cards'}
                </h2>
              </div>

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
                        if (isStarred) toggleFavorite(item.traditional);
                        else handleDeleteCustomCard((item as UserFlashcard).id);
                      }}
                      onClick={() => {
                        setDictionaryWord(
                          isStarred ? item.traditional : (item.traditional || item.simplified)
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
                        "cursor-pointer w-full flex flex-col justify-center items-center text-center select-none outline-none transition-colors duration-150",
                        "min-h-[120px] rounded-[24px] border-2 border-b-[6px] bg-transparent border-dashed border-ui-border hover:border-[#1CB0F6] hover:bg-white text-ui-muted hover:text-[#1CB0F6]"
                      )}
                    >
                      <PiPlusBold size={24} className="mb-2" />
                      <span className="block font-black text-[14px] uppercase tracking-wider">
                        Add Card
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
    </div>
  );
}
