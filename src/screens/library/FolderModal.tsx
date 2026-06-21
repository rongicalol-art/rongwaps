import { PiXBold } from 'react-icons/pi';
import { motion } from 'motion/react';
import { Soft3DButton } from '../../lib/widgets';

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
  if (!showFolderModal) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowFolderModal(false)}
        className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm bg-white rounded-[24px] border-[2px] border-[#E5E5E5] border-b-[6px] p-6 shadow-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-[#4B4B4B]">New Folder</h2>
          <button
            onClick={() => setShowFolderModal(false)}
            className="w-10 h-10 rounded-[16px] bg-[#F7F7F7] text-[#AFB6BB] hover:bg-[#E5E5E5] hover:text-[#4B4B4B] flex items-center justify-center transition-colors"
          >
            <PiXBold size={20} />
          </button>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Folder name (e.g. Action Verbs)"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isCreatingFolder) handleCreateFolder();
          }}
          className="w-full bg-[#F7F7F7] border-[2px] border-[#E5E5E5] rounded-[16px] px-4 py-3 font-bold text-[#4B4B4B] placeholder:text-[#AFB6BB] focus:outline-none focus:border-[#1CB0F6] focus:bg-white transition-colors mb-6"
        />

        <Soft3DButton
          onClick={handleCreateFolder}
          disabled={!newFolderName.trim() || isCreatingFolder}
          className="w-full bg-[#1CB0F6] border-[#1899D6] text-white py-3 text-[15px]"
        >
          {isCreatingFolder ? 'CREATING...' : 'CREATE FOLDER'}
        </Soft3DButton>
      </motion.div>
    </div>
  );
}
