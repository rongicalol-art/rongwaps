import { SAMPLE_BOOKS } from '../../data/books';
import { AppIcon } from '../../lib/widgets';
import { CourseIcon } from './components/CourseIcons';
import { useBookCarouselNavigation } from './hooks/useBookCarouselNavigation';

interface BookCarouselProps {
  activeBookId: number;
  onActiveBookChange: (id: number) => void;
}

export function BookCarousel({ activeBookId, onActiveBookChange }: BookCarouselProps) {
  const activeIndex = Math.max(0, SAMPLE_BOOKS.findIndex((book) => book.id === activeBookId));
  const navigation = useBookCarouselNavigation({
    activeIndex,
    itemCount: SAMPLE_BOOKS.length,
    onSelect: (index) => onActiveBookChange(SAMPLE_BOOKS[index].id),
  });

  return (
    <section aria-label="Choose a course book" className="w-full">
      <div className="relative -mt-3 w-full overflow-hidden pb-3 sm:-mt-2 md:-mt-1 md:pb-5">
        <div
          ref={navigation.stageRef}
          role="group"
          tabIndex={0}
          aria-label="Swipe horizontally or use arrow keys to change books"
          onKeyDown={navigation.handleKeyDown}
          onPointerDown={navigation.handlePointerDown}
          onPointerUp={navigation.handlePointerUp}
          onPointerCancel={navigation.handlePointerCancel}
          className="relative h-[230px] w-full select-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 sm:h-[260px] md:h-[290px]"
          style={{
            touchAction: 'pan-y',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        >
          {SAMPLE_BOOKS.map((book, index) => {
            const offset = index - activeIndex;
            const isActive = offset === 0;

            return (
              <button
                key={book.id}
                type="button"
                aria-label={`Select ${book.title}`}
                aria-pressed={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  if (!navigation.shouldIgnoreClick()) navigation.selectIndex(index);
                }}
                className={`absolute left-1/2 top-0 flex w-[280px] items-center justify-center p-2 outline-none transition-[transform,opacity,filter] duration-300 ease-out focus-visible:ring-4 focus-visible:ring-brand-primary/25 motion-reduce:transition-none sm:w-[320px] md:w-[360px] ${
                  book.status === 'locked' ? 'saturate-[0.6]' : ''
                }`}
                style={{
                  zIndex: isActive ? 20 : Math.max(1, 10 - Math.abs(offset)),
                  opacity: isActive ? 1 : 0.5,
                  transform: `translate3d(calc(-50% + ${offset * 100}%), 0, 0) scale(${isActive ? 1 : 0.75})`,
                }}
              >
                <span className="relative mb-4 flex aspect-[4/3] w-full items-center justify-center">
                  <CourseIcon
                    id={book.id}
                    className="pointer-events-none absolute -left-[30%] -top-[30%] h-[160%] w-[160%] drop-shadow-sm"
                  />
                  {book.status === 'locked' && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-[24px] border-b-4 border-ui-border bg-white/70 text-ui-muted backdrop-blur-md">
                        <AppIcon name="lock" size={32} />
                      </span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="z-20 mb-8 flex items-center justify-center gap-2.5" aria-hidden="true">
        {SAMPLE_BOOKS.map((book) => (
          <span
            key={book.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              book.id === activeBookId ? `w-4 ${book.accentBg}` : 'w-2 bg-ui-border'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
