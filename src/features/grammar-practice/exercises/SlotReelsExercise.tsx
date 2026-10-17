import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ReelOption, SlotReelsItem } from '../../../types/models';
import { checkReels, reelSentence, type ReelChoice } from '../../../utils/grammar/grammarPracticeCheck';
import { InlineBlank } from '../components/InlineBlank';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeScene } from '../components/PracticeScene';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/**
 * "Write your own sentence": each blank has its own choices. The selected blank's
 * choices sit in the dock; pick one and the next empty blank is selected. Tap a
 * chosen word to choose again. Every combination that makes sense is right.
 */
export function SlotReelsExercise({
  item, script, status, contextTokens, onOpenWord, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult,
}: PracticeExerciseProps<SlotReelsItem>) {
  const reels = useMemo(() => item.segments.flatMap((segment) => (segment.type === 'reel' ? [segment] : [])), [item.segments]);
  /** Reel id → chosen option index. */
  const [choice, setChoice] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(reels[0]?.id ?? null);
  const locked = status !== 'idle';
  const ready = reels.every((reel) => choice[reel.id] !== undefined);
  const chosen = (reelId: string): ReelOption | undefined => {
    const reel = reels.find((candidate) => candidate.id === reelId);
    return reel && choice[reelId] !== undefined ? reel.options[choice[reelId]] : undefined;
  };
  const values = (): ReelChoice => Object.fromEntries(reels.map((reel) => [reel.id, chosen(reel.id)?.traditional]));
  const layoutId = (reelId: string, option: number) => `${item.id}-${reelId}-${option}`;

  useEffect(() => onReadyChange(ready && !locked), [locked, onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready && !locked
      ? () => {
        const verdict = checkReels(item, values());
        onResult(verdict.correct
          ? { correct: true, title: 'Your sentence', sentence: reelSentence(item, values()) }
          : { correct: false, title: verdict.title, note: verdict.note });
      }
      : null;
    return () => { checkRef.current = null; };
  });

  const activeReel = locked ? undefined : reels.find((reel) => reel.id === active);
  const options = activeReel ? activeReel.options.map((_, index) => index).filter((index) => choice[activeReel.id] !== index) : [];
  const pick = (option: number) => {
    if (!activeReel) return;
    const next = { ...choice, [activeReel.id]: option };
    setChoice(next);
    setActive(reels.find((reel) => next[reel.id] === undefined)?.id ?? null);
  };
  useNumberKeySelection({ items: options, onSelect: pick, disabled: locked || shortcutsDisabled });
  const english = reels.reduce((text, reel) => text.replace(`{${reel.id}}`, chosen(reel.id)?.english ?? '…'), item.english);

  return (
    <LayoutGroup id={`reels-${item.id}`}>
      <div className="flex flex-col gap-7">
        <PracticePrompt prompt={item.prompt} sub={item.sub} />
        {item.scene && (
          <PracticeScene
            scene={item.scene}
            arrived={status === 'correct'}
            renderChinese={(text) => <ContextualChineseText text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />}
            reelPlace={(reelId) => {
              const option = chosen(reelId);
              return option?.icon ? { icon: option.icon, label: option.label ?? '' } : null;
            }}
          />
        )}
        <div className="flex flex-col items-center gap-2">
          <p className="text-center font-chinese text-3xl leading-[1.7] text-ui-ink-strong sm:text-4xl">
            {item.segments.map((segment, index) => {
              if (segment.type === 'text') {
                return <ContextualChineseText key={index} text={textIn(segment, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />;
              }
              const option = chosen(segment.id);
              const selected = active === segment.id && !locked;
              return (
                <InlineBlank
                  key={segment.id}
                  state={status === 'correct' ? 'correct' : selected ? 'next' : option ? 'filled' : 'empty'}
                  onSelect={locked ? undefined : () => setActive(segment.id)}
                  selectLabel="Choose this word"
                  word={option ? { text: textIn(option, script), layoutId: layoutId(segment.id, choice[segment.id]), onTakeBack: () => setActive(segment.id), disabled: locked } : undefined}
                />
              );
            })}
          </p>
          <p className="text-center text-base font-bold text-ui-muted-strong">{english}</p>
        </div>
      </div>
      {trayHost && activeReel && createPortal(
        options.map((option) => (
          <PracticeTileButton key={option} tile={activeReel.options[option]} script={script} layoutId={layoutId(activeReel.id, option)} disabled={locked} onClick={() => pick(option)} />
        )),
        trayHost,
      )}
    </LayoutGroup>
  );
}
