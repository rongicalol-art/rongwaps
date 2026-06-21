import { motion } from 'motion/react';

interface BottomCharacterTabsProps {
  chars: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  activeBook: any;
  layoutIdPrefix: string;
}

export function BottomCharacterTabs({
  chars,
  selectedIndex,
  onChange,
  activeBook,
  layoutIdPrefix
}: BottomCharacterTabsProps) {
  const getTabBgClass = (book: any) => {
    if (book.id === 1) return "bg-[#1CB0F6]";
    if (book.id === 2) return "bg-[#FF9600]";
    if (book.id === 3) return "bg-[#A0522D]";
    if (book.id === 4) return "bg-[#58CC02]";
    return book.accentBg || "bg-[#1CB0F6]";
  };

  if (chars.length <= 1) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 px-4 flex justify-center pointer-events-none mb-1">
      <div className="w-full max-w-[280px] bg-white border-[3px] border-[#E5E5E5] border-b-[6px] rounded-[24px] p-1.5 flex items-center justify-center pointer-events-auto shadow-md">
        {chars.map((c, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              className={`relative flex-1 h-[44px] flex items-center justify-center rounded-[18px] text-[24px] font-chinese transition-colors z-10 font-normal outline-none cursor-pointer
              ${isSelected ? 'text-white' : 'text-[#AFB6BB] hover:text-[#4B4B4B]'}`}
            >
              {isSelected && (
                 <motion.div
                   layoutId={`${layoutIdPrefix}-tab-indicator`}
                   className={`absolute inset-0 z-[-1] rounded-[16px] ${getTabBgClass(activeBook)} shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)]`}
                   transition={{ type: "spring", stiffness: 500, damping: 35 }}
                 />
              )}
              <span className="relative z-10 leading-none tracking-normal">{c}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
