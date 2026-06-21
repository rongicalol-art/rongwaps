import React from 'react';
import { motion } from 'motion/react';
import { PiTextTBold, PiCheckSquareFill, PiBrainFill } from 'react-icons/pi';
import { SAMPLE_BOOKS } from '../../data/books';

interface QuizMenuProps {
  activeBookId: number;
  onSelectMode: (mode: 'choices' | 'typing') => void;
}

export const QuizMenu: React.FC<QuizMenuProps> = ({ activeBookId, onSelectMode }) => {
  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  return (
    <motion.div 
      key="menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto items-center mt-[-20px]"
    >
      <div className="text-center mb-10">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className={`absolute inset-0 ${activeBook.bg} opacity-60 rounded-full blur-[30px] scale-110`}></div>
          <div className={`relative w-full h-full ${activeBook.bg} border-[3px] ${activeBook.accentBorder} border-b-[8px] rounded-[36px] flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-300`}>
            <PiBrainFill size={64} className={activeBook.accent} />
          </div>
        </div>
        <h2 className="text-4xl font-extrabold text-[#4B4B4B] tracking-tight mb-3">Quiz Time!</h2>
        <p className="text-[#AFB6BB] font-bold text-[17px] px-4">Choose a mode to test your knowledge.</p>
      </div>

      <div className="flex flex-col gap-4 w-full px-2">
        <button 
          onClick={() => onSelectMode('choices')}
          className="group relative bg-white border-b-[6px] border-[#E5E5E5] rounded-[24px] p-5 active:border-b-[0px] active:translate-y-[6px] hover:bg-[#F7F7F7] transition-all duration-150 text-left outline-none block w-full"
        >
          <div className="relative z-10 flex gap-5 items-center">
            <div className={`w-16 h-16 ${activeBook.accentBg} text-white rounded-[20px] flex items-center justify-center shrink-0 border-b-[4px] ${activeBook.buttonEdge}`}>
              <PiCheckSquareFill size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-[20px] font-bold text-[#4B4B4B] mb-1">Multiple Choice</h3>
              <p className="text-[#AFB6BB] text-[15px] font-bold leading-tight">Select the correct translation</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => onSelectMode('typing')}
          className="group relative bg-white border-b-[6px] border-[#E5E5E5] rounded-[24px] p-5 active:border-b-[0px] active:translate-y-[6px] hover:bg-[#F7F7F7] transition-all duration-150 text-left outline-none block w-full"
        >
          <div className="relative z-10 flex gap-5 items-center">
            <div className={`w-16 h-16 ${activeBook.accentBg} text-white rounded-[20px] flex items-center justify-center shrink-0 border-b-[4px] ${activeBook.buttonEdge}`}>
              <PiTextTBold size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-[20px] font-bold text-[#4B4B4B] mb-1">Typing Mode</h3>
              <p className="text-[#AFB6BB] text-[15px] font-bold leading-tight">Type the exact translation</p>
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
