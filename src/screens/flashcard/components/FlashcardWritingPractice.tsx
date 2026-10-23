import { useLayoutEffect, useRef, useState } from 'react';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { HanziCanvas } from '../../writing';
import { isHanziChar } from '../../../utils/characters/hanzi';
import { cn } from '../../../utils/cn';

/** Inline practice only. Character completion never records a card review. */
export function FlashcardWritingPractice({ word }: { word: string }) {
  const chars = Array.from(word).filter(isHanziChar);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [replay, setReplay] = useState(0);
  const [size, setSize] = useState(228);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const surface = rootRef.current?.closest('[data-fc-surface]');
    if (!surface) return;
    const resize = () => setSize(Math.max(144, Math.min(228, surface.clientWidth - 64, surface.clientHeight - (chars.length > 1 ? 240 : 200))));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [chars.length]);

  const char = chars[index];
  if (!char) return null;
  return (
    <div ref={rootRef} data-flashcard-writing role="group" aria-label={`Write ${word}`} className="flex w-full flex-col items-center" onPointerDown={(event) => event.stopPropagation()}>
      <div data-fc-writing-canvas>
        <HanziCanvas key={`${index}-${attempt}`} char={char} appearance="inline" size={size} status={completed ? 'completed' : 'quizzing'} showOutline animateSignal={replay} onComplete={() => setCompleted(true)} />
      </div>
      <div className="mb-3 mt-2 flex items-center justify-center gap-2" role="group" aria-label="Writing tools">
        <IconActionButton label="Show stroke order" size="sm" icon={<AppIcon name="play" size={18} />} className="text-ui-muted" onClick={() => setReplay(value => value + 1)} />
        <IconActionButton label="Clear and try again" size="sm" icon={<AppIcon name="restart" size={20} />} className="text-ui-muted" onClick={() => { setCompleted(false); setReplay(0); setAttempt(value => value + 1); }} />
      </div>
      {chars.length > 1 && <div className="mb-3 flex max-w-full flex-wrap justify-center gap-2" role="group" aria-label="Characters in this word">
        {chars.map((character, characterIndex) => <button
          key={characterIndex}
          type="button"
          aria-label={`Write character ${characterIndex + 1}: ${character}`}
          aria-pressed={index === characterIndex}
          className={cn('flex h-9 w-9 items-center justify-center rounded-sm border font-chinese text-xl focus-ring', index === characterIndex ? 'border-brand-primary-soft-edge bg-brand-primary-soft text-brand-primary' : 'border-transparent text-ui-muted-strong hover:bg-ui-hover')}
          onClick={() => { setIndex(characterIndex); setCompleted(false); setReplay(0); setAttempt(value => value + 1); }}
        >{character}</button>)}
      </div>}
      <span className="sr-only" role="status">{completed ? `${char} complete` : ''}</span>
    </div>
  );
}
