import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionButton, AppIcon, IconActionButton, ScreenHeader, WorkspaceWindow } from '../../../lib/widgets';
import { HanziCanvas } from '../../writing';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { isHanziChar } from '../../../utils/characters/hanzi';

/** A quick, local writing detour; completing a character never records a review. */
export function FlashcardWritingPractice({ word, onClose }: { word: string; onClose: () => void }) {
  const chars = Array.from(word).filter(isHanziChar);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const windowRef = useRef<HTMLDivElement>(null);
  const modalFocus = useModalFocus({ containerRef: windowRef, isActive: true, onEscape: onClose });
  const previewHost = import.meta.env.DEV ? document.querySelector('[data-ui-preview-host]') : null;
  const char = chars[index];
  if (!char) return null;
  return createPortal(
    <WorkspaceWindow className={previewHost ? 'workspace-window' : undefined} style={previewHost ? { paddingLeft: 0 } : undefined} ref={windowRef} tabIndex={-1} layer="window-detail" tone="practice" role="dialog" aria-modal="true" aria-label={`Write ${word}`} onKeyDown={(event) => {
      event.stopPropagation();
      modalFocus.onKeyDown(event);
    }}>
      <ScreenHeader
        title={`Write ${word}`}
        variant="window"
        tone="practice"
        leftContent={<IconActionButton icon={<AppIcon name="close" size={22} />} label="Close writing practice" onClick={onClose} />}
      />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pb-8">
        {chars.length > 1 && <div className="flex flex-wrap justify-center gap-2">
          {chars.map((character, characterIndex) => <button
            key={characterIndex}
            type="button"
            aria-label={`Write character ${characterIndex + 1}: ${character}`}
            aria-pressed={index === characterIndex}
            className={`h-10 w-10 rounded-control border-2 font-chinese text-xl focus-ring ${index === characterIndex ? 'border-brand-primary bg-brand-primary-soft text-brand-primary' : 'border-ui-divider text-ui-muted-strong'}`}
            onClick={() => { setIndex(characterIndex); setCompleted(false); setAttempt(value => value + 1); }}
          >{character}</button>)}
        </div>}
        <HanziCanvas key={`${index}-${attempt}`} char={char} status={completed ? 'completed' : 'quizzing'} size={280} showOutline onComplete={() => setCompleted(true)} />
        <ActionButton variant="secondary" onClick={() => {
          if (completed && index < chars.length - 1) setIndex(value => value + 1);
          else setAttempt(value => value + 1);
          setCompleted(false);
        }}>{completed && index < chars.length - 1 ? 'Next character' : 'Try again'}</ActionButton>
      </div>
    </WorkspaceWindow>,
    previewHost || document.body,
  );
}
