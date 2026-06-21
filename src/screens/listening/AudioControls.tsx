import { PiSpeakerHighFill } from 'react-icons/pi';
import { LuSnail } from 'react-icons/lu';
import { motion } from 'motion/react';

interface AudioControlsProps {
  isPlaying: boolean;
  playAudio: (rate: number) => void;
  activeBook: any;
}

export function AudioControls({ isPlaying, playAudio, activeBook }: AudioControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6 mb-12 mt-6 relative">
      <button 
        onClick={() => playAudio(1.0)}
        className={`relative w-[130px] h-[130px] rounded-[36px] ${activeBook.accentBg} ${activeBook.buttonEdge} border-b-[8px] flex items-center justify-center text-white transition-all outline-none
           ${isPlaying ? 'translate-y-[8px] border-b-0' : 'hover:brightness-105 active:border-b-0 active:translate-y-[8px]'}
        `}
      >
        <PiSpeakerHighFill size={72} />
        
        {isPlaying && (
          <motion.div
            className={`absolute inset-[0px] rounded-[36px] ${activeBook.accentBg} z-[-1]`}
            animate={{ scale: [1.0, 1.25, 1.4], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </button>
      
      <button 
        onClick={() => playAudio(0.4)}
        className={`w-[72px] h-[72px] rounded-[24px] ${activeBook.accentBg} ${activeBook.buttonEdge} border-b-[6px] flex items-center justify-center text-white transition-all outline-none
          ${isPlaying 
             ? 'bg-[#E5E5E5] border-[#CECECE] text-[#AFB6BB] translate-y-[6px] border-b-0 cursor-not-allowed'
             : 'hover:brightness-105 active:border-b-0 active:translate-y-[6px]'
          }
        `}
      >
        <LuSnail size={38} />
      </button>
    </div>
  );
}
