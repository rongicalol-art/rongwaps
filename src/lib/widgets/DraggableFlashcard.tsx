import React from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { numberToToneMarks } from '../../utils/pinyin';

export interface DraggableFlashcardProps {
  card: any;
  direction: number;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveBreakdown: (char: string, index?: number) => void;
  setActiveMemoryHook: (card: any) => void;
  triggerSwipeRate: (level: number) => void;
  onCardTap: (e: React.MouseEvent) => void;
}

const swipeConfidenceThreshold = 100;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 800 : -800,
      opacity: 0,
      scale: 0.9,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 800 : -800,
      opacity: 0,
      scale: 0.9,
    };
  }
};

export const DraggableFlashcard = ({
  card, direction, isFlipped, setIsFlipped,
  setActiveBreakdown, triggerSwipeRate, onCardTap
}: DraggableFlashcardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-300, 300], [-12, 12]);
  const rotateX = useTransform(y, [-200, 200], [6, -6]);
  const draggedBorderColor = useTransform(
    x,
    [-150, 0, 150],
    ['#FF4B4B', '#E5E5E5', '#58CC02']
  );

  const [isDragging, setIsDragging] = React.useState(false);
  const isDraggingRef = React.useRef(false);
  const borderColor = isDragging ? draggedBorderColor : '#E5E5E5';

  const frontLength = card?.front?.length || 1;
  const getFrontFontSize = (len: number) => {
    if (len === 1) return 'text-[100px] sm:text-[130px] md:text-[150px]';
    if (len === 2) return 'text-[80px] sm:text-[100px] md:text-[120px]';
    if (len === 3) return 'text-[60px] sm:text-[76px] md:text-[90px]';
    if (len === 4) return 'text-[46px] sm:text-[60px] md:text-[72px]';
    if (len <= 6) return 'text-[36px] sm:text-[48px] md:text-[56px]';
    return 'text-[28px] sm:text-[36px] md:text-[42px]';
  };

  const getBackFrontFontSize = (len: number) => {
    if (len <= 2) return 'text-[48px] sm:text-[60px]';
    if (len === 3) return 'text-[40px] sm:text-[50px]';
    if (len === 4) return 'text-[32px] sm:text-[40px]';
    if (len <= 6) return 'text-[26px] sm:text-[32px]';
    return 'text-[20px] sm:text-[24px]';
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.5}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragStart={() => {
        isDraggingRef.current = true;
        setIsDragging(true);
      }}
      onDragEnd={(e, info) => {
        setIsDragging(false);
        // slight delay so we don't fire tap events accidentally
        setTimeout(() => { isDraggingRef.current = false; }, 100);
        
        if (info.offset.x < -80) {
          triggerSwipeRate(1);
        } else if (info.offset.x > 80) {
          triggerSwipeRate(3);
        }
      }}
      onClick={(e: React.MouseEvent) => {
        if (isDraggingRef.current) {
          e.stopPropagation();
          return;
        }
        if ((e.target as HTMLElement).closest('button')) return;
        onCardTap(e);
      }}
      style={{
        x,
        y,
        rotateZ,
        rotateX,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="absolute inset-x-0 mx-auto w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px]"
    >
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full relative h-[420px] sm:h-[480px] max-h-[60vh] cursor-pointer"
      >
        {/* Front Side */}
        <motion.div
          className="absolute inset-0 bg-white rounded-[32px] flex flex-col items-center justify-center p-8 border-[3px] border-b-[8px]"
          style={{ borderColor, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className="flex-1 flex flex-col items-center justify-center w-full mt-8">
            <div className="flex flex-row items-center justify-center flex-wrap">
              {Array.from(card.front).map((char: any, i) => {
                const isHanzi = /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(char);
                const hanziIndex = Array.from(card.front).slice(0, i).filter((c: any) => /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(c)).length;

                if (!isHanzi) {
                  return (
                    <span key={i} className={`${getFrontFontSize(frontLength)} px-1 sm:px-2 py-4 sm:py-6 text-[#AFB6BB] leading-[1.1] font-chinese text-center mt-2`}>
                      {char}
                    </span>
                  );
                }

                return (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDraggingRef.current) return;
                      setActiveBreakdown(card.front, hanziIndex);
                    }}
                    className="group flex flex-col items-center justify-center rounded-[24px] px-1 sm:px-2 py-4 sm:py-6 outline-none hover:bg-[#F7F7F7] transition-colors"
                  >
                    <h1 className={`${getFrontFontSize(frontLength)} leading-[1.1] text-[#4B4B4B] tracking-tight text-center font-chinese`}>
                      {char}
                    </h1>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 mb-2 h-12 w-full flex items-end justify-center pointer-events-none">
            <p className="text-[#AFB6BB] text-[15px] font-bold tracking-wider uppercase">TAP TO FLIP</p>
          </div>
        </motion.div>

        {/* Back Side */}
        <motion.div
          className="absolute inset-0 bg-white rounded-[32px] flex flex-col p-6 sm:p-8 pb-10 border-[3px] border-b-[8px]"
          style={{ borderColor, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="mb-4 sm:mb-6 flex flex-col items-center justify-center bg-transparent py-4 px-8 rounded-[24px]">
              <div className="flex flex-row items-center justify-center flex-wrap mb-3">
                {Array.from(card.front).map((char: any, i) => {
                  const isHanzi = /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(char);
                  const hanziIndex = Array.from(card.front).slice(0, i).filter((c: any) => /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(c)).length;

                  if (!isHanzi) {
                    return (
                      <span key={i} className={`${getBackFrontFontSize(frontLength)} px-1 text-[#AFB6BB] leading-none font-chinese text-center mt-2`}>
                        {char}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDraggingRef.current) return;
                        setActiveBreakdown(card.front, hanziIndex);
                      }}
                      className="group flex flex-col items-center justify-center rounded-[16px] px-1 py-1 outline-none hover:bg-[#F7F7F7] transition-colors"
                    >
                      <h1 className={`${getBackFrontFontSize(frontLength)} leading-none text-[#4B4B4B] tracking-tight text-center font-chinese`}>
                        {char}
                      </h1>
                    </button>
                  );
                })}
              </div>
              <span className="text-[18px] sm:text-[20px] font-bold text-[#4B4B4B] tracking-wide relative after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-[2px] after:bg-[#E5E5E5] after:rounded-full mt-2">
                {numberToToneMarks(card.pinyin)}
              </span>
            </div>
            <h2 className={`${
              card.back?.length > 40 ? 'text-[16px] sm:text-[18px] md:text-[20px]' :
              card.back?.length > 20 ? 'text-[18px] sm:text-[22px] md:text-[24px]' :
              'text-[22px] sm:text-[26px] md:text-[30px]'
            } text-[#4B4B4B] font-extrabold text-center leading-tight mt-2 px-2 overflow-y-auto max-h-[140px] hide-scrollbar w-full break-words`}>
              {card.back}
            </h2>
          </div>
          <div className="mt-2 flex items-end justify-center w-full pointer-events-none shrink-0 min-h-[16px]" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};