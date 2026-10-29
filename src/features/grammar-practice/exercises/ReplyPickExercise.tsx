import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ReplyPickItem } from '../../../types/models';
import { checkReplyPick, fillReplyOption, replyFills, replySlotCompletion } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { InlineBlank } from '../components/InlineBlank';
import { PracticeBubble } from '../components/PracticeBubble';
import { PracticePrompt } from '../components/PracticePrompt';
import { SituationCard } from '../components/SituationCard';
import { LEADING_CLOSING, textIn, type PracticeExerciseProps } from '../practiceTypes';

/** The book's write-in blank (" ______ ") without the spaces around it, so a comma after it never wraps alone. */
const tightBlanks = (text: string) => text.replace(/\s*(_{2,})\s*/g, '$1');

/** Select a reply, then check it; the dialogue slot mirrors the current choice. */
export function ReplyPickExercise({ item, script, status, retryKey, contextTokens, onOpenWord, showPinyin, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult }: PracticeExerciseProps<ReplyPickItem>) {
  const [selected, setSelected] = useState<number | null>(null);
  const locked = status !== 'idle';
  const ready = selected !== null && !locked;
  const choose = (index: number) => { if (!locked) setSelected(index); };
  useNumberKeySelection({ items: [...item.options.keys()], onSelect: choose, disabled: locked || shortcutsDisabled });
  useEffect(() => onReadyChange(ready), [onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready ? () => {
      const verdict = checkReplyPick(item, selected);
      onResult({ correct: verdict.correct, note: verdict.note, ...(verdict.correct ? { sentence: item.options[selected].result } : {}) });
    } : null;
    return () => { checkRef.current = null; };
  });
  useEffect(() => { if (retryKey > 0) setSelected(null); }, [retryKey]);
  const option = selected === null ? undefined : item.options[selected];
  // Before Check the blank shows the card as printed; after a right pick, the finished words (write-in blanks and cue cards included).
  const finished = status === 'correct' && option?.result ? replySlotCompletion(item, option.result, script) : undefined;
  const filled = option ? finished ?? tightBlanks(fillReplyOption(textIn(option, script), replyFills(item).map((part) => textIn(part, script)))) : undefined;

  return (
    <>
      <div className="flex flex-col gap-4">
        <PracticePrompt sub={item.sub} />
        {item.situation && <SituationCard situation={item.situation} script={script} showPinyin={showPinyin} contextTokens={contextTokens} onOpenWord={onOpenWord} />}
        {item.lines?.map((line, index) => (
          <PracticeBubble key={index} side={line.me ? 'me' : 'them'}>
            {line.segments.map((segment, at) => {
              // A long reply wraps inside the blank, so the closing mark rides in it rather than wrapping alone.
              const previous = line.segments[at - 1];
              if (segment.type === 'text') {
                const text = textIn(segment, script);
                const shown = previous?.type === 'slot' && filled !== undefined ? text.replace(LEADING_CLOSING, '') : text;
                return shown && <ContextualChineseText wordClassName="font-chinese font-semibold" key={at} text={shown} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />;
              }
              const next = line.segments[at + 1];
              const closing = next?.type === 'text' ? textIn(next, script).match(LEADING_CLOSING)?.[0] ?? '' : '';
              return (
                <InlineBlank key={segment.id} tone={line.me ? 'onPrimary' : 'plain'}
                  state={option ? status === 'idle' ? 'filled' : status : 'next'}
                  word={filled === undefined ? undefined : { text: /[。！？!?]$/.test(filled) ? filled : filled + closing, disabled: locked, onTakeBack: () => setSelected(null) }} />
              );
            })}
          </PracticeBubble>
        ))}
      </div>
      {trayHost && createPortal(item.options.map((choice, index) => (
        <PracticeChoiceButton key={choice.traditional} index={index} disabled={locked} aria-pressed={selected === index}
          state={selected === index ? status === 'idle' ? 'selected' : status : 'idle'} onClick={() => choose(index)} className="w-full">
          <span className="flex flex-col items-start">
            <span className="font-chinese font-semibold text-xl leading-snug">
              {tightBlanks(textIn(choice, script)).split('～').map((part, at) => <span key={at}>{at > 0 && <span className="text-brand-primary-text">～</span>}{part}</span>)}
            </span>
            {showPinyin && choice.pinyin && <span className="text-xs font-extrabold text-ui-muted-strong">{choice.pinyin}</span>}
          </span>
        </PracticeChoiceButton>
      )), trayHost)}
    </>
  );
}
