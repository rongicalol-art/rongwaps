import React, { useEffect } from 'react';
import { PiCheckBold, PiXBold, PiPuzzlePieceFill, PiArrowCounterClockwiseBold } from 'react-icons/pi';
import { motion, AnimatePresence } from 'motion/react';
import { numberToToneMarks } from '../../utils/pinyin';
import { useAppStore } from '../../store/useAppStore';

export interface FeedbackBottomBarProps {
  status: 'idle' | 'correct' | 'wrong';
  correctAnswer?: string;
  pinyin?: string;
  onContinue: () => void;
  onCheck: () => void;
  isCheckDisabled: boolean;
  onSkip?: () => void;
  onBreakdown?: () => void;
  onRetry?: () => void;
  activeBook?: {
    accent: string;
    bg: string;
    accentBg: string;
    buttonEdge: string;
    accentHex: string;
  };
}

export function FeedbackBottomBar({ 
  status, 
  correctAnswer, 
  pinyin,
  onContinue, 
  onCheck, 
  isCheckDisabled,
  onSkip,
  onBreakdown,
  onRetry,
  activeBook
}: FeedbackBottomBarProps) {
  
  const isChecked = status !== 'idle';
  const isCorrect = status === 'correct';
  
  const isInteractionActive = isChecked || !isCheckDisabled;
  const setIsInteractionActive = useAppStore(state => state.setIsInteractionActive);

  // Sync interaction state to hide mode dock when we are interacting
  useEffect(() => {
    setIsInteractionActive(isInteractionActive);
    return () => setIsInteractionActive(false);
  }, [isInteractionActive, setIsInteractionActive]);

  return (
    <AnimatePresence>
      {isInteractionActive && (
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: "spring", stiffness: 350, damping: 28, mass: 1 }}
          className={`absolute bottom-0 left-0 right-0 z-40 transition-colors duration-300 border-t-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] ${
            !isChecked ? 'border-[#E5E5E5] bg-white' : 
            (isCorrect ? 'border-transparent bg-[#D7FFB8]' : 'border-transparent bg-[#FFDFE0]')
          }`}
        >
          <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-6 md:pt-6 md:pb-10 flex flex-col gap-4 md:gap-5">
            <AnimatePresence>
              {isChecked && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex flex-col w-full px-2 origin-bottom"
                >
                  <div className="flex items-center w-full pb-2">
                    <div className={`flex items-center gap-3 text-[18px] sm:text-[22px] font-extrabold ${isCorrect ? 'text-[#58A700]' : 'text-[#EA2B2B]'}`}>
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-[12px] flex items-center justify-center shrink-0 ${isCorrect ? 'bg-[#58A700] text-white' : 'bg-[#EA2B2B] text-white'}`}>
                          {isCorrect ? <PiCheckBold size={24} /> : <PiXBold size={24} />}
                        </div>
                        {isCorrect ? "Awesome!" : "Correct solution:"}
                    </div>
                  </div>
                  {!isCorrect && correctAnswer && (
                    <div className="flex flex-col gap-1 mt-1 ml-1">
                      <div className="text-[19px] text-[#EA2B2B] font-bold">
                         {correctAnswer}
                      </div>
                      {pinyin && (
                        <div className="text-[17px] text-[#EA2B2B] opacity-80 font-medium">
                           {numberToToneMarks(pinyin)}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 w-full">
              {!isChecked && isCheckDisabled && onSkip ? (
                <button
                  disabled={false}
                  onClick={onSkip}
                  className={`flex-1 py-4 rounded-[16px] font-extrabold text-[15px] md:text-[17px] uppercase tracking-widest transition-all outline-none bg-white text-[#AFB6BB] border-[3px] border-b-[6px] border-[#E5E5E5] hover:bg-[#F7F7F7] active:border-b-[3px] active:translate-y-[3px]`}
                  aria-label="Skip question"
                >
                  Skip
                </button>
              ) : (
                <button
                  disabled={!isChecked && isCheckDisabled}
                  onClick={isChecked ? onContinue : onCheck}
                  className={`flex-1 py-4 rounded-[16px] font-extrabold text-[15px] md:text-[17px] uppercase tracking-widest transition-all outline-none active:border-b-0 ${
                    !isChecked && isCheckDisabled 
                      ? 'bg-[#E5E5E5] text-[#AFB6BB] cursor-not-allowed border-none translate-y-[4px]' 
                      : isChecked 
                        ? (isCorrect 
                            ? 'bg-[#58CC02] text-white border-b-[4px] border-[#58A700] active:translate-y-[4px] hover:bg-[#46A302]' 
                            : 'bg-[#FF4B4B] text-white border-b-[4px] border-[#EA2B2B] active:translate-y-[4px] hover:bg-[#FF2B2B]')
                        : 'bg-[#58CC02] text-white border-b-[4px] border-[#58A700] active:translate-y-[4px] hover:bg-[#46A302]'
                  }`}
                >
                  {isChecked ? (isCorrect ? 'Continue' : 'Got it') : 'Check'}
                </button>
              )}

              {isChecked && onRetry && (
                <button
                  onClick={onRetry}
                  className={`flex items-center justify-center shrink-0 w-[56px] self-stretch rounded-[16px] transition-all outline-none border-[3px] border-b-[6px] active:border-b-[3px] active:translate-y-[3px] ${
                    isCorrect 
                      ? 'bg-[#D7FFB8] border-[#58A700]/30 text-[#58A700] hover:bg-[#58A700]/10 hover:border-[#58A700]' 
                      : 'bg-[#FFDFE0] border-[#EA2B2B]/30 text-[#EA2B2B] hover:bg-[#EA2B2B]/10 hover:border-[#EA2B2B]'
                  }`}
                  aria-label="Retry"
                >
                  <PiArrowCounterClockwiseBold size={28} />
                </button>
              )}

              {isChecked && onBreakdown && (
                 <button
                  onClick={onBreakdown}
                  className={`flex items-center justify-center shrink-0 w-[56px] self-stretch rounded-[16px] transition-all outline-none border-[3px] border-b-[6px] active:border-b-[3px] active:translate-y-[3px] ${
                    isCorrect 
                      ? 'bg-[#D7FFB8] border-[#58A700]/30 text-[#58A700] hover:bg-[#58A700]/10 hover:border-[#58A700]' 
                      : 'bg-[#FFDFE0] border-[#EA2B2B]/30 text-[#EA2B2B] hover:bg-[#EA2B2B]/10 hover:border-[#EA2B2B]'
                  }`}
                  aria-label="Character Breakdown"
                >
                  <PiPuzzlePieceFill size={28} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
