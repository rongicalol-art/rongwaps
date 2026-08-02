import React, { useState } from 'react';
import type { PracticeFlowStatus } from '../../types/models';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { ActionButton } from './ActionButton';
import { IconActionButton } from './IconActionButton';

export interface PracticeControlPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  isShuffled?: boolean;
  flowStatus?: PracticeFlowStatus;
  onToggleShuffle?: () => void;
  onToggleFlow?: () => void;
  onOpenSettings: () => void;
  onRestart?: () => void;
}

export function PracticeControlPanel({
  isShuffled = false,
  flowStatus = 'idle',
  onToggleShuffle,
  onToggleFlow,
  onOpenSettings,
  onRestart,
  className,
  ...props
}: PracticeControlPanelProps) {
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const isFlowActive = flowStatus === 'playing';
  const flowLabel = isFlowActive ? 'Pause' : flowStatus === 'paused' ? 'Resume' : flowStatus === 'finished' ? 'Replay' : 'Flow';

  if (confirmingRestart) {
    return (
      <div className={cn('flex min-h-12 items-center justify-between gap-3', className)} {...props}>
        <p className="min-w-0 font-extrabold text-ui-ink">Restart round?</p>
        <div className="flex shrink-0 gap-2 text-sm">
          <ActionButton variant="quiet" size="sm" onClick={() => setConfirmingRestart(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="danger"
            size="sm"
            onClick={() => {
              onRestart?.();
              setConfirmingRestart(false);
            }}
          >
            Restart
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {(onToggleShuffle || onToggleFlow) && (
        <div className="flex min-w-0 flex-[2] overflow-hidden rounded-[16px] border-2 border-ui-border bg-ui-surface">
          {onToggleShuffle && (
            <ActionButton
              variant="quiet"
              size="md"
              className={cn(
                'h-12 min-w-0 flex-1 rounded-none border-0 px-3',
                onToggleFlow && 'border-r-2 border-r-ui-border',
                isShuffled && 'bg-ui-hover text-ui-ink-strong',
              )}
              onClick={onToggleShuffle}
              aria-pressed={isShuffled}
            >
              <AppIcon name="shuffle" size={22} />
              <span className="truncate">Shuffle</span>
            </ActionButton>
          )}
          {onToggleFlow && (
            <ActionButton
              variant="quiet"
              size="md"
              className="h-12 min-w-0 flex-1 rounded-none border-0 px-3 text-ui-ink-strong"
              onClick={onToggleFlow}
              aria-pressed={isFlowActive}
            >
              <AppIcon name={isFlowActive ? 'pause' : 'flow'} size={22} />
              <span className="truncate">{flowLabel}</span>
            </ActionButton>
          )}
        </div>
      )}
      {onRestart && (
        <IconActionButton
          variant="surface"
          size="lg"
          onClick={() => setConfirmingRestart(true)}
          label="Restart round"
          icon={<AppIcon name="restart" size={22} />}
        />
      )}
      <IconActionButton
        variant="surface"
        size="lg"
        onClick={onOpenSettings}
        label="Practice settings"
        icon={<AppIcon name="settings" size={22} />}
      />
    </div>
  );
}
