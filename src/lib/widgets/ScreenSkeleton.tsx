import React from 'react';
import { Skeleton } from './Skeleton';
import { PiXBold, PiGearFill, PiLightbulbFill, PiSpeakerHighFill } from 'react-icons/pi';
import { LuSnail } from 'react-icons/lu';
import { ScreenLayout } from './ScreenLayout';

interface ScreenSkeletonProps {
  type?: 'flashcard' | 'quiz' | 'listening' | 'writing';
}

export const ScreenSkeleton: React.FC<ScreenSkeletonProps> = ({ type = 'flashcard' }) => {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#F7F7F7] flex flex-col overflow-hidden overscroll-none font-sans text-[#4B4B4B] select-none pointer-events-none">
      
      {/* 1:1 Frame-matching Header mirroring PracticeHeader and ScreenHeader */}
      <header className="w-full bg-white border-b-[3px] border-[#E5E5E5] shadow-sm shrink-0 relative z-10 px-4 md:px-6 py-4">
        <div className="w-full max-w-xl flex items-center justify-between mx-auto">
          {/* Close icon shape */}
          <div className="p-2 -ml-2 text-[#AFB6BB]/40 shrink-0">
            <PiXBold size={28} />
          </div>
          
          {/* Progress bar container */}
          <div className="flex-1 mx-4 md:mx-6 flex items-center justify-center">
            <div className="h-4 w-full relative rounded-full bg-[#E5E5E5]">
              <div className="absolute left-0 top-0 bottom-0 w-[35%] bg-[#E5E5E5] rounded-full animate-pulse" />
            </div>
          </div>
          
          {/* Right helper buttons mimicking insights and settings */}
          <div className="flex items-center gap-1 shrink-0 h-10 text-[#AFB6BB]/40">
            <div className="p-2">
              <PiLightbulbFill size={28} />
            </div>
            <div className="p-2 -mr-2">
              <PiGearFill size={28} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area mirroring actual screen geometries (No intermediate wrapper to prevent layout shift) */}
      {type === 'flashcard' && (
        <ScreenLayout maxWidth="xl" className="relative h-full pt-2 flex flex-col pb-[120px] flex-1">
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-full h-[420px] sm:h-[480px] max-h-[60vh] max-w-[320px] sm:max-w-[400px] md:max-w-[460px] mx-auto flex flex-col items-center justify-center relative perspective-[2000px] z-10">
              <div className="absolute inset-0 bg-white rounded-[32px] flex flex-col items-center justify-center p-8 border-[3px] border-b-[8px] border-[#E5E5E5] shadow-sm">
                
                {/* Big Character Card content skeleton */}
                <div className="flex-1 flex flex-col items-center justify-center w-full mt-8">
                  <div className="w-32 sm:w-40 h-24 sm:h-32 bg-[#E5E5E5]/60 rounded-[24px] animate-pulse" />
                </div>
                
                {/* "TAP TO FLIP" placeholder */}
                <div className="mt-4 mb-2 h-12 w-full flex items-end justify-center">
                  <div className="w-24 h-4 bg-[#E5E5E5]/60 rounded-full animate-pulse" />
                </div>
                
              </div>
            </div>
          </div>
        </ScreenLayout>
      )}

      {type === 'quiz' && (
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 sm:px-6 pb-[200px] overscroll-none overflow-y-auto">
          <h2 className="text-[26px] font-extrabold text-[#4B4B4B] opacity-50 mt-4 mb-2 tracking-tight text-left w-full px-2">
            Select the correct translation
          </h2>

          {/* Giant Chinese character query container */}
          <div className="flex flex-col items-center justify-center py-4 mb-2 w-full min-h-[120px]">
            <div className="w-[120px] h-[90px] sm:h-[120px] bg-[#E5E5E5]/60 rounded-[24px] animate-pulse" />
          </div>

          {/* Exactly 3 choices matching Duolingo style 3D buttons */}
          <div className="grid grid-cols-1 gap-3 w-full pb-[120px] px-2 sm:px-0 mt-2">
            {[1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className="relative w-full p-4 px-6 rounded-[16px] flex items-center bg-white border-[3px] border-[#E5E5E5]"
                style={{ boxShadow: '0 4px 0 0 #E5E5E5' }}
              >
                {/* Number box indicator */}
                <div className="w-8 h-8 shrink-0 rounded-[8px] border-[3px] border-[#E5E5E5] flex items-center justify-center mr-4 font-bold text-sm text-[#AFB6BB] bg-[#F7F7F7]">
                  {idx}
                </div>
                
                {/* Word text placeholder */}
                <div className="flex-1">
                  <div className="w-[45%] h-5 bg-[#E5E5E5]/60 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'listening' && (
        <ScreenLayout maxWidth="xl" className="pb-[200px] overscroll-none overflow-y-auto flex-1">
          <h2 className="text-[26px] font-extrabold text-[#4B4B4B] opacity-50 mt-4 mb-4 tracking-tight text-left w-full px-2">
            What do you hear?
          </h2>

          {/* 1:1 Audio speaker play feedback controls */}
          <div className="flex items-center justify-center gap-6 mb-12 mt-6 relative">
            <div 
              className="relative w-[130px] h-[130px] rounded-[36px] bg-[#E5E5E5]/50 border-b-[8px] border-[#D5D5D5] flex items-center justify-center text-[#AFB6BB]/40 transition-all pointer-events-none"
            >
              <PiSpeakerHighFill size={72} className="opacity-30" />
            </div>
            
            <div 
              className="w-[72px] h-[72px] rounded-[24px] bg-[#E5E5E5]/40 border-b-[6px] border-[#D5D5D5] flex items-center justify-center text-[#AFB6BB]/40 transition-all pointer-events-none"
            >
              <LuSnail size={38} className="opacity-30" />
            </div>
          </div>

          {/* Exactly 3 choices matching listening answers */}
          <div className="flex flex-col gap-3 w-full">
            {[1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className="relative w-full p-4 px-6 rounded-[16px] flex items-center bg-white border-[3px] border-[#E5E5E5]"
                style={{ boxShadow: '0 4px 0 0 #E5E5E5' }}
              >
                {/* Number box indicator */}
                <div className="w-8 h-8 shrink-0 rounded-[8px] border-[3px] border-[#E5E5E5] flex items-center justify-center mr-4 font-bold text-sm text-[#AFB6BB] bg-[#F7F7F7]">
                  {idx}
                </div>
                
                {/* Word translation text placeholder */}
                <div className="flex-1">
                  <div className="w-[35%] h-5 bg-[#E5E5E5]/60 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </ScreenLayout>
      )}

      {type === 'writing' && (
        <ScreenLayout maxWidth="xl" className="flex-1 mb-[120px] justify-center items-center px-0 sm:px-0 flex-col relative w-full pointer-events-none">
          
          {/* Meaning Above text placeholder */}
          <div className="w-full flex-shrink-0 flex flex-col items-center justify-center px-4 mb-3 sm:mb-6 mt-4">
            <div className="w-[50%] h-7 bg-[#E5E5E5]/60 rounded-full animate-pulse" />
          </div>

          {/* Perfect HanziCanvas boundary size square boxes */}
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square bg-[#F7F7F7] rounded-[32px] md:rounded-[40px] border-[3px] border-b-[8px] md:border-b-[10px] border-[#E5E5E5] mx-auto shadow-sm flex items-center justify-center overflow-hidden">
            {/* Decorative axes grids exactly matching canvas layout */}
            <div className="absolute inset-y-0 border-r-[1px] border-dashed border-[#E5E5E5]/80 left-[50%]" />
            <div className="absolute inset-x-0 border-b-[1px] border-dashed border-[#E5E5E5]/80 top-[50%]" />
            
            <div className="w-[55%] h-[55%] bg-[#E5E5E5]/45 rounded-2xl animate-pulse" />
          </div>

          {/* Bottom area of Canvas: Pinyin placeholder & Skip indicator */}
          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 h-[60px]">
            <div className="w-24 h-5 bg-[#E5E5E5]/60 rounded-full animate-pulse" />
            
            <div className="mt-4 w-full flex justify-center">
              <span className="text-[#AFB6BB] font-extrabold text-[15px] uppercase tracking-widest px-6 py-3 opacity-60">
                SKIP
              </span>
            </div>
          </div>
          
        </ScreenLayout>
      )}
      
    </div>
  );
};
