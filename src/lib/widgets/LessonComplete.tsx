import { motion } from 'motion/react';
import { PiTrophyFill, PiSparkleFill, PiLightningFill } from 'react-icons/pi';
import { Soft3DButton } from './Soft3DButton';

interface LessonCompleteProps {
  score?: number;
  accuracy?: number;
  learnedCount?: number;
  unlearnedCount?: number;
  activeBook?: any;
  onContinue?: () => void;
  onReviewUnlearned?: () => void;
  onResetAll?: () => void;
}

export const LessonComplete = ({
  score,
  accuracy,
  learnedCount,
  unlearnedCount,
  activeBook,
  onContinue,
  onReviewUnlearned,
  onResetAll
}: LessonCompleteProps) => {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#F7F7F7] flex flex-col justify-center items-center overflow-hidden overscroll-none px-6 z-[100] pb-[80px]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[360px] flex flex-col items-center relative"
      >
         <motion.div 
           initial={{ y: 10, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.05, duration: 0.3, ease: 'easeOut' }}
           className="relative mb-10"
         >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`w-32 h-32 md:w-40 md:h-40 ${activeBook?.accentBg || 'bg-[#FFC800]'} rounded-full flex items-center justify-center shadow-[0_12px_40px_rgba(255,200,0,0.4)]`}
              style={activeBook ? { boxShadow: `0 12px 40px ${activeBook.accentHex}66` } : undefined}
            >
              <PiTrophyFill size={80} className="text-white" />
            </motion.div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-40px] pointer-events-none"
            >
               <PiSparkleFill size={32} className={`${activeBook?.accent || 'text-[#FFC800]'} absolute top-4 left-10`} />
               <PiSparkleFill size={24} className={`${activeBook?.accent || 'text-[#FFD900]'} absolute bottom-8 right-8`} />
               <PiSparkleFill size={20} className={`${activeBook?.accent || 'text-[#FFB000]'} absolute top-1/2 -left-4`} />
            </motion.div>
         </motion.div>
         
         <motion.div
           initial={{ y: 10, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
           className="text-center mb-8 w-full"
         >
           <h2 className="text-[28px] md:text-[32px] font-black text-[#4B4B4B] tracking-tight leading-tight mb-2">Lesson Complete!</h2>
           <p className="text-[16px] text-[#AFB6BB] font-bold">Excellent session today.</p>
         </motion.div>

         {score !== undefined && accuracy !== undefined && (
           <motion.div 
             initial={{ y: 10, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
             className="flex gap-4 w-full mb-10"
           >
             <div className={`flex-[1] ${activeBook?.accentBg || 'bg-[#FFC800]'} rounded-2xl p-4 flex flex-col items-center border-[2px] ${activeBook?.accentBorder || 'border-[#E5B400]'} text-white`}>
                <span className="text-[13px] font-extrabold uppercase tracking-wider opacity-90 mb-1">Score</span>
                <span className="text-[28px] font-black">+{score}</span>
             </div>
             <div className={`flex-[1] ${activeBook?.accentBg || 'bg-[#FFC800]'} rounded-2xl p-4 flex flex-col items-center border-[2px] ${activeBook?.accentBorder || 'border-[#E5B400]'} text-white`}>
                <span className="text-[13px] font-extrabold uppercase tracking-wider opacity-90 mb-1">Accuracy</span>
                <span className="text-[28px] font-black">{accuracy}%</span>
             </div>
           </motion.div>
         )}

         {/* XP Earned */}
         {score !== undefined && score > 0 && (
           <motion.div
             initial={{ y: 10, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.18, duration: 0.3, ease: 'easeOut' }}
             className="w-full mb-6"
           >
             <div className="bg-[#FFF9E5] border-[3px] border-[#FFE066] rounded-[20px] p-3 flex items-center justify-center gap-2">
               <PiLightningFill className="text-[#FFC800]" size={20} />
               <span className="text-[#B8960F] font-extrabold text-[15px]">+{score} XP earned this session!</span>
             </div>
           </motion.div>
         )}

         <motion.div 
           initial={{ y: 10, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
           className="flex flex-col gap-3 w-full"
         >
           {unlearnedCount !== undefined && unlearnedCount > 0 && onReviewUnlearned && (
             <Soft3DButton variant="custom" className="w-full text-white bg-[#E54D4D] border-[#C93B3B] hover:bg-[#F25C5C] text-[16px]" onClick={onReviewUnlearned}>
               REVIEW {unlearnedCount} CARD{unlearnedCount === 1 ? '' : 'S'}
             </Soft3DButton>
           )}
           {onResetAll && (
             <Soft3DButton variant="custom" className="w-full bg-white text-[#4B4B4B] font-black uppercase tracking-widest border-b-[6px] border-[#E5E5E5] active:border-b-[0px] active:translate-y-[6px] hover:bg-[#F7F7F7] text-[16px] rounded-[24px]" onClick={onResetAll}>
               PRACTICE ALL AGAIN
             </Soft3DButton>
           )}
           {onContinue && (
             <button 
               className={`mt-3 w-full py-4 rounded-[16px] font-extrabold text-[17px] uppercase tracking-widest text-[#AFB6BB] hover:text-[#4B4B4B] transition-colors`}
               onClick={onContinue}
             >
               Continue
             </button>
           )}
         </motion.div>
      </motion.div>
    </div>
  );
};
