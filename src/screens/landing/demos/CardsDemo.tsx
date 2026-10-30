import { useState } from 'react';
import { ActionButton } from '../../../lib/widgets';
import { TonePinyin, TONE_TEXT_CLASS } from '../../../features/flashcards';
import { alignWordSyllables } from '../../../utils/pinyin/pinyinTones';
import { cn } from '../../../utils/cn';
import { SAMPLE_WORDS } from '../sampleWords';
import { playWord, shuffle } from './demoUtils';

const FACE = 'absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-feature border-2 border-ui-border bg-ui-surface p-5 [backface-visibility:hidden]';

/** The lesson deck: tap to flip, grade to deal the next card. Nothing is saved. */
export function CardsDemo() {
  const [deck, setDeck] = useState(() => shuffle(SAMPLE_WORDS));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hanzi, pinyin, meaning] = deck[index];
  const flip = () => { if (!flipped) playWord(deck[index]); setFlipped(!flipped); };

  const syllables = alignWordSyllables(hanzi, pinyin);

  const next = () => {
    setFlipped(false);
    window.setTimeout(() => {
      if (index + 1 < deck.length) setIndex(index + 1);
      else {
        setDeck(shuffle(SAMPLE_WORDS));
        setIndex(0);
      }
    }, 220);
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <button
        type="button"
        onClick={flip}
        aria-label={flipped ? `${hanzi}, ${pinyin}, ${meaning}` : `Flip ${hanzi}`}
        className="focus-ring h-72 w-full max-w-80 rounded-feature [perspective:1200px] lg:h-80 lg:max-w-96"
      >
        <span
          className={cn(
            'relative block h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none',
            flipped && '[transform:rotateY(180deg)]',
          )}
        >
          <span className={FACE}>
            <span className="font-chinese text-6xl font-semibold text-ui-ink-strong lg:text-7xl">{hanzi}</span>
          </span>
          <span className={cn(FACE, '[transform:rotateY(180deg)]')}>
            <span className="text-lg font-black">
              <TonePinyin pinyin={pinyin} colored />
            </span>
            <span className="font-chinese text-6xl font-semibold lg:text-7xl">
              {Array.from(hanzi).map((char, i) => (
                <span key={i} className={syllables?.[i] ? TONE_TEXT_CLASS[syllables[i].tone] : 'text-ui-ink-strong'}>
                  {char}
                </span>
              ))}
            </span>
            <span className="text-xl font-black text-ui-ink-strong">{meaning}</span>
          </span>
        </span>
      </button>
      <div className="w-full max-w-80 lg:max-w-96">
        {flipped ? (
          <div className="grid grid-cols-3 gap-2">
            <ActionButton variant="secondary" size="md" onClick={next} edgeColor="var(--color-feedback-danger)" frontClassName="text-feedback-danger-text">
              Again
            </ActionButton>
            <ActionButton variant="secondary" size="md" onClick={next} edgeColor="var(--color-feedback-warning-edge)" frontClassName="text-feedback-warning-text">
              Hard
            </ActionButton>
            <ActionButton variant="secondary" size="md" onClick={next} edgeColor="var(--color-feedback-success)" frontClassName="text-feedback-success-text">
              Got it
            </ActionButton>
          </div>
        ) : (
          <ActionButton variant="secondary" size="lg" fullWidth onClick={flip} className="!text-ui-muted-strong">
            Flip card
          </ActionButton>
        )}
      </div>
    </div>
  );
}
