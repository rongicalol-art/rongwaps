import { useState } from 'react';
import { ActionButton } from '../../../lib/widgets';
import { SessionComplete } from '../../../features/practice';
import { FlashcardAnswerBar } from '../../flashcard';

const WORDS = [{hanzi:'你好',meaning:'hello'}, {hanzi:'老師',meaning:'teacher'}, {hanzi:'謝謝',meaning:'thank you'}];

/** Local fixture only: never reads or writes learner progress. */
export function DailyReviewPreview() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [practice, setPractice] = useState(false);
  const tricky = WORDS.filter((_, i) => answers[i] <= 3);
  const words = practice ? tricky : WORDS;
  const word = words[index];
  const rate = (quality: number) => {
    if (!practice) setAnswers(previous => [...previous, quality]);
    setFlipped(false); setIndex(i => i + 1);
  };
  if (!word) return (
    <div className="relative min-h-160">
      <SessionComplete headline={practice ? 'Practice complete' : 'Today’s review complete'} words={WORDS.map(w => w.hanzi)} pct={Math.round(answers.filter(q => q >= 3).length / 3 * 100)} pctLabel="First try" seconds={80}
        onContinue={() => { setIndex(0); setAnswers([]); setPractice(false); }}
        onReviewMissed={!practice && tricky.length ? () => { setIndex(0); setPractice(true); } : undefined}
        reviewLabel="Practice tricky words" missedCount={tricky.length} />
    </div>
  );
  return (
    <section className="flex flex-col gap-5" data-tone="review">
      <h2 className="text-xl font-black text-ui-ink-strong">{practice ? 'Tricky words · practice only' : 'Daily review · safe preview'}</h2>
      <p className="text-sm font-bold text-ui-ink">Fake words only. No progress is recorded.</p>
      <div className="flex min-h-64 flex-col items-center justify-center gap-5 rounded-feature border-2 border-ui-divider bg-ui-surface">
        <span className="font-chinese text-6xl text-ui-ink-strong">{word.hanzi}</span>
        {flipped && <span className="text-xl font-bold text-ui-ink">{word.meaning}</span>}
      </div>
      <FlashcardAnswerBar isFlipped={flipped} onFlip={() => setFlipped(true)} onHard={() => rate(1)} onUnsure={() => rate(3)} onGotIt={() => rate(4)} />
      <ActionButton variant="secondary" onClick={() => { setIndex(0); setAnswers([]); setPractice(false); }}>Restart preview</ActionButton>
    </section>
  );
}
