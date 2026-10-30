import { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { FeedbackBottomBar, PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { cn } from '../../../utils/cn';
import { SAMPLE_WORDS, type SampleWord } from '../sampleWords';
import { distractors, pick, playCharacter, playWord, shuffle } from './demoUtils';

type Question =
  | { kind: 'meaning'; word: SampleWord; options: SampleWord[] }
  | { kind: 'hanzi'; word: SampleWord; options: SampleWord[] }
  | { kind: 'build'; word: SampleWord; tiles: string[] }
  | { kind: 'trueFalse'; word: SampleWord; shown: SampleWord };

const TWO_CHAR = SAMPLE_WORDS.filter(([hanzi]) => Array.from(hanzi).length === 2);
const ALL_CHARS = [...new Set(SAMPLE_WORDS.flatMap(([hanzi]) => Array.from(hanzi)))];

function makeQuestion(): Question {
  const kind = pick(['meaning', 'hanzi', 'build', 'trueFalse'] as const);
  if (kind === 'build') {
    const word = pick(TWO_CHAR);
    const chars = Array.from(word[0]);
    const extra = shuffle(ALL_CHARS.filter((char) => !chars.includes(char))).slice(0, 2);
    return { kind, word, tiles: shuffle([...chars, ...extra]) };
  }
  const word = pick(SAMPLE_WORDS);
  if (kind === 'trueFalse') return { kind, word, shown: Math.random() < 0.5 ? word : distractors(word, 1)[0] };
  return { kind, word, options: shuffle([word, ...distractors(word, 3)]) };
}

const PROMPT: Record<Question['kind'], string> = { meaning: 'What does it mean?', hanzi: 'Which word is it?', build: 'Build the word', trueFalse: 'True or false?' };

/** Endless mixed quiz from the Lesson 1–2 words: meaning, word from meaning, build the word, true or false. */
export function QuizDemo({ onResult }: { onResult?: (correct: boolean) => void }) {
  const [question, setQuestion] = useState(makeQuestion);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [buildReady, setBuildReady] = useState(false);
  const buildCheckRef = useRef<(() => void) | null>(null);
  const { word } = question;

  const answer = (index: number) => {
    if (result !== null || question.kind === 'build') return;
    setPicked([index]);
    const correct =
      question.kind === 'meaning' || question.kind === 'hanzi'
        ? question.options[index] === word
        : (index === 1) === (question.shown === word);
    setResult(correct);
    playWord(word);
    onResult?.(correct);
  };

  const handleBuildResult = (correct: boolean) => {
    setResult(correct);
    playWord(word);
    onResult?.(correct);
  };

  const advance = () => {
    setQuestion(makeQuestion());
    setRound((n) => n + 1);
    setPicked([]);
    setResult(null);
    setBuildReady(false);
    buildCheckRef.current = null;
  };

  const status = result === null ? 'idle' : result ? 'correct' : 'wrong';

  return (
    <div className="flex w-full flex-col items-center gap-4 pb-24 sm:pb-28">
      <p className="ui-eyebrow text-ui-muted-strong">{PROMPT[question.kind]}</p>
      {(question.kind === 'meaning' || question.kind === 'trueFalse') && <p className="font-chinese text-6xl font-semibold text-ui-ink-strong">{word[0]}</p>}
      {(question.kind === 'build' || question.kind === 'hanzi') && <p className="text-2xl font-black text-ui-ink-strong">{word[2]}</p>}
      {question.kind === 'trueFalse' && <p className="text-2xl font-black text-ui-ink-strong">{question.shown[2]}</p>}

      {(question.kind === 'meaning' || question.kind === 'hanzi') && (
        <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => (
            <PracticeChoiceButton key={option[0]} index={i} state={getPracticeChoiceState(picked[0] === i, result !== null, option === word)} onClick={() => answer(i)}>
              {question.kind === 'hanzi' ? <span className="font-chinese text-2xl font-semibold">{option[0]}</span> : option[2]}
            </PracticeChoiceButton>
          ))}
        </div>
      )}

      {question.kind === 'trueFalse' && (
        <div className="grid w-full max-w-xs grid-cols-2 gap-2">
          {['No', 'Yes'].map((label, i) => (
            <PracticeChoiceButton key={label} compact state={getPracticeChoiceState(picked[0] === i, result !== null, (i === 1) === (question.shown === word))} onClick={() => answer(i)}>
              {label}
            </PracticeChoiceButton>
          ))}
        </div>
      )}

      {question.kind === 'build' && (
        <BuildBoard
          key={round}
          word={word}
          tiles={question.tiles}
          result={result}
          onCheck={handleBuildResult}
          onReadyChange={setBuildReady}
          checkRef={buildCheckRef}
        />
      )}

      <FeedbackBottomBar
        status={status}
        layout="stacked"
        word={{ hanzi: word[0], pinyin: word[1], meaning: word[2] }}
        correctAnswer={word[0]}
        pinyin={word[1]}
        showCheck={question.kind === 'build' && result === null}
        isCheckDisabled={!buildReady || result !== null}
        onCheck={() => buildCheckRef.current?.()}
        onContinue={advance}
      />
    </div>
  );
}

