import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface LibrarySearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

/** The library's search: a pressable field that stays under the title. */
export function LibrarySearchField({ value, onChange, placeholder, label }: LibrarySearchFieldProps) {
  return (
    <div className="flex h-[52px] items-center gap-2.5 rounded-control border-2 border-b-[length:var(--depth-lg)] border-ui-divider bg-ui-surface pl-4 pr-2 transition-colors focus-within:border-brand-primary focus-within:border-b-brand-primary-edge">
      <AppIcon name="search" size={22} className="shrink-0 text-ui-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className="h-full min-w-0 flex-1 appearance-none bg-transparent text-base font-extrabold text-ui-ink-strong outline-none placeholder:font-bold placeholder:text-ui-muted [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-[transform,opacity,background-color] duration-200 hover:bg-ui-hover focus-ring',
          value ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0',
        )}
      >
        <AppIcon name="close" size={20} />
      </button>
    </div>
  );
}
