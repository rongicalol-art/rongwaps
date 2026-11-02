import { useEffect, useRef, type ReactNode } from 'react';
import { SearchField } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export type SearchMode = 'global' | 'curriculum';

const SCOPES: { value: SearchMode; label: string }[] = [
  { value: 'global', label: 'All words' },
  { value: 'curriculum', label: 'My book' },
];

interface DictionarySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  /** Right of the scope chips: the result count and the filter button. */
  summary?: string;
  filterSlot?: ReactNode;
}

/** Search is the first thing on the screen: a pressable field, then the scope choice. */
export function DictionarySearchBar({ value, onChange, mode, onModeChange, summary, filterSlot }: DictionarySearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onChange('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [value, onChange]);

  return (
    <div className="flex flex-col gap-3.5">
      <SearchField value={value} onChange={onChange} placeholder="Hanzi, pinyin or English" label="Search the dictionary" large inputRef={inputRef} />

      <div className="flex items-center gap-2">
      <div role="group" aria-label="Search in" className="flex gap-2">
        {SCOPES.map((scope) => {
          const isActive = scope.value === mode;
          return (
            <button
              key={scope.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onModeChange(scope.value)}
              className={cn(
                'whitespace-nowrap rounded-control border-2 border-b-4 px-3.5 py-1.5 text-sm font-black transition-[transform,background-color,border-color] active:translate-y-0.5 active:border-b-2 focus-ring',
                isActive
                  ? 'border-brand-primary border-b-brand-primary-edge bg-brand-primary-soft text-brand-primary-deep'
                  : 'border-ui-divider bg-ui-surface text-ui-ink-strong',
              )}
            >
              {scope.label}
            </button>
          );
        })}
      </div>
      {(summary || filterSlot) && (
        <div className="ml-auto flex min-w-0 items-center gap-3">
          {summary && <span className="truncate text-sm font-extrabold text-ui-muted">{summary}</span>}
          {filterSlot}
        </div>
      )}
      </div>
    </div>
  );
}