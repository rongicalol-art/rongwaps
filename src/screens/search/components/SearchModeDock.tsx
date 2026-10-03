import { useEffect, useRef, useState } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, FloatingDock, SegmentedControl } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingDockSleep } from '../../../hooks/useFloatingDockSleep';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const { isAsleep, dockProps, wake } = useFloatingDockSleep({
    ref: containerRef,
    isLockedAwake: isCurriculumMenuOpen,
    onMouseLeave: () => setIsCurriculumMenuOpen(false),
  });

  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      wake();
    }
  }, [mode, wake]);

  useDismiss({
    ref: containerRef,
    onDismiss: () => setIsCurriculumMenuOpen(false),
    isActive: isCurriculumMenuOpen,
  });

  return (
    <FloatingDock.Root>
      <div
        ref={containerRef}
        {...dockProps}
        className={cn(
          'pointer-events-auto relative flex w-full max-w-sm items-center justify-center',
          'transition-[opacity,box-shadow]',
          isAsleep
            ? 'opacity-20 shadow-none duration-300 ease-in-out'
            : 'opacity-100 duration-200 ease-out',
        )}
      >
        {/* Books Popover Anchored Above Curriculum Tab */}
        <FloatingDock.Popover
          open={isCurriculumMenuOpen}
          onClose={() => setIsCurriculumMenuOpen(false)}
          align="right"
          className="w-[220px]"
        >
          <div
            role="menu"
            aria-label="Filter curriculum books"
            className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5"
          >
            <div className="mb-1 flex items-center justify-between border-b-2 border-ui-divider px-2.5 py-1">
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
                      'flex items-center justify-between gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs font-extrabold transition-colors outline-none focus-ring',
                      isSelected
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-ui-muted hover:bg-ui-hover hover:text-ui-ink'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', book.accentBg)} />
                      <span className="truncate">{book.label}</span>
                      <span className="shrink-0 text-[10px] font-bold text-ui-muted">
                        {book.level}
                      </span>
                    </div>

                    <AppIcon
                      name={isSelected ? 'check' : 'plus'}
                      size={15}
                      className={cn(
                        'shrink-0',
                        isSelected ? 'text-brand-primary' : 'text-ui-muted/50'
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </FloatingDock.Popover>

        {/* Search Mode SegmentedControl inside dock */}
        <SegmentedControl<SearchMode>
          value={mode}
          ariaLabel="Search mode"
          layoutId="search-mode-dock-pill"
          className="dock-pill w-full rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5 px-2.5"
          options={[
            {
              value: 'global',
              label: 'Global',
              icon: <AppIcon name="dictionary" size={22} className="h-5.5 w-5.5" />,
            },
            {
              value: 'curriculum',
              label: (
                <span className="flex items-center gap-1.5">
                  <span>Curriculum</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-black leading-tight',
                      mode === 'curriculum'
                        ? 'bg-white/25 text-white'
                        : 'bg-ui-divider text-ui-muted-strong'
                    )}
                  >
                    {selectedBookIds.length}
                  </span>
                </span>
              ),
              icon: <AppIcon name="books" size={22} className="h-5.5 w-5.5" />,
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
    </FloatingDock.Root>
  );
}
