import type { PieceJob, TeachHook } from '../../types/hookPieces';
import { isLeftOutSound, parseHookText } from '../../utils/characters/hookPieces';
import { cn } from '../../utils/cn';
import { HanText } from './HanText';
import { HookCard, HookNotes } from './HookCard';

/** Words that name a piece take the piece's colour: amber for meaning, blue for sound, underlined ink for a drawn part. */
const WORD_TONE: Record<PieceJob, string> = {
  meaning: 'text-feedback-warning-ink',
  both: 'text-feedback-warning-ink',
  sound: 'text-brand-primary-text',
  picture: 'text-ui-ink-strong underline decoration-ui-border decoration-2 underline-offset-[3px]',
  part: 'text-ui-ink-strong underline decoration-ui-border decoration-2 underline-offset-[3px]',
};

/** The hook sentence alone, with its piece words coloured. */
export function TeachHookText({ hook, className }: { hook: TeachHook; className?: string }) {
  return (
    <p className={cn('font-bold leading-relaxed text-ui-ink-strong', className)}>
      {parseHookText(hook.hook).map((run, index) => {
        if (run.strong) return <strong key={index} className="font-black"><HanText text={run.text} /></strong>;
        const job = run.piece === undefined ? undefined : hook.pieces[run.piece]?.job;
        return job
          ? <span key={index} className={cn('font-black', WORD_TONE[job])}><HanText text={run.text} /></span>
          : <HanText key={index} text={run.text} />;
      })}
    </p>
  );
}

/** A sound piece the sentence leaves out says why, in one fixed line, so nobody wonders where it went. */
function LeftOutSounds({ hook }: { hook: TeachHook }) {
  return (
    <>
      {hook.pieces.map((piece, index) => isLeftOutSound(hook, index) && (
        <p key={index} className="mt-2 text-sm font-bold leading-snug text-ui-ink">
          <span className="font-black text-brand-primary-text">
            {piece.glyph ? <HanText text={`${piece.glyph} ${piece.name}`} /> : `The ${piece.name}`}
          </span>{' '}
          {piece.old ? 'was the sound long ago. It no longer helps today.' : 'gives the sound. It is not a word you need to know.'}
        </p>
      ))}
    </>
  );
}

/** Memory hook for one character: one sentence built from its pieces, landing on the meaning. */
export function TeachHookCard({ hook, compact = false, className }: { hook: TeachHook; compact?: boolean; className?: string }) {
  return (
    <HookCard className={className}>
      <TeachHookText hook={hook} className={compact ? 'text-[15px]' : 'text-base sm:text-[17px]'} />
      <LeftOutSounds hook={hook} />
      <HookNotes lines={hook.more ?? []} />
    </HookCard>
  );
}
