import { SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

/**
 * The small play button at the end of a script line: it plays that line (or stops it while it speaks). The words
 * before it are looked up on a tap, so the line plays from here or from the rest of its row.
 */
export function LinePlay({ text, speaking, tinted, onPress }: { text: string; speaking: boolean; tinted: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${speaking ? 'Stop' : 'Play'}: ${text}`}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      className={cn(
        'ml-1.5 -mt-1 inline-grid h-6.5 w-7 place-items-center rounded-xs align-middle transition-colors duration-200 focus-ring',
        speaking ? 'bg-brand-primary text-brand-on-primary' : tinted ? 'bg-ui-surface text-brand-primary-deep' : 'bg-brand-primary-wash text-brand-primary-deep',
      )}
    >
      <SpeakerIcon status={speaking ? 'playing' : null} size={16} />
    </button>
  );
}
