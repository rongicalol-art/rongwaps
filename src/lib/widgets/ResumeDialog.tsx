import { useRef } from 'react';
import { ActionButton } from './ActionButton';
import { Dialog } from './Dialog';
import { PlayfulNavIcon, type PlayfulNavIconName } from './PlayfulNavIcon';

export interface ResumeDialogProps {
  title: string;
  detail: string;
  continueLabel: string;
  startOverLabel: string;
  icon: PlayfulNavIconName;
  /** 'review' warms the dialog to the honey of the review round it leads into. */
  tone?: 'review';
  /** 0-100: how far the session got, when the deck size is known. */
  progress?: number;
  onContinue: () => void;
  /** Throws the saved progress away. */
  onStartOver: () => void;
  onClose: () => void;
  zIndexClassName?: string;
}

/** Opens before a lesson or deck that has saved progress: pick up where it stopped, or begin again. */
export function ResumeDialog({ title, detail, continueLabel, startOverLabel, icon, progress, tone, onContinue, onStartOver, onClose, zIndexClassName }: ResumeDialogProps) {
  const continueRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open onClose={onClose} zIndexClassName={zIndexClassName}>
      <Dialog.Backdrop />
      <Dialog.Content
        size="sm"
        initialFocusRef={continueRef}
        className="rounded-feature !border-0 !shadow-none px-6 pb-6 pt-8 text-center sm:px-8"
      >
        <Dialog.Close label="Close" size="sm" className="absolute right-3 top-3" />
        <div data-tone={tone}>
          <PlayfulNavIcon name={icon} className="mx-auto mb-4 h-16 w-16" />
          <Dialog.Title as="h2" className="whitespace-normal text-2xl font-black leading-tight">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mb-0 mt-2 text-base">
            {detail}
          </Dialog.Description>
          {progress !== undefined && (
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-brand-primary-track">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.min(100, Math.max(progress, 4))}%` }} />
          </div>
          )}
          <div className="mt-7 flex flex-col gap-3">
            <ActionButton ref={continueRef} size="lg" fullWidth onClick={onContinue}>
              {continueLabel}
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="lg"
              fullWidth
              className="!text-ui-ink"
              onClick={onStartOver}
            >
              {startOverLabel}
            </ActionButton>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
