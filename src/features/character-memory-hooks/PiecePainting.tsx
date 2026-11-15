import type { PieceJob } from '../../types/hookPieces';
import { cn } from '../../utils/cn';
import { useCharacterStrokes } from './useCharacterStrokes';

/** One colour per job, everywhere: sound is the pinyin blue, meaning is the hook's amber. */
export type PaintTone = 'meaning' | 'sound' | 'picture' | 'rest';

const TONE_FILL: Record<PaintTone, string> = {
  meaning: 'fill-feedback-warning-ink',
  sound: 'fill-brand-primary',
  picture: 'fill-ui-ink-strong',
  rest: 'fill-ui-border',
};

export function paintToneForJob(job: PieceJob): PaintTone {
  if (job === 'sound') return 'sound';
  return job === 'picture' || job === 'part' ? 'picture' : 'meaning';
}

/**
 * A character drawn from its own strokes, each stroke coloured by `toneOf`.
 * This is how a piece is shown without needing a typed character for it.
 * Falls back to the plain glyph when stroke data is unavailable.
 */
export function PiecePainting({ char, toneOf, className }: {
  char: string;
  toneOf: (stroke: number) => PaintTone;
  className?: string;
}) {
  const { strokes, failed } = useCharacterStrokes(char);
  if (failed) {
    return <span aria-hidden="true" className={cn('flex items-center justify-center font-chinese leading-none text-ui-ink-strong', className)}>{char}</span>;
  }
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true" className={className}>
      <g transform="scale(1 -1) translate(0 -900)">
        {strokes?.map((path, index) => <path key={index} d={path} className={TONE_FILL[toneOf(index)]} />)}
      </g>
    </svg>
  );
}
