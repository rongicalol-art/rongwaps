import { AnimatePresence, motion } from 'motion/react';
import { 
  PiPlusBold,
  PiBookmarkSimpleFill,
} from 'react-icons/pi';
import { useLibrary } from './hooks/useLibrary';
import { FolderModal } from './FolderModal';
import { DeleteCardModal } from './DeleteCardModal';
import { DeleteFolderModal } from './DeleteFolderModal';
import { VirtualizedList } from './VirtualizedList';
import { FolderItem } from './components/FolderItem';
import { LibrarySkeleton } from './components/LibrarySkeleton';

interface LibraryScreenProps {
  onAddCard?: () => void;
  onPlayFlashcards?: () => void;
}

export function LibraryScreen({ onAddCard }: LibraryScreenProps) {
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
  } = useLibrary(onAddCard);

  return (
    <div className="flex-1 flex flex-col w-full text-[#4B4B4B] h-full overflow-y-auto relative bg-[#F7F7F7]">
      <AnimatePresence mode="wait">
        {activeView === 'home' && (
          <motion.div 
            key="home-view"
            className="flex flex-col pb-16 pt-2 animate-in fade-in zoom-in-[0.98] duration-500 ease-out w-full overflow-x-hidden min-h-full"
          >
            {/* Folders Scroll List */}
            <div className="w-full pb-8 pt-4 relative overflow-x-auto flex px-4 custom-scrollbar">
              <div className="flex gap-4 sm:gap-8 min-w-max pb-2 mx-auto grow shrink-0 lg:justify-center justify-start items-start">
                {allCollections.map((c) => {
                  const isActive = c.id === libraryActiveFolder;
                  return (
                    <FolderItem
                      key={c.id}
                      id={c.id}
                      title={c.title}
                      icon={c.icon}
                      accentBg={c.accentBg}
                      accentBorder={c.accentBorder}
                      accentColor={c.accentColor}
                      isActive={isActive}
                      onSelect={() => {
                        setLibraryActiveFolder(c.id);
                        setSearchQuery('');
                      }}
                      onDeleteRequest={() => setDeleteFolderTarget({ id: c.id, name: c.title })}
                    />
                  );
                })}
                
                {/* Create Folder Button (Visual) */}
                <motion.div
                  initial={false}
                  animate={{ scale: 0.95, opacity: 0.7 }}
                  whileHover={{ scale: 1.08, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setNewFolderName('');
                    setShowFolderModal(true);
                  }}
                  className="cursor-pointer flex flex-col items-center gap-3 shrink-0"
                >
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[24px] md:rounded-[28px] border-[3px] border-dashed border-[#E5E5E5] bg-[#F7F7F7] hover:bg-white hover:border-[#AFB6BB] hover:text-[#4B4B4B] text-[#AFB6BB] flex items-center justify-center transition-all duration-200">
                     <PiPlusBold size={40} />
                  </div>
                  <div className="text-center w-full px-1">
                    <span className="block font-extrabold text-[15px] sm:text-[17px] text-[#AFB6BB] mt-1">
                      New Folder
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Content List aligned with learning list layout */}
            <div className="px-6 md:px-12 w-full pb-12 max-w-5xl mx-auto flex flex-col items-center">
               {isLoadingFavs && libraryActiveFolder === 'starred' ? (
                 <LibrarySkeleton />
               ) : items.length === 0 ? (
                 <div className="w-full pb-8">
                   {libraryActiveFolder === 'starred' ? (
                     <div className="w-full py-16 text-center flex flex-col items-center justify-center">
                        <div className={`w-20 h-20 rounded-[20px] ${activeCollection.lightBg} ${activeCollection.accentColor} flex items-center justify-center mb-4`}>
                           <PiBookmarkSimpleFill size={40} />
                        </div>
                        <p className="font-extrabold text-[#AFB6BB] text-xl">Empty Collection</p>
                        <p className="text-sm font-bold text-[#AFB6BB] mt-2 opacity-70">
                          Find words in the dictionary to star.
                        </p>
                     </div>
                   ) : (
                     <div className="flex flex-col w-full bg-white border-[2px] border-b-[4px] border-[#E5E5E5] rounded-[16px] overflow-hidden">
                       {/* Inline Add Card Button when empty */}
                       <div 
                         onClick={onAddCard}
                         className="w-full bg-[#F7F7F7] px-4 py-4 flex flex-row items-center justify-center gap-2 cursor-pointer hover:bg-white transition-all text-[#AFB6BB] hover:text-[#1CB0F6] font-extrabold group"
                       >
                         <PiPlusBold size={20} className="group-hover:scale-110 transition-transform" />
                         <span className="text-sm tracking-widest uppercase">Add Flashcard</span>
                       </div>
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="w-full pb-8">
                   <div className="flex flex-col w-full bg-white border-[2px] border-b-[4px] border-[#E5E5E5] rounded-[16px] overflow-hidden">
                     <VirtualizedList 
                        items={items}
                        libraryActiveFolder={libraryActiveFolder}
                        activeCollection={activeCollection}
                        toggleFavorite={toggleFavorite}
                        handleDeleteCustomCard={handleDeleteCustomCard}
                        setDictionaryWord={setDictionaryWord}
                     />
                     
                     {/* Inline Add Card Button */}
                     {libraryActiveFolder !== 'starred' && (
                       <div 
                         onClick={onAddCard}
                         className={`w-full bg-[#F7F7F7] px-4 py-4 flex flex-row items-center justify-center gap-2 cursor-pointer hover:bg-white transition-all text-[#AFB6BB] hover:text-[#1CB0F6] font-extrabold group ${items.length > 0 ? 'border-t-[2px] border-[#F0F0F0]' : ''}`}
                       >
                         <PiPlusBold size={20} className="group-hover:scale-110 transition-transform" />
                         <span className="text-sm tracking-widest uppercase">Add Flashcard</span>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
