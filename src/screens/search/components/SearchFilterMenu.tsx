import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDismiss } from '../../../hooks/useDismiss';
import { cn } from '../../../utils/cn';

export interface SearchFilters {
  /** Level label, e.g. "A1"; null = any. */
  level: string | null;
  /** Course book number (My book scope); null = any. */
  bookId: number | null;
  /** Lesson within the chosen book; null = any. */
  lessonId: number | null;
}

export const NO_SEARCH_FILTERS: SearchFilters = { level: null, bookId: null, lessonId: null };

interface SearchFilterMenuProps {
  levelOptions: string[];
  /** My book scope: books and (for the chosen book) lessons found in the results. */
  bookOptions?: number[];
  lessonOptions?: number[];
  value: SearchFilters;
  onChange: (next: SearchFilters) => void;
}

interface Choice {
  id: string;
  label: string;
}

/** Equal-width cells in a fixed column count, so a group never leaves one chip alone on its last row. */
const COLUMNS = { 4: 'grid-cols-4', 6: 'grid-cols-6' } as const;

function OptionGroup({ title, options, selected, onSelect, columns = 4 }: { title: string; options: Choice[]; selected: string | null; onSelect: (id: string | null) => void; columns?: keyof typeof COLUMNS }) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-ui-muted">{title}</p>
      <div className={cn('grid gap-1.5', COLUMNS[columns])}>
        {options.map((option) => {
          const isActive = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? null : option.id)}
              className={cn(
                'rounded-compact border-2 px-0 py-1.5 text-center text-sm font-black tabular-nums transition-colors focus-ring',
                isActive
                  ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep'
                  : 'border-ui-divider bg-ui-surface text-ui-ink-strong hover:bg-ui-hover',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Filter by book, lesson and level; the results list narrows as you pick. */
export function SearchFilterMenu({ levelOptions, bookOptions = [], lessonOptions = [], value, onChange }: SearchFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss({ ref: containerRef, onDismiss: () => setIsOpen(false), isActive: isOpen });

  const activeCount = [value.level, value.bookId, value.lessonId].filter((filter) => filter !== null).length;
  const hasOptions = levelOptions.length + bookOptions.length > 0;
  const asChoices = (labels: string[]): Choice[] => labels.map((label) => ({ id: label, label }));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={activeCount ? `Filter, ${activeCount} active` : 'Filter'}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex items-center gap-1.5 rounded-control border-2 border-b-4 px-3 py-1.5 text-sm font-black transition-[transform,background-color,border-color] active:translate-y-0.5 active:border-b-2 focus-ring',
          activeCount > 0 || isOpen
            ? 'border-brand-primary border-b-brand-primary-edge bg-brand-primary-soft text-brand-primary-deep'
            : 'border-ui-divider bg-ui-surface text-ui-ink-strong',
        )}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h14M3 14h14" />
          <circle cx="7" cy="6" r="2.2" fill="var(--color-ui-surface)" />
          <circle cx="13" cy="14" r="2.2" fill="var(--color-ui-surface)" />
        </svg>
        <span className="hidden sm:inline">Filter</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-xs font-black text-white">{activeCount}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Filter results"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-full z-50 mt-2 flex w-72 flex-col gap-3.5 popover-surface p-4 text-left sm:w-80"
          >
            {hasOptions ? (
              <>
                <OptionGroup
                  title="Book"
                  options={bookOptions.map((id) => ({ id: String(id), label: `Book ${id}` }))}
                  selected={value.bookId === null ? null : String(value.bookId)}
                  onSelect={(id) => onChange({ ...value, bookId: id === null ? null : Number(id), lessonId: null })}
                />
                {value.bookId !== null && (
                  <OptionGroup
                    title={`Lesson · Book ${value.bookId}`}
                    columns={6}
                    options={lessonOptions.map((id) => ({ id: String(id), label: String(id) }))}
                    selected={value.lessonId === null ? null : String(value.lessonId)}
                    onSelect={(id) => onChange({ ...value, lessonId: id === null ? null : Number(id) })}
                  />
                )}
                <OptionGroup title="Level" options={asChoices(levelOptions)} selected={value.level} onSelect={(level) => onChange({ ...value, level })} />
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange(NO_SEARCH_FILTERS)}
                    className="self-start rounded-compact px-2 py-1 text-sm font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring"
                  >
                    Clear filters
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm font-bold text-ui-muted">Nothing to filter yet.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
