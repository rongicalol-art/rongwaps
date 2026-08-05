import { useState, type FormEvent, type FormHTMLAttributes, type KeyboardEvent } from 'react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { Soft3DButton } from './Soft3DButton';

export interface SearchBar3DProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  initialValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
  showSubmit?: boolean;
  variant?: 'default' | 'flat';
  onSubmit: (value: string) => void;
}

export function SearchBar3D({
  initialValue = '',
  value: controlledValue,
  onValueChange,
  placeholder = 'Search...',
  submitLabel = 'Search',
  showSubmit = true,
  variant = 'default',
  onSubmit,
  className,
  ...props
}: SearchBar3DProps) {
  const [internalValue, setInternalValue] = useState(initialValue);
  const value = controlledValue ?? internalValue;

  const handleValueChange = (nextValue: string) => {
    if (controlledValue === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = value.trim();
    if (nextValue) onSubmit(nextValue);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.repeat || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const nextValue = value.trim();
    if (nextValue) onSubmit(nextValue);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex w-full items-center gap-2 rounded-[24px] bg-white p-2 font-sans transition-[background-color,box-shadow] focus-within:ring-4 focus-within:ring-brand-primary/15',
        variant === 'default' ? 'border-2 border-ui-border focus-within:border-brand-primary' : 'border-0 shadow-none hover:bg-ui-surface focus-within:bg-white',
        className,
      )}
      {...props}
    >
      <AppIcon name="search" className="ml-2 shrink-0 text-ui-muted" size={22} />
      <input
        value={value}
        onChange={(event) => handleValueChange(event.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 min-w-0 flex-1 bg-transparent px-1 font-sans text-[16px] font-bold tracking-normal text-ui-ink outline-none placeholder:font-bold placeholder:tracking-normal placeholder:text-ui-muted"
      />
      {showSubmit && (
        <Soft3DButton
          type="submit"
          variant="custom"
          depth="sm"
          disabled={!value.trim()}
          className="h-12 w-auto shrink-0 rounded-[17px] border-[#1899D6] bg-[#1CB0F6] px-4 py-0 text-[13px] tracking-wide text-white shadow-none disabled:opacity-70 sm:px-6"
        >
          <span className="hidden sm:inline">{submitLabel}</span>
          <AppIcon name="search" className="sm:hidden" size={19} />
        </Soft3DButton>
      )}
      {!showSubmit && (
        <button type="submit" tabIndex={-1} className="sr-only">
          {submitLabel}
        </button>
      )}
    </form>
  );
}
