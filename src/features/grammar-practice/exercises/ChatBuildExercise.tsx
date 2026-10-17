import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ChatBuildItem, PracticeSentence } from '../../../types/models';
import { chatAnswerLength, checkChatBuild } from '../../../utils/grammar/grammarPracticeCheck';
import { InlineBlank } from '../components/InlineBlank';
import { PracticeBubble } from '../components/PracticeBubble';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const END_PUNCTUATION = /[。？！]$/;

/**
 * The book's "rearrange the sentences" as one chat turn: the friend writes, and
 * your blue reply shows one underline per word. Words fill it from the dock in
 * the order you tap them; tap a placed word to take it back.
 */
export function ChatBuildExercise({
  item, script, status, retryKey, showPinyin, showTranslation, contextTokens, onOpenWord, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult,
}: PracticeExerciseProps<ChatBuildItem>) {
  /** Tile indexes in the reply, in order. */
  const [draft, setDraft] = useState<number[]>([]);
  const [sent, setSent] = useState<PracticeSentence | null>(null);
  const length = chatAnswerLength(item);
  const locked = status !== 'idle';
  const ready = !locked && draft.length > 0;
  const bank = item.tiles.map((_, index) => index).filter((index) => !draft.includes(index));
  const layoutId = (tile: number) => `${item.id}-tile-${tile}`;
  const end = textIn(item.accepted[0].sentence, script).match(END_PUNCTUATION)?.[0] ?? '';

  useEffect(() => onReadyChange(ready), [onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready
      ? () => {
        const verdict = checkChatBuild(item, draft.map((tile) => item.tiles[tile].traditional));
        if (verdict.correct && verdict.answer) {
          setSent(verdict.answer.sentence);
          onResult({ correct: true, sentence: verdict.answer.sentence });
        } else {
          onResult({ correct: false, title: verdict.title, note: verdict.note });
        }
      }
      : null;
    return () => { checkRef.current = null; };
  });

  // Try again: the reply empties back into the dock (order matters, so start it fresh).
  useEffect(() => {
    if (retryKey > 0) setDraft([]);
  }, [retryKey]);

  const add = (tile: number) => { if (!locked && draft.length < length) setDraft((previous) => [...previous, tile]); };
  const remove = (tile: number) => { if (!locked) setDraft((previous) => previous.filter((placed) => placed !== tile)); };
  useNumberKeySelection({ items: bank, onSelect: add, disabled: locked || shortcutsDisabled });

  const notes = (sentence: PracticeSentence) => [showPinyin && sentence.pinyin, showTranslation && sentence.english].filter((note): note is string => Boolean(note));
  const say = (sentence: PracticeSentence) => <ContextualChineseText text={textIn(sentence, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />;

  return (
    <LayoutGroup id={`chat-${item.id}`}>
      <div className="flex flex-col gap-3">
        <PracticePrompt sub={item.sub} />
        {item.before?.map((sentence) => (
          <PracticeBubble key={sentence.traditional} side="them" notes={notes(sentence)}>{say(sentence)}</PracticeBubble>
        ))}
        <span className="h-2" aria-hidden="true" />
        <PracticeBubble side="me">
          {sent ? say(sent) : (
            <>
              {Array.from({ length }, (_, index) => {
                const tile = draft[index];
                const state = tile === undefined
                  ? (index === draft.length && !locked ? 'next' : 'empty')
                  : status === 'wrong' ? 'wrong' : 'filled';
                return (
                  <InlineBlank
                    key={index}
                    tone="onPrimary"
                    state={state}
                    word={tile === undefined ? undefined : { text: textIn(item.tiles[tile], script), layoutId: layoutId(tile), onTakeBack: () => remove(tile), disabled: locked }}
                  />
                );
              })}
              {end}
            </>
          )}
        </PracticeBubble>
        {sent && item.after?.map((sentence) => (
          <PracticeBubble key={sentence.traditional} side="them" notes={notes(sentence)}>{say(sentence)}</PracticeBubble>
        ))}
      </div>
      {trayHost && createPortal(
        bank.map((tile) => (
          <PracticeTileButton key={tile} tile={item.tiles[tile]} script={script} layoutId={layoutId(tile)} disabled={locked} onClick={() => add(tile)} />
        )),
        trayHost,
      )}
    </LayoutGroup>
  );
}
