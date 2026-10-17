import { useState } from 'react';
import type { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar } from '../../features/practice';
import { audioService } from '../../services/audioService';
import { cn } from '../../utils/cn';
import { ToneStrip } from './components/ToneStrip';
import { toneTargets } from './utils/toneTargets';

/**
 * DEV-only (debug window → UI Previews): Tone Painter with fake words, one to four characters,
 * including a neutral tone and tone sandhi. Nothing here touches the store, SRS or sync.
 */
const word = (id: string, front: string, pinyin: string, back: string): Flashcard => ({ id: `tone-preview-${id}`, bookId: 1, lessonId: 1, front, pinyin, back });
const WORDS = [
  word('1', '書', 'shū', 'book'),
  word('2', '老師', 'lǎoshī', 'teacher'),
  word('3', '謝謝', 'xièxie', 'thanks'),
  word('4', '你好', 'nǐhǎo', 'hello'),
  word('5', '圖書館', 'túshūguǎn', 'library'),
  word('6', '對不起', 'duìbuqǐ', 'sorry'),
  word('7', '便利商店', 'biànlì shāngdiàn', 'convenience store'),
];

export function TonePreview() {
  const [index, setIndex] = useState(1);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [singKey, setSingKey] = useState(0);
  const card = WORDS[index];
  const targets = toneTargets(card);
  const play = () => { setSingKey((k) => k + 1); void audioService.playCard(card); };
  const pick = (i: number) => { setIndex(i); setStatus('idle'); setRun((n) => n + 1); };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm font-extrabold text-ui-muted-strong">Tone Painter:</span>
        {WORDS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            onClick={() => pick(i)}
            className={cn(
              'rounded-control border-2 px-3 py-1.5 font-chinese text-sm font-extrabold focus-ring',
              i === index ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'border-ui-divider bg-ui-surface text-ui-ink',
            )}
          >
            {w.front}
          </button>
        ))}
      </div>
      <div className="relative h-[640px] w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-practice-canvas">
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-[160px]">
          <h2 className="mb-6 text-xl font-black text-ui-ink-strong md:text-2xl">Draw the tones</h2>
          {targets && (
            <ToneStrip
              key={`${index}-${run}`}
              targets={targets}
              showPinyin
              singKey={singKey}
              onReplay={play}
              onSyllable={() => {}}
              onDone={(attempts) => setStatus(attempts.every((a) => a.ok) ? 'correct' : 'wrong')}
            />
          )}
        </div>
        <FeedbackBottomBar
          status={status}
          word={{ hanzi: card.front, pinyin: card.pinyin, meaning: card.back }}
          onContinue={() => pick((index + 1) % WORDS.length)}
          showCheck={false}
          showContinueOnWrong
          activeBook={SAMPLE_BOOKS[0]}
        />
      </div>
    </div>
  );
}
