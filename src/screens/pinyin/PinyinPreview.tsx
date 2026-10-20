import { useState } from 'react';
import type { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar } from '../../features/practice';
import { ScreenLayout } from '../../lib/widgets';
import { isPinyinAnswerAccepted } from '../../utils/pinyin/pinyinAnswer';
import { numberToToneMarks } from '../../utils/pinyin/pinyin';

const WORDS: Flashcard[] = [
  { id: 'pinyin-preview-1', bookId: 1, lessonId: 1, front: '你好', pinyin: 'ni3 hao3', back: 'hello' },
  { id: 'pinyin-preview-2', bookId: 1, lessonId: 1, front: '老師', pinyin: 'lao3 shi1', back: 'teacher' },
  { id: 'pinyin-preview-3', bookId: 1, lessonId: 1, front: '台灣', pinyin: 'tai2 wan1', back: 'Taiwan' },
];

/** Fake-word UI preview; answer attempts stay local and never touch session progress or SRS. */
export function PinyinPreview() {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const card = WORDS[index];
  const activeBook = SAMPLE_BOOKS[0];
  const check = () => {
    if (status !== 'idle' || !input.trim()) return;
    setStatus(isPinyinAnswerAccepted(input, card.pinyin) ? 'correct' : 'wrong');
  };
  const next = () => {
    setIndex((current) => (current + 1) % WORDS.length);
    setInput('');
    setStatus('idle');
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-black text-ui-ink-strong">Pinyin practice</h2>
      <div className="relative h-[640px] w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-practice-canvas">
        <ScreenLayout maxWidth="xl" className="flex h-full flex-col items-center justify-center px-4 pb-[180px]">
          <div className="flex w-full max-w-lg flex-col items-center">
            <h3 className="mb-6 text-xl font-black text-ui-ink-strong">Type the pinyin</h3>
            <div className="flex h-44 w-full items-center justify-center rounded-feature border-2 border-ui-divider border-b-[length:var(--depth-md)] bg-ui-surface text-ui-ink-strong sm:h-56">
              <span className="font-chinese text-6xl font-bold leading-none sm:text-7xl">{card.front}</span>
            </div>
            <form
              onSubmit={(event) => { event.preventDefault(); check(); }}
              className="mt-5 w-full"
            >
              <label htmlFor="pinyin-preview-answer" className="mb-2 block text-sm font-extrabold text-ui-muted-strong">Pinyin</label>
              <input
                id="pinyin-preview-answer"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type the pronunciation"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                disabled={status !== 'idle'}
                className="w-full rounded-control border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-5 py-5 text-[21px] font-extrabold text-ui-ink outline-none placeholder:text-ui-muted focus-ring"
              />
              <p className="mt-2 text-center text-xs font-bold text-ui-muted">Tone marks are optional; tone numbers work too.</p>
            </form>
          </div>
        </ScreenLayout>
        <FeedbackBottomBar
          status={status}
          correctAnswer={numberToToneMarks(card.pinyin ?? '')}
          word={{ hanzi: card.front, pinyin: card.pinyin, meaning: card.back }}
          onContinue={next}
          onCheck={check}
          isCheckDisabled={!input.trim()}
          activeBook={activeBook}
        />
      </div>
    </section>
  );
}
