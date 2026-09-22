import { cn } from '../../../utils/cn';
import { RongWapsCharacterPortrait } from '../../../lib/widgets';
import type { RongWapsCharacter } from '../../../types/models';

/**
 * Speaker avatar rendered beside a dialogue bubble (left for the opener,
 * right for the responder). Uses the RongWaps character portrait when the
 * speaker has an authored character, otherwise the speaker's coloured
 * initial disc. Purely presentational — the caller owns side/alignment and
 * passes the top offset that lines the disc up with the bubble's top edge.
 */
export function ReaderSpeakerAvatar({
  speaker,
  character,
  initial,
  dotColor,
  className,
}: {
  speaker: string;
  character: RongWapsCharacter | null;
  initial: string;
  dotColor: string;
  className?: string;
}) {
  return (
    <div className={cn('shrink-0 select-none', className)}>
      {character ? (
        <div
          className="h-11 w-11 sm:h-12 sm:w-12 overflow-hidden rounded-full"
          title={speaker}
        >
          <RongWapsCharacterPortrait
            character={character}
            label={speaker}
            className="h-full w-full"
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full font-chinese font-black text-sm text-white',
            dotColor,
          )}
          aria-hidden="true"
          title={speaker}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
