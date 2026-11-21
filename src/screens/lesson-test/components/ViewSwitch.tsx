import { ActionButton } from '../../../lib/widgets';

/** A Pinyin or English switch: a real button that stays pressed (honey) while it's on. */
export function ViewSwitch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <ActionButton
      size="sm"
      variant="secondary"
      aria-pressed={on}
      edgeColor={on ? 'var(--color-brand-primary-edge)' : undefined}
      frontClassName={on ? '!border-brand-primary bg-brand-primary-wash !text-brand-primary-deep hover:bg-brand-primary-wash' : undefined}
      onClick={onToggle}
    >
      {label}
    </ActionButton>
  );
}
