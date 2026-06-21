import { PiTrashBold } from 'react-icons/pi';
import { motion } from 'motion/react';
import { Soft3DButton } from '../../lib/widgets';

interface DeleteFolderModalProps {
  deleteFolderTarget: { id: string; name: string } | null;
  setDeleteFolderTarget: (target: { id: string; name: string } | null) => void;
  confirmDeleteFolder: () => void;
}

export function DeleteFolderModal({
  deleteFolderTarget,
  setDeleteFolderTarget,
  confirmDeleteFolder,
}: DeleteFolderModalProps) {
  if (!deleteFolderTarget) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setDeleteFolderTarget(null)}
        className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm bg-white rounded-[24px] border-[2px] border-[#E5E5E5] border-b-[6px] p-6 shadow-xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#FFE5E5] rounded-[20px] flex items-center justify-center mx-auto mb-4">
            <PiTrashBold size={32} className="text-[#FF4B4B]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#4B4B4B]">Delete Folder?</h2>
          <p className="text-[#4B4B4B] font-extrabold text-base mt-2">"{deleteFolderTarget.name}"</p>
          <p className="text-[#AFB6BB] text-sm mt-2 font-bold leading-relaxed">
            This will remote this folder. Your flashcards inside will not be deleted but kept in custom cards.
          </p>
        </div>
        <div className="flex gap-3">
          <Soft3DButton
            onClick={() => setDeleteFolderTarget(null)}
            className="flex-1 bg-white border-[#E5E5E5] text-[#AFB6BB] hover:bg-[#F7F7F7] py-3 text-[15px]"
          >
            CANCEL
          </Soft3DButton>
          <Soft3DButton
            onClick={confirmDeleteFolder}
            className="flex-1 bg-[#FF4B4B] border-[#E03A3A] text-white py-3 text-[15px]"
          >
            DELETE
          </Soft3DButton>
        </div>
      </motion.div>
    </div>
  );
}
