import { useState } from 'react';
import { FeedbackBottomBar, PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { getPinyinTone, type PinyinTone } from '../../../utils/pinyin/pinyinTones';
import { SAMPLE_WORDS } from '../sampleWords';
import { pick, playWord } from './demoUtils';

/** One-character lesson words with a marked tone. */
const SINGLES = SAMPLE_WORDS.filter(([hanzi, pinyin]) => Array.from(hanzi).length === 1 && getPinyinTone(pinyin) !== 5);

/** Pitch contour of each tone, drawn left to right. */
const CONTOURS: Record<Exclude<PinyinTone, 5>, string> = { 1: 'M6 10 H50', 2: 'M6 32 L50 8', 3: 'M6 16 Q24 40 50 10', 4: 'M6 6 L50 34' };
const STROKE: Record<Exclude<PinyinTone, 5>, string> = { 1: 'stroke-tone-1', 2: 'stroke-tone-2', 3: 'stroke-tone-3', 4: 'stroke-tone-4' };

/** Pick the tone of a lesson character. */
export function TonesDemo() {
  const [word, setWord] = useState(() => pick(SINGLES));
  const [picked, setPicked] = useState<number | null>(null);
  const tone = getPinyinTone(word[1]);

  const answer = (option: 1 | 2 | 3 | 4) => {
    if (picked !== null) return;
    setPicked(option);
    playWord(word);
  };

  const advance = () => {
    setWord(pick(SINGLES));
    setPicked(null);
  };

  const status = picked === null ? 'idle' : picked === tone ? 'correct' : 'wrong';

  return (
    <div className="flex w-full flex-col items-center gap-4 pb-24 sm:pb-28">
      <p className="ui-eyebrow text-ui-muted-strong">Which tone?</p>
      <p className="font-chinese text-7xl font-semibold text-ui-ink-strong">{word[0]}</p>
      <p className="text-lg font-black text-ui-muted-strong">{word[2]}</p>
      <div className="grid w-full max-w-md grid-cols-4 gap-2">
        {([1, 2, 3, 4] as const).map((option) => (
          <PracticeChoiceButton
            key={option}
            compact
            aria-label={`Tone ${option}`}
            state={getPracticeChoiceState(picked === option, picked !== null, option === tone)}
            onClick={() => answer(option)}
          >
            <span className="flex flex-col items-center gap-1 py-1">
              <svg viewBox="0 0 56 40" className="h-8 w-12" aria-hidden="true">
                <path d={CONTOURS[option]} fill="none" strokeWidth="5" strokeLinecap="round" className={STROKE[option]} />
              </svg>
              <span className="text-base font-black">{option}</span>
            </span>
          </PracticeChoiceButton>
        ))}
      </div>

      <FeedbackBottomBar
        status={status}
        layout="stacked"
        word={{ hanzi: word[0], pinyin: word[1], meaning: word[2] }}
        correctAnswer={picked !== null && picked !== tone ? `Tone ${tone} · ${word[1]}` : undefined}
        onContinue={advance}
      />
    </div>
  );
}
