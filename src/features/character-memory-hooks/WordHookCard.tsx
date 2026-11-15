import { Fragment } from 'react';
import type { WordHook } from '../../types/hookPieces';
import { cn } from '../../utils/cn';
import { HanText } from './HanText';
import { HookCard, HookNotes } from './HookCard';

const LABEL: Record<WordHook['kind'], string> = { sum: 'Adds up', whole: 'Learn it whole', sound: 'Borrowed sound' };

/** The explanation alone: the parts added up, the foreign word copied, or a teacher's plain line. */
export function WordHookText({ hook, className }: { hook: WordHook; className?: string }) {
  const line = cn('font-bold leading-relaxed text-ui-ink-strong', className);
  if (hook.kind === 'whole') return <p className={line}><HanText text={hook.teach ?? ''} /></p>;
  if (hook.kind === 'sound') {
    return <p className={line}>The characters copy the sound of <strong className="font-black">{hook.parts[0].meaning}</strong>. Their meanings do not matter here.</p>;
  }
  return (
    <>
      <p className={line}>
        {hook.parts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && <span className="text-ui-muted-strong"> + </span>}
            <span className="whitespace-nowrap">
              <span className="font-chinese font-normal">{part.text}</span>{' '}
              <span className={part.role === 'label' ? 'font-extrabold text-ui-muted-strong' : 'font-black text-feedback-warning-ink'}>
                {part.role === 'label' ? `(${part.meaning})` : part.meaning}
              </span>
            </span>
          </Fragment>
        ))}
        <span className="text-ui-muted-strong"> = </span>
        <strong className="font-black">{hook.gloss}</strong>
      </p>
      {hook.lit && <p className="mt-1 text-sm font-bold leading-snug text-ui-ink">Read literally: “{hook.lit}”.</p>}
    </>
  );
}

/** Memory hook for a word: its characters added up, or a plain explanation when they do not add up. */
export function WordHookCard({ hook, compact = false, className }: { hook: WordHook; compact?: boolean; className?: string }) {
  return (
    <HookCard label={LABEL[hook.kind]} className={className}>
      <WordHookText hook={hook} className={compact ? 'text-[15px]' : 'text-base sm:text-[17px]'} />
      <HookNotes lines={hook.note ? [hook.note] : []} />
    </HookCard>
  );
}
