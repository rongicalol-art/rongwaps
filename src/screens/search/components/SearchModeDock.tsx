import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, SegmentedControl } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export type SearchMode = 'global' | 'curriculum';

interface SearchModeDockProps {
  mode: SearchMode;
  onChangeMode: (mode: SearchMode) => void;
  selectedBookIds: number[];
  onToggleBook: (bookId: number) => void;
  onSelectAllBooks: () => void;
  onClearBooks: () => void;
}

export function SearchModeDock({
  mode,
  onChangeMode,
  selectedBookIds,
  onToggleBook,
  onSelectAllBooks,
  onClearBooks,
}: SearchModeDockProps) {
  const [isCurriculumMenuOpen, setIsCurriculumMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!isCurriculumMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) {
        setIsCurriculumMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCurriculumMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCurriculumMenuOpen]);

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 360,
              damping: 32,
              mass: 0.72,
            }
      }
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[250] mb-4 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 md:mb-6"
    >
      <div
        ref={dockRef}
        className="pointer-events-auto relative flex w-full max-w-[320px] items-center justify-center"
      >
        {/* Books Popover Anchored Above Curriculum Tab */}
        <AnimatePresence>
          {isCurriculumMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="absolute bottom-full right-0 w-[220px] pb-2 z-50 pointer-events-auto"
            >
              <div
                role="menu"
                aria-label="Filter curriculum books"
                className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5"
              >
                <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-ui-divider">
                  <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted">
                    Books ({selectedBookIds.length}/4)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onSelectAllBooks}
                      className="text-[11px] font-extrabold text-brand-primary hover:underline focus-ring-inline"
                    >
                      All
                    </button>
                    <span className="text-ui-divider">·</span>
                    <button
                      type="button"
                      onClick={onClearBooks}
                      className="text-[11px] font-extrabold text-ui-muted hover:text-ui-ink focus-ring-inline"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  {SAMPLE_BOOKS.map((book) => {
                    const isSelected = selectedBookIds.includes(book.id);
                    return (
                      <button
                        key={book.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isSelected}
                        onClick={() => onToggleBook(book.id)}
                        className={cn(
                          'flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-sm text-left text-xs font-extrabold transition-colors outline-none focus-ring',
                          isSelected
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'text-ui-muted hover:bg-ui-hover hover:text-ui-ink',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn('h-2 w-2 rounded-full shrink-0', book.accentBg)} />
                          <span className="truncate">{book.label}</span>
                          <span className="text-[10px] font-bold text-ui-muted shrink-0">
                            {book.level}
                          </span>
                        </div>

                        <AppIcon
                          name={isSelected ? 'check' : 'plus'}
                          size={15}
                          className={cn('shrink-0', isSelected ? 'text-brand-primary' : 'text-ui-muted/50')}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PracticeModeDock-style SegmentedControl */}
        <SegmentedControl<SearchMode>
          value={mode}
          ariaLabel="Search mode"
          layoutId="search-mode-dock-pill"
          className="w-full h-14 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1 px-2"
          options={[
            {
              value: 'global',
              label: 'Global',
              icon: <AppIcon name="dictionary" size={20} className="h-5 w-5" />,
            },
            {
              value: 'curriculum',
              label: (
                <span className="flex items-center gap-1.5">
                  <span>Curriculum</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-black leading-tight',
                      mode === 'curriculum' ? 'bg-white/25 text-white' : 'bg-ui-divider text-ui-muted-strong',
                    )}
                  >
                    {selectedBookIds.length}
                  </span>
                </span>
              ),
              icon: <AppIcon name="books" size={20} className="h-5 w-5" />,
              buttonProps: {
                'aria-haspopup': 'menu',
                'aria-expanded': isCurriculumMenuOpen,
              },
            },
          ]}
          onChange={(nextMode) => {
            if (nextMode === 'curriculum') {
              if (mode === 'curriculum') {
                setIsCurriculumMenuOpen((prev) => !prev);
              } else {
                onChangeMode('curriculum');
                setIsCurriculumMenuOpen(true);
              }
            } else {
              setIsCurriculumMenuOpen(false);
              onChangeMode('global');
            }
          }}
        />
      </div>
    </motion.div>
  );
}
