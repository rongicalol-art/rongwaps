import { ActionButton } from '../../../lib/widgets';
import type { AudioPreloadProgress } from '../../../services/audio/audioCache';

interface Props {
  progress: AudioPreloadProgress | null;
  error: boolean;
  onRetry: () => void;
  onBack: () => void;
}

/** Block heights (px): one soft hill, so the row reads as sound. */
const HEIGHTS = [44, 62, 82, 104, 120, 104, 82, 62, 44];

/** Also used by the DEV gallery: loading and recovery without recording study progress. */
export function QuizAudioPreparation({ progress, error, onRetry, onBack }: Props) {
  const ready = progress?.total ? Math.floor(HEIGHTS.length * progress.ready / progress.total) : 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div aria-hidden className="flex h-32 items-end justify-center gap-2.5">
        {HEIGHTS.map((height, i) => (
          <i
            key={i}
            style={{ height, '--i': i } as React.CSSProperties}
            className={`block w-6 origin-bottom rounded-[9px] border-2 border-b-[6px] transition-colors duration-200 sm:w-7 ${i < ready ? 'border-brand-primary-edge bg-brand-primary' : `border-ui-border bg-ui-surface ${error ? '' : 'rw-swell motion-reduce:animate-none'}`}`}
          />
        ))}
      </div>
      <div role={error ? 'alert' : 'status'} aria-live="polite" aria-busy={!error} className="flex w-full max-w-xs flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-black text-ui-ink-strong">{error ? 'Audio couldn’t load' : 'Getting audio ready'}</h2>
        {error && <p className="text-sm text-ui-muted-strong">Check your connection, then try again.</p>}
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {error && <ActionButton fullWidth onClick={onRetry}>Retry</ActionButton>}
        <ActionButton variant="secondary" fullWidth onClick={onBack}>{error ? 'Back' : 'Cancel'}</ActionButton>
      </div>
    </div>
  );
}
