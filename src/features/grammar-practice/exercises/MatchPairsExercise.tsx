import { useEffect, useState } from 'react';
import type { MatchPairsItem, PracticeSentence } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkMatchPair } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton, type PracticeChoiceState } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/** [line, reply] the learner paired. */
type Pair = readonly [number, number];

/**
 * Match the pair: lines on the left, replies on the right. Tap one of each and the pair is
 * checked straight away; a right pair turns green with its number on both cards, a wrong pair
 * says what the line needs and Try again frees it. Some replies fit no line.
 */
export function MatchPairsExercise({
  item, script, status, retryKey, showPinyin, showTranslation, onResult,
}: PracticeExerciseProps<MatchPairsItem>) {
  const [matched, setMatched] = useState<Pair[]>([]);
  const [line, setLine] = useState<number | null>(null);
  const [reply, setReply] = useState<number | null>(null);
  /** The pair just tried and wrong; its cards stay red until Try again. */
  const [missed, setMissed] = useState<Pair | null>(null);
  const locked = status !== 'idle';

  useEffect(() => {
    if (retryKey === 0) return;
    setMissed(null);
    setLine(null);
    setReply(null);
  }, [retryKey]);

  const choose = (nextLine: number | null, nextReply: number | null) => {
    if (nextLine === null || nextReply === null) {
      setLine(nextLine);
      setReply(nextReply);
      return;
    }
    const verdict = checkMatchPair(item, nextLine, nextReply);
    setLine(null);
    setReply(null);
    if (verdict.correct) {
      const next = [...matched, [nextLine, nextReply] as const];
      setMatched(next);
      if (next.length === item.lines.length) onResult({ correct: true, note: item.successNote });
      return;
    }
    setMissed([nextLine, nextReply]);
    onResult({ correct: false, note: verdict.note });
  };

  const stateOf = (side: 0 | 1, index: number): PracticeChoiceState => {
    if (matched.some((pair) => pair[side] === index)) return 'correct';
    if (missed?.[side] === index) return 'wrong';
    return (side === 0 ? line : reply) === index ? 'selected' : 'idle';
  };
  const badge = (side: 0 | 1, index: number) => {
    const pair = matched.find((candidate) => candidate[side] === index);
    return pair ? pair[0] + 1 : null;
  };

  const card = (side: 0 | 1, index: number, sentence: PracticeSentence) => {
    const number = badge(side, index);
    return (
      <PracticeChoiceButton
        key={index}
        compact
        state={stateOf(side, index)}
        disabled={locked || number !== null}
        onClick={() => (side === 0 ? choose(line === index ? null : index, reply) : choose(line, reply === index ? null : index))}
      >
        <span className="flex flex-col items-center gap-0.5 py-0.5">
          <span className="flex items-center gap-2">
            {number !== null && (
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border-2 border-feedback-success text-xs font-black text-feedback-success">{number}</span>
            )}
            <span className="font-chinese text-base leading-snug text-balance sm:text-xl">{textIn(sentence, script)}</span>
          </span>
          {showPinyin && <span className="text-xs font-bold text-ui-muted-strong">{sentence.pinyin}</span>}
          {showTranslation && <span className="text-xs font-bold text-ui-muted-strong">{sentence.english}</span>}
        </span>
      </PracticeChoiceButton>
    );
  };

  return (
    <div className="flex flex-col gap-7">
      <PracticePrompt sub={item.sub} />
      <div className={cn('grid grid-cols-2 items-start gap-x-3 sm:gap-x-6', locked && 'select-none')}>
        <div className="flex flex-col gap-2">{item.lines.map((entry, index) => card(0, index, entry.sentence))}</div>
        <div className="flex flex-col gap-2">{item.replies.map((entry, index) => card(1, index, entry.sentence))}</div>
      </div>
    </div>
  );
}
