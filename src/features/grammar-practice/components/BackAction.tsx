import { ActionButton, AppIcon } from '../../../lib/widgets';

/** The quiet Back in grammar exercises: an arrow and where it goes ("Back" = previous item, "Grammar" = the grammar page). */
export function BackAction({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <ActionButton variant="quiet" size="md" className="!px-3 !text-ui-muted-strong" onClick={onBack} aria-label={label === 'Back' ? 'Previous exercise' : `Back to ${label.toLowerCase()}`}>
      <AppIcon name="back" size={20} />
      <span>{label}</span>
    </ActionButton>
  );
}
