import type { HookPiece, PieceJob, TeachHook } from '../../types/hookPieces';
import { pieceJobLabel, strokeInRanges } from '../../utils/characters/hookPieces';
import { cn } from '../../utils/cn';
import { HanText } from './HanText';
import { PiecePainting, paintToneForJob } from './PiecePainting';

const JOB_TONE: Record<PieceJob, string> = {
  meaning: 'text-feedback-warning-ink',
  both: 'text-feedback-warning-ink',
  sound: 'text-brand-primary-text',
  picture: 'text-ui-muted-strong',
  part: 'text-ui-muted-strong',
};

function PieceTile({ char, piece, onOpen }: { char: string; piece: HookPiece; onOpen?: (glyph: string) => void }) {
  const label = pieceJobLabel(piece);
  const opens = piece.real && piece.glyph && onOpen ? piece.glyph : undefined;
  const body = (
    <>
      <PiecePainting
        char={char}
        toneOf={(stroke) => (strokeInRanges(piece.strokes, stroke) ? paintToneForJob(piece.job) : 'rest')}
        className="h-11 w-11 shrink-0 text-[34px]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight text-ui-ink-strong">
          {piece.glyph && <span className="mr-1 font-chinese text-[19px] font-normal">{piece.glyph}</span>}
          {piece.name}
        </span>
        {label && <span className={cn('block text-xs font-extrabold leading-tight', JOB_TONE[piece.job])}><HanText text={label} /></span>}
      </span>
    </>
  );
  const layout = 'flex min-w-0 items-center gap-2.5 rounded-control border-2 px-2.5 py-2 text-left';
  // A real piece has its own page, so its tile is a button; a drawn part is flat and opens nothing.
  return opens ? (
    <button
      type="button"
      onClick={() => onOpen?.(opens)}
      aria-label={`Open ${opens}, ${piece.name}`}
      className={cn(layout, 'border-ui-border bg-ui-surface shadow-[0_var(--depth-md)_0_var(--color-ui-border)] transition-[transform,box-shadow] active:translate-y-[length:var(--depth-md)] active:shadow-none focus-ring')}
    >
      {body}
    </button>
  ) : (
    <div className={cn(layout, 'border-ui-divider')}>{body}</div>
  );
}

/** The character's pieces, each painted from the character's own strokes with its name and job. */
export function TeachPieces({ hook, onOpen }: { hook: TeachHook; onOpen?: (glyph: string) => void }) {
  const [only] = hook.pieces;
  // One drawing gets a line, not a tile: the tile would only repeat the big character above it.
  if (hook.pieces.length === 1 && only.whole) {
    return (
      <p className="text-sm font-bold text-ui-muted-strong">
        {only.job === 'part' ? 'One shape, learned whole.' : 'One drawing. Nothing smaller inside it.'}
      </p>
    );
  }
  return (
    <section aria-label={`Pieces of ${hook.char}`} className="grid grid-cols-2 items-start gap-x-2 gap-y-3">
      {hook.pieces.map((piece, index) => <PieceTile key={index} char={hook.char} piece={piece} onOpen={onOpen} />)}
    </section>
  );
}
