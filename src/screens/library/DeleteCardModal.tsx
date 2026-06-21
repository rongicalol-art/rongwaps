import { PiTrashBold } from 'react-icons/pi';
import { motion } from 'motion/react';
import { Soft3DButton } from '../../lib/widgets';

interface DeleteCardModalProps {
  deleteTargetId: string | null;
  setDeleteTargetId: (id: string | null) => void;
  confirmDelete: () => void;
}

export function DeleteCardModal({
  deleteTargetId,
  setDeleteTargetId,
  confirmDelete,
}: DeleteCardModalProps) {
  if (!deleteTargetId) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setDeleteTargetId(null)}
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
          <h2 className="text-xl font-extrabold text-[#4B4B4B]">Delete Flashcard?</h2>
          <p className="text-[#AFB6BB] text-sm mt-2 font-bold">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <Soft3DButton
            onClick={() => setDeleteTargetId(null)}
            className="flex-1 bg-white border-[#E5E5E5] text-[#AFB6BB] hover:bg-[#F7F7F7] py-3 text-[15px]"
          >
            CANCEL
          </Soft3DButton>
          <Soft3DButton
            onClick={confirmDelete}
            className="flex-1 bg-[#FF4B4B] border-[#E03A3A] text-white py-3 text-[15px]"
          >
            DELETE
          </Soft3DButton>
        </div>
      </motion.div>
    </div>
  );
}
