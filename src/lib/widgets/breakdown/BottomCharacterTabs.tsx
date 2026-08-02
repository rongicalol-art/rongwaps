import { motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface BottomCharacterTabsProps {
  chars: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  activeBook: CourseBook;
  layoutIdPrefix: string;
}

export function BottomCharacterTabs({
  chars,
  selectedIndex,
  onChange,
  activeBook,
  layoutIdPrefix
}: BottomCharacterTabsProps) {
  const getTabBgClass = (book: CourseBook) => {
    if (book.id === 1) return "bg-[#1CB0F6]";
    if (book.id === 2) return "bg-[#FF9600]";
    if (book.id === 3) return "bg-[#A0522D]";
    if (book.id === 4) return "bg-[#58CC02]";
    return book.accentBg || "bg-[#1CB0F6]";
  };

  if (chars.length <= 1) return null;

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 mb-1 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3">
      <div className="pointer-events-auto flex w-full max-w-[280px] items-center justify-center rounded-[22px] bg-ui-surface p-1.5 shadow-[0_8px_24px_rgba(47,50,55,0.12)]">
        {chars.map((c, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              className={`relative z-10 flex h-11 flex-1 cursor-pointer items-center justify-center rounded-[17px] font-chinese text-[24px] font-normal outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-primary/25
              ${isSelected ? 'text-white' : 'text-ui-muted hover:bg-ui-hover hover:text-ui-ink'}`}
            >
              {isSelected && (
                 <motion.div
                   layoutId={`${layoutIdPrefix}-tab-indicator`}
                   className={`absolute inset-0 z-[-1] rounded-[15px] ${getTabBgClass(activeBook)} shadow-[inset_0_-3px_0_rgba(0,0,0,0.13)]`}
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
