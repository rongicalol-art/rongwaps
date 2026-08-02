import type { GrammarExerciseCue } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ExerciseContextStripProps {
  cues: GrammarExerciseCue[];
}

export function ExerciseContextStrip({ cues }: ExerciseContextStripProps) {
  const useMobileRail = cues.length > 3;

  return (
    <div
      className={cn(
        'grid gap-2 sm:grid-cols-3',
        useMobileRail
          && 'grid-flow-col auto-cols-[minmax(230px,78vw)] snap-x snap-mandatory overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible sm:pb-0',
      )}
      aria-label="Book exercise cues"
    >
      {cues.map((cue, index) => (
        <article
          key={cue.id}
          className={cn(
            'rounded-[16px] border border-feedback-warning/35 bg-[#FFF9E8] px-4 py-3',
            useMobileRail && 'snap-start',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#A66A00]">Book cue {index + 1}</p>
          <p className="mt-1 font-chinese text-lg font-black text-ui-ink-strong">{cue.label}</p>
          {cue.pinyin && <p className="text-xs font-bold text-brand-primary">{cue.pinyin}</p>}
          <p className="mt-1 text-xs font-bold leading-snug text-ui-muted-strong">{cue.detail}</p>
        </article>
      ))}
    </div>
  );
}
