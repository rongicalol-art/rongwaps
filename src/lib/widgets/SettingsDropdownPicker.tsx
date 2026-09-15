import { useState } from 'react';
import { motion } from 'motion/react';
import { AppIcon } from './AppIcon';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';

export interface SettingsDropdownPickerOption<T extends string> {
  value: T;
  label: string;
}

export interface SettingsDropdownPickerProps<T extends string> {
  label: string;
  value: T;
  options: SettingsDropdownPickerOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

/**
 * Duolingo-style settings select: field label above a full-width tactile
 * value button (uppercase tracked value + chevron) opening a dropdown list.
 */
export function SettingsDropdownPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  ariaLabel,
}: SettingsDropdownPickerProps<T>) {
  const [open, setOpen] = useState(false);
  // Exact match first; fall back to the numerically nearest option so
  // previously-stored custom numeric values still show a sensible label.
  const numericValue = Number(value);
  const current = options.find((option) => option.value === value)
    ?? (Number.isFinite(numericValue)
      ? [...options].sort((a, b) => Math.abs(Number(a.value) - numericValue) - Math.abs(Number(b.value) - numericValue))[0]
      : undefined);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-extrabold text-ui-ink">{label}</span>
      <DropdownMenu
        label={ariaLabel}
        open={open}
        onOpenChange={setOpen}
        align="start"
        widthClassName="w-full"
        menuClassName="max-h-72 overflow-y-auto"
        renderTrigger={(triggerProps) => (
          <button
            {...triggerProps}
            aria-label={ariaLabel}
            className="flex w-full items-center justify-between gap-3 rounded-control border-2 border-ui-border bg-ui-surface px-4 py-2.5 shadow-[0_var(--depth-md)_0_var(--color-ui-border)] outline-none transition-shadow focus-ring active:shadow-none active:translate-y-[length:var(--depth-md)]"
          >
            <span className="truncate text-sm font-black uppercase tracking-widest text-ui-muted-strong">
              {current?.label}
            </span>
            <motion.span
              aria-hidden="true"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="text-ui-muted"
            >
              <AppIcon name="dropdown" size={18} />
            </motion.span>
          </button>
        )}
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            active={option.value === value}
            onClick={() => {
              setOpen(false);
              onChange(option.value);
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    </div>
  );
}
