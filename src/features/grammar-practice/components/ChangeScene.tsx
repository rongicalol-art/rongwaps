import { AppIcon } from '../../../lib/widgets';

interface ChangeSceneProps {
  before: { label: string; value: string };
  now: { label: string; value: string };
}

/** The book's before → now picture (e.g. 25°C → 30°C): what changed is what 了 marks. */
export function ChangeScene({ before, now }: ChangeSceneProps) {
  return (
    <div
      role="img"
      aria-label={`${before.label} ${before.value}, ${now.label} ${now.value}`}
      className="flex items-center justify-center gap-3 rounded-feature border-2 border-ui-divider bg-ui-surface px-4 py-6 sm:gap-5"
    >
      <div className="flex min-w-28 flex-col items-center gap-0.5 rounded-control bg-ui-hover px-5 py-3 sm:min-w-36">
        <span className="ui-eyebrow text-ui-muted">{before.label}</span>
        <span className="text-3xl font-black tabular-nums text-ui-muted-strong sm:text-4xl">{before.value}</span>
      </div>
      <AppIcon name="forward" size={24} className="shrink-0 text-ui-muted" />
      <div className="flex min-w-28 flex-col items-center gap-0.5 rounded-control bg-brand-primary px-5 py-3 sm:min-w-36">
        <span className="ui-eyebrow text-brand-on-primary/80">{now.label}</span>
        <span className="text-3xl font-black tabular-nums text-brand-on-primary sm:text-4xl">{now.value}</span>
      </div>
    </div>
  );
}
