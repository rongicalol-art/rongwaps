import { ActionButton, EmptyState, PlayfulNavIcon, type PlayfulNavIconName } from '../../../lib/widgets';

interface PracticeEmptyStateProps {
  icon: PlayfulNavIconName;
  /** The active book's accent text class. */
  accent: string;
  loadError: unknown;
  emptyTitle: string;
  emptyDescription: string;
  /** What could not be loaded, e.g. "these words". */
  errorSubject: string;
  onClose: () => void;
}

/** A practice screen with nothing to show: loading failed or the selection has no items. */
export function PracticeEmptyState({ icon, accent, loadError, emptyTitle, emptyDescription, errorSubject, onClose }: PracticeEmptyStateProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      <EmptyState
        icon={<PlayfulNavIcon name={icon} className="h-12 w-12" />}
        iconBg={loadError ? 'bg-feedback-danger-surface' : 'bg-ui-surface'}
        iconColor={loadError ? 'text-feedback-danger' : accent}
        title={loadError ? 'Something went wrong' : emptyTitle}
        description={loadError ? `We couldn't load ${errorSubject}. Please try again.` : emptyDescription}
        action={(
          <ActionButton variant="primary" size="lg" onClick={onClose} className="uppercase tracking-wider">
            Go back
          </ActionButton>
        )}
      />
    </div>
  );
}
