import { cn } from '../../../utils/cn';
import { RongWapsCharacterPortrait, type RongWapsCharacter } from '../../../lib/widgets';

/**
 * Speaker avatar rendered beside a dialogue bubble (left for the opener,
 * right for the responder). Uses the RongWaps character portrait when the
 * speaker has an authored character, otherwise the speaker's coloured
 * initial disc. Purely presentational — the caller owns side/alignment.
 */
export function ReaderSpeakerAvatar({
  speaker,
  character,
  initial,
  dotColor,
}: {
  speaker: string;
  character: RongWapsCharacter | null;
  initial: string;
  dotColor: string;
}) {
  return (
    <div className="shrink-0 select-none">
      {character ? (
        <div
          className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full ring-2 ring-ui-border/50 shadow-xs"
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
            'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full font-chinese font-black text-xs text-white shadow-xs',
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
