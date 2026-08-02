import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { InteractiveGrammarPart } from '../../../types/models';
import {
  getGrammarPathStatus,
  type LearningPathStatus,
} from '../../../utils/lessonProgress';

interface GrammarPathActionsProps {
  parts: InteractiveGrammarPart[];
  startedPartIds: string[];
  completedPageIds: string[];
  completedPartIds: string[];
  onOpenPart: (partId: string) => void;
}

const actionLabel = (status: LearningPathStatus) => {
  if (status === 'completed') return 'Review';
  if (status === 'in-progress') return 'Continue';
  return 'Start';
};

export function GrammarPathActions({
  parts,
  startedPartIds,
  completedPageIds,
  completedPartIds,
  onOpenPart,
}: GrammarPathActionsProps) {
  if (parts.length === 0) return null;

  return (
    <div className="mt-6 border-t-2 border-ui-divider pt-4">
      <div className="mb-1 flex items-center gap-2">
        <AppIcon name="books" size={19} className="text-feedback-warning-edge" />
        <h3 className="text-sm font-black text-ui-ink">Grammar</h3>
      </div>
      <div className="divide-y-2 divide-ui-divider">
        {parts.map((part) => {
          const status = getGrammarPathStatus(
            part,
            startedPartIds,
            completedPageIds,
            completedPartIds,
          );

          return (
            <div
              key={part.id}
              className="flex flex-col gap-3 py-3 first:pt-2 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.06em] text-feedback-warning-edge">
                  Part {part.partId} · {part.grammarPages.length}{' '}
                  {part.grammarPages.length === 1 ? 'grammar point' : 'grammar points'}
                </p>
                <p className="mt-1 text-sm font-extrabold text-ui-ink-strong">
                  {part.title}
                </p>
              </div>
              <ActionButton
                variant="secondary"
                size="md"
                onClick={() => onOpenPart(part.id)}
                className="w-full sm:w-auto"
              >
                {actionLabel(status)}
                <AppIcon name={status === 'completed' ? 'check' : 'next'} size={17} />
              </ActionButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