const TILE_MOVE = { type: 'spring', stiffness: 620, damping: 36, mass: 0.7 } as const;

/** The app's build-the-word: tap tiles to fill the slots, tap a filled slot to send it back, then Check. */
function BuildBoard({
  word,
  tiles,
  result,
  onCheck,
  onReadyChange,
  checkRef,
}: {
  word: SampleWord;
  tiles: string[];
  result: boolean | null;
  onCheck: (correct: boolean) => void;
  onReadyChange: (ready: boolean) => void;
  checkRef: React.MutableRefObject<(() => void) | null>;
}) {
  const reduceMotion = useReducedMotion();
  const answer = Array.from(word[0]);
  const [slots, setSlots] = useState<(number | null)[]>(() => answer.map(() => null));
  const nextEmpty = slots.indexOf(null);
  const done = result !== null;
  const move = reduceMotion ? { duration: 0 } : TILE_MOVE;

  const ready = nextEmpty < 0;
  useEffect(() => {
    onReadyChange(ready && !done);
  }, [ready, done, onReadyChange]);

  useEffect(() => {
    checkRef.current = ready && !done
      ? () => onCheck(slots.map((tile) => tiles[tile as number]).join('') === word[0])
      : null;
    return () => {
      checkRef.current = null;
    };
  }, [checkRef, done, onCheck, ready, slots, tiles, word]);

  const place = (tile: number) => {
    if (done || nextEmpty < 0 || slots.includes(tile)) return;
    playCharacter(tiles[tile], word);
    setSlots(slots.map((slot, i) => (i === nextEmpty ? tile : slot)));
  };
  const clear = (index: number) => {
    if (done) return;
    const tile = slots[index];
    if (tile !== null) playCharacter(tiles[tile], word);
    setSlots(slots.map((t, i) => (i === index ? null : t)));
  };

  return (
    <LayoutGroup id="landing-build">
      <div className="flex justify-center gap-3" aria-label="Your word">
        {slots.map((tile, i) => {
          const filled = tile !== null;
          return (
            <div key={i} className={cn('h-19 w-17 rounded-control', !filled && 'border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface', !filled && i === nextEmpty && !done && 'border-brand-primary')}>
              {filled && (
                <motion.div layoutId={`landing-build-${tile}`} transition={move} className="h-full w-full">
                  <button
                    type="button"
                    onClick={() => clear(i)}
                    disabled={done}
                    aria-label={`Remove ${tiles[tile]}`}
                    className={cn(
                      'flex h-full w-full items-center justify-center rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface font-chinese text-4xl font-bold text-ui-ink-strong focus-ring',
                      done && (tiles[tile] === answer[i] ? 'border-feedback-success bg-feedback-success-surface' : 'border-feedback-danger bg-feedback-danger-surface'),
                    )}
                  >
                    {tiles[tile]}
                  </button>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Placed tiles leave the tray; the rest slide together to close the gap. */}
      <div className="flex min-h-21 flex-wrap justify-center gap-3">
        {tiles.map((char, i) => (slots.includes(i) ? null : (
          <motion.div key={i} layout layoutId={`landing-build-${i}`} transition={move}>
            <PracticeChoiceButton compact disabled={done} onClick={() => place(i)} aria-label={`Use ${char}`} className="w-17">
              <span className="font-chinese text-3xl font-bold">{char}</span>
            </PracticeChoiceButton>
          </motion.div>
        )))}
      </div>
    </LayoutGroup>
  );
}
