import { useRef, useState, useEffect } from 'react';
import { PiLockKeyFill } from 'react-icons/pi';
import { CourseIcon } from '../../lib/widgets';
import { SAMPLE_BOOKS } from '../../data/books';
import { motion } from 'motion/react';

interface BookCarouselProps {
  activeBookId: number;
  onActiveBookChange: (id: number) => void;
}

export function BookCarousel({ activeBookId, onActiveBookChange }: BookCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState(
    Math.max(0, SAMPLE_BOOKS.findIndex((b) => b.id === activeBookId))
  );

  const lastEmittedBookId = useRef(activeBookId);

  // Initialize scroll position on mount
  useEffect(() => {
    if (containerRef.current) {
      const index = SAMPLE_BOOKS.findIndex((b) => b.id === activeBookId);
      if (index !== -1) {
        // Use a short timeout to ensure the layout has rendered and width is available
        setTimeout(() => {
          if (containerRef.current) {
            const child = containerRef.current.children[index] as HTMLElement;
            if (child) {
              child.scrollIntoView({
                behavior: 'auto',
                inline: 'center',
                block: 'nearest'
              });
            }
          }
        }, 10);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // When activeBookId changes externally, we might want to update our internal index
    if (activeBookId !== lastEmittedBookId.current) {
      const index = SAMPLE_BOOKS.findIndex((b) => b.id === activeBookId);
      if (index !== -1 && index !== internalIndex) {
        setInternalIndex(index);
        lastEmittedBookId.current = activeBookId;
        // Optional: scroll to it smoothly if changed from outside
        if (containerRef.current) {
          const child = containerRef.current.children[index] as HTMLElement;
          if (child) {
            child.scrollIntoView({
              behavior: 'smooth',
              inline: 'center',
              block: 'nearest'
            });
          }
        }
      }
    }
  }, [activeBookId, internalIndex]);

  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const itemWidthRef = useRef<number>(0);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Cache itemWidth to prevent forced layout thrashing during scroll
    if (itemWidthRef.current === 0) {
      const child = container.firstElementChild as HTMLElement;
      if (child) {
        itemWidthRef.current = child.offsetWidth;
      }
    }
    
    const itemWidth = itemWidthRef.current;
    if (!itemWidth) return;
    
    const scrollLeft = container.scrollLeft;
    
    // Calculate new index
    const newIndex = Math.round(scrollLeft / itemWidth);
    
    // Fast update for the internal visual state to make UI responsive immediately
    // Only schedule the slow state update when the item actually changes during the scroll,
    // rather than resetting the debounce timeout on EVERY scroll frame, which caused huge delays.
    if (newIndex !== internalIndex && newIndex >= 0 && newIndex < SAMPLE_BOOKS.length) {
      setInternalIndex(newIndex);
      
      if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
          if (activeBookId !== SAMPLE_BOOKS[newIndex].id) {
              if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
                  window.navigator.vibrate(5);
              }
              lastEmittedBookId.current = SAMPLE_BOOKS[newIndex].id;
              onActiveBookChange(SAMPLE_BOOKS[newIndex].id);
          }
      }, 50);
    }
  };

  useEffect(() => {
      const handleResize = () => {
          itemWidthRef.current = 0;
      };
      window.addEventListener('resize', handleResize);
      return () => {
          window.removeEventListener('resize', handleResize);
          if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      }
  }, []);

  const handleItemClick = (index: number) => {
    if (index !== internalIndex && containerRef.current) {
      const child = containerRef.current.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    } else {
      lastEmittedBookId.current = SAMPLE_BOOKS[index].id;
      onActiveBookChange(SAMPLE_BOOKS[index].id);
    }
  };

  // Center padding so first and last items can snap to center
  const paddingClass = "px-[calc(50%-140px)] sm:px-[calc(50%-160px)] md:px-[calc(50%-180px)]";

  return (
    <>
      <div className="w-full pb-6 pt-6 relative overflow-hidden">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className={`flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar ${paddingClass}`}
          style={{
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
            maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        >
          {SAMPLE_BOOKS.map((book, index) => {
            const isActive = index === internalIndex;
            return (
              <div 
                key={`${book.id}-${index}`} 
                className="snap-center snap-always shrink-0 w-[280px] sm:w-[320px] md:w-[360px] flex items-center justify-center p-2"
                onClick={() => handleItemClick(index)}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : 0.75,
                    opacity: isActive ? 1 : 0.5,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`w-full cursor-pointer relative flex flex-col items-center justify-center ${
                    book.status === "locked" ? "saturate-[0.6]" : ""
                  }`}
                >
                  <div className="w-full aspect-[4/3] flex-1 mb-4 relative flex items-center justify-center transition-colors duration-300">
                    <CourseIcon
                      id={book.id}
                      className="absolute w-[160%] h-[160%] -left-[30%] -top-[30%] transition-transform duration-500 ease-out group-hover:scale-[1.08] drop-shadow-sm pointer-events-none"
                    />
                    {book.status === "locked" && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-[24px] bg-white/70 backdrop-blur-md flex items-center justify-center border-b-[4px] border-[#E5E5E5]">
                          <PiLockKeyFill size={32} className="text-[#AFB6BB]" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2.5 mb-8 z-20">
        {SAMPLE_BOOKS.map((b) => (
          <div
            key={b.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              b.id === activeBookId
                ? `w-4 ${SAMPLE_BOOKS.find((sb) => sb.id === activeBookId)?.accentBg}`
                : "w-2 bg-[#E5E5E5]"
            }`}
          />
        ))}
      </div>
    </>
  );
}
