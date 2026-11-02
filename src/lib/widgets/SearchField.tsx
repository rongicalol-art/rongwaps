import type { RefObject } from 'react';
import { AppIcon } from './AppIcon';
import { cn } from '../../utils/cn';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  /** Taller field with larger text (the dictionary's main search). */
  large?: boolean;
  /** When given, clearing puts the caret back in the field. */
  inputRef?: RefObject<HTMLInputElement | null>;
}

/** A pressable search field with a clear button that appears once there is text. */
export function SearchField({ value, onChange, placeholder, label, large = false, inputRef }: SearchFieldProps) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-control border-2 border-b-[length:var(--depth-lg)] border-ui-divider bg-ui-surface pl-4 pr-2 transition-colors focus-within:border-brand-primary focus-within:border-b-brand-primary-edge', large ? 'h-14' : 'h-[52px]')}>
      <AppIcon name="search" size={22} className="shrink-0 text-ui-muted" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className={cn('h-full min-w-0 flex-1 appearance-none bg-transparent font-extrabold text-ui-ink-strong outline-none placeholder:font-bold placeholder:text-ui-muted [&::-webkit-search-cancel-button]:hidden', large ? 'text-[17px]' : 'text-base')}
      />
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => {
          onChange('');
          inputRef?.current?.focus();
        }}
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
