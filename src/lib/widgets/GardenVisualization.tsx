import React, { useMemo } from 'react';
import { PiPlantFill, PiLeafFill, PiFlowerFill, PiDropFill } from 'react-icons/pi';
import { useAppStore } from '../../store/useAppStore';
import { Soft3DButton } from './Soft3DButton';
import { cn } from '../../utils/cn';
import { SAMPLE_BOOKS } from '../../data/books';

export function GardenVisualization({ onWaterGarden }: { onWaterGarden: () => void }) {
  const { srsData, activeBookId } = useAppStore();

  const activeBook = useMemo(() => {
    return SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  }, [activeBookId]);

  const gardenStats = useMemo(() => {
    let seeds = 0;
    let sprouts = 0;
    let flowers = 0;
    let withered = 0;

    const now = Date.now();
    Object.values(srsData).forEach(card => {
      if (card.nextReviewDate <= now) {
        withered++;
      } else if (card.repetition === 0) {
        seeds++;
      } else if (card.repetition === 1) {
        sprouts++;
      } else {
        flowers++;
      }
    });

    return { seeds, sprouts, flowers, withered, total: Object.keys(srsData).length };
  }, [srsData]);

  const cardsToReview = gardenStats.withered;

  return (
    <div className="w-full bg-white rounded-[24px] border-[3px] border-b-[6px] border-[#E5E5E5] p-6 flex flex-col gap-6 relative overflow-hidden">
      {/* Decorative background element using active book theme color */}
      <div 
        className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: activeBook.accentHex }}
      />
      
      <div className="flex flex-col gap-1 z-10">
        <h2 className="text-xl font-black text-[#4B4B4B] flex items-center gap-2">
          Your Vocabulary Garden
        </h2>
        <p className="text-[#AFB6BB] text-sm font-bold">
          {gardenStats.total} total words planted
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 z-10">
        {/* Seeds */}
        <div className="flex flex-col items-center justify-center p-3 bg-gray-50 border-[2px] border-gray-200 rounded-2xl">
          <PiLeafFill className="text-2xl text-gray-400 mb-1 animate-pulse" />
          <span className="text-lg font-black text-gray-700">{gardenStats.seeds}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center leading-tight">Seeds</span>
        </div>
        
        {/* Sprouts */}
        <div className="flex flex-col items-center justify-center p-3 bg-emerald-50 border-[2px] border-emerald-200 rounded-2xl">
          <PiPlantFill className="text-2xl text-emerald-500 mb-1" />
          <span className="text-lg font-black text-emerald-700">{gardenStats.sprouts}</span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider text-center leading-tight">Sprouts</span>
        </div>

        {/* Flowers */}
        <div className="flex flex-col items-center justify-center p-3 bg-rose-50 border-[2px] border-rose-200 rounded-2xl">
          <PiFlowerFill className="text-2xl text-rose-500 mb-1" />
          <span className="text-lg font-black text-rose-700">{gardenStats.flowers}</span>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider text-center leading-tight">Flowers</span>
        </div>

        {/* Withered (Needs Review / Thirsty) */}
        <div className={cn(
          "flex flex-col items-center justify-center p-3 rounded-2xl border-[2px]",
          cardsToReview > 0 
            ? "bg-amber-50 border-amber-300" 
            : "bg-gray-50 border-gray-200"
        )}>
          <PiDropFill className={cn(
            "text-2xl mb-1",
            cardsToReview > 0 ? "text-amber-500 animate-bounce" : "text-gray-400"
          )} />
          <span className={cn(
            "text-lg font-black",
            cardsToReview > 0 ? "text-amber-700" : "text-gray-700"
          )}>{gardenStats.withered}</span>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider text-center leading-tight",
            cardsToReview > 0 ? "text-amber-500" : "text-gray-400"
          )}>Thirsty</span>
        </div>
      </div>

      <div className="z-10 mt-2">
        {cardsToReview > 0 ? (
          <Soft3DButton 
            variant="custom" 
            onClick={onWaterGarden}
            className={cn(
              "text-white uppercase tracking-widest font-extrabold py-4", 
              activeBook.accentBg, 
              activeBook.buttonEdge
            )}
          >
            <PiDropFill className="text-xl" />
            Water Garden ({cardsToReview})
          </Soft3DButton>
        ) : (
          <Soft3DButton 
            variant="locked" 
            className="py-4"
          >
            Garden is Hydrated!
          </Soft3DButton>
        )}
      </div>
    </div>
  );
}
