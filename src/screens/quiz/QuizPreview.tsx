import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, SessionComplete } from '../../features/practice';
import { buildMeasureWordChoices, buildWordTiles, createQuizRng, parseMeasureWord } from '../../utils/vocabulary/quizDirector';
import { cn } from '../../utils/cn';
import { MeasureWordFollowUp } from './formats/MeasureWordFollowUp';
import { PairMatch } from './formats/PairMatch';
import { PickOne, type PickChoice, type PickPrompt } from './formats/PickOne';
import { TrueFalseFlip } from './formats/TrueFalseFlip';
import { WordBuild } from './formats/WordBuild';
import { CardsDone } from '../flashcard';

/**
 * DEV-only gallery (debug window, Ctrl+Shift+0): Cards done and the quiz picker, every quiz question type, the feedback bar and Session complete,
 * rendered with fake words. Nothing here touches the store, SRS or sync, so screens can be checked freely.
 */

const word = (id: string, front: string, pinyin: string, back: string, simple?: string): Flashcard => ({ id: `preview-${id}`, bookId: 1, lessonId: 1, front, pinyin, back, simple });
const WORDS = [
  word('1', '老師', 'lǎoshī', 'teacher'),
  word('2', '學生', 'xuéshēng', 'student'),
  word('3', '漂亮', 'piàoliang', 'pretty; beautiful', 'pretty'),
  word('4', '朋友', 'péngyǒu', 'friend'),
  word('5', '書', 'shū', 'book (M: 本běn)'),
  word('6', '中國', 'Zhōngguó', 'China'),
  word('7', '臺灣', 'Táiwān', 'Taiwan'),
  word('8', '大家', 'dàjiā', 'everyone'),
];
const [TEACHER, STUDENT, PRETTY, FRIEND, BOOK, CHINA, TAIWAN, EVERYONE] = WORDS;
const SESSION_WORDS = ['新', '同學', '她', '誰', '叫', '漂亮', '英國', '中國', '臺灣', '什麼', '名字', '姓', '老師', '你好', '我', '你', '他', '是', '很'];

type PreviewKey = 'cards-done' | 'pick-meaning' | 'listen' | 'pick-hanzi' | 'true-false' | 'pair-match' | 'sound-match' | 'word-build' | 'measure' | 'match-miss' | 'end-perfect' | 'end-missed';
const PREVIEWS: Array<{ key: PreviewKey; label: string }> = [
  { key: 'cards-done', label: 'Cards done → pick a quiz' },
  { key: 'pick-meaning', label: 'Pick the meaning' },
  { key: 'listen', label: 'Listen' },
  { key: 'pick-hanzi', label: 'Pick the character' },
  { key: 'true-false', label: 'True or false' },
  { key: 'pair-match', label: 'Pair match' },
  { key: 'sound-match', label: 'Sound match' },
  { key: 'word-build', label: 'Build the word' },
  { key: 'measure', label: 'Measure-word bonus' },
  { key: 'match-miss', label: 'Bar: match missed' },
  { key: 'end-perfect', label: 'End: perfect' },
  { key: 'end-missed', label: 'End: 95%' },
];
const PICK: Partial<Record<PreviewKey, { card: Flashcard; options: Flashcard[]; prompt: PickPrompt; choice: PickChoice }>> = {
  'pick-meaning': { card: PRETTY, options: [FRIEND, PRETTY, TEACHER], prompt: 'hanzi', choice: 'meaning' },
  listen: { card: STUDENT, options: [STUDENT, CHINA, FRIEND], prompt: 'audio', choice: 'meaning' },
  'pick-hanzi': { card: CHINA, options: [TAIWAN, CHINA, BOOK], prompt: 'meaning', choice: 'hanzi' },
};

const PreviewStage: React.FC<{ previewKey: PreviewKey }> = ({ previewKey }) => {
  const book = SAMPLE_BOOKS[0];
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>(previewKey === 'match-miss' ? 'wrong' : 'idle');
  const [buildReady, setBuildReady] = useState(false);
  const buildCheck = useRef<(() => void) | null>(null);
  const answer = (correct: boolean) => setStatus(correct ? 'correct' : 'wrong');
  const noop = () => {};
  const isChecked = status !== 'idle';

  if (previewKey === 'cards-done') return <CardsDonePreview />;

  if (previewKey === 'end-perfect' || previewKey === 'end-missed') {
    return (
      <SessionComplete
        words={SESSION_WORDS}
        pct={previewKey === 'end-perfect' ? 100 : 95}
        pctLabel="Quiz"
        seconds={previewKey === 'end-perfect' ? 108 : 952}
        onContinue={noop}
        onReviewMissed={previewKey === 'end-missed' ? noop : undefined}
        onStudyAllAgain={noop}
      />
    );
  }

  const single = PICK[previewKey];
  const card = single?.card ?? (previewKey === 'true-false' ? FRIEND : previewKey === 'word-build' ? EVERYONE : BOOK);
  let body: React.ReactNode = null;
  if (single) {
    body = (
      <PickOne
        card={single.card} options={single.options} prompt={single.prompt} choice={single.choice}
        isChecked={isChecked} onAnswer={answer} onOpenBreakdown={noop} breakdownOpen={false} activeBook={book} handoff={null}
      />
    );
  } else if (previewKey === 'true-false') {
    body = (
      <TrueFalseFlip
        card={FRIEND} shown={TEACHER} isChecked={isChecked} onAnswer={answer}
        onOpenBreakdown={noop} breakdownOpen={false} activeBook={book} handoff={null}
      />
    );
  } else if (previewKey === 'pair-match' || previewKey === 'sound-match' || previewKey === 'match-miss') {
    const cards = [TEACHER, STUDENT, PRETTY, FRIEND, CHINA];
    let left = cards.length;
    body = (
      <PairMatch
        variant={previewKey === 'sound-match' ? 'sound' : 'hanzi'}
        cards={cards} meanings={[FRIEND, CHINA, TEACHER, PRETTY, STUDENT]} activeBook={book}
        onPair={() => { left -= 1; if (left === 0) setStatus('correct'); }} onMismatch={noop}
      />
    );
  } else if (previewKey === 'word-build') {
    body = (
      <WordBuild
        card={EVERYONE} tiles={buildWordTiles(EVERYONE, WORDS, createQuizRng('preview')) ?? ['大', '家']}
        isChecked={isChecked} breakdownOpen={false} activeBook={book} onAnswer={answer}
        onReadyChange={setBuildReady} checkRef={buildCheck}
      />
    );
  } else if (previewKey === 'measure') {
    const measure = parseMeasureWord(BOOK.back)!;
    body = (
      <MeasureWordFollowUp
        noun={BOOK.front} answer={measure} activeBook={book} onDone={noop}
        choices={buildMeasureWordChoices(measure, WORDS.map((w) => w.back), createQuizRng('preview'))}
      />
    );
  }

  const isMatch = previewKey === 'pair-match' || previewKey === 'sound-match' || previewKey === 'match-miss';
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 pb-[260px] pt-10 md:max-w-[640px] lg:pb-[150px]">
        {body}
      </div>
      <FeedbackBottomBar
        status={status}
        correctAnswer={isMatch ? `${PRETTY.front} ${PRETTY.back}  ·  ${FRIEND.front} ${FRIEND.back}` : ''}
        word={isMatch ? undefined : { hanzi: card.front, pinyin: card.pinyin, meaning: card.back, simple: card.simple }}
        onContinue={() => setStatus('idle')}
        onCheck={previewKey === 'word-build' && !isChecked ? () => buildCheck.current?.() : undefined}
        showCheck={previewKey === 'word-build'}
        isCheckDisabled={previewKey === 'word-build' ? !buildReady : status === 'idle'}
        showContinueOnWrong
        onBreakdown={isMatch ? undefined : noop}
        activeBook={book}
      />
    </div>
  );
};

/** One Cards done run: it reads the stage when it mounts, so it mounts once the stage is in the DOM. */
const CardsDoneRun: React.FC<{ onStart: (types: string[]) => void }> = ({ onStart }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [staged, setStaged] = useState(false);
  useEffect(() => setStaged(true), []);
  return (
    <div ref={stageRef} className="absolute inset-0 pt-[72px]">
      <div className="relative h-full">
        {staged && (
          <CardsDone
            cards={WORDS.slice(0, 6)}
            deck={WORDS}
            wordCount={WORDS.length}
            stageRef={stageRef}
            onTone={() => {}}
            onStart={onStart}
            onReviewAgain={() => {}}
          />
        )}
      </div>
    </div>
  );
};

/** Cards done and the quiz picker, full-window so the phone and desktop layouts are real; Start shows the pick. */
const CardsDonePreview: React.FC = () => {
  const [picked, setPicked] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-ui-practice-canvas">
      <div className="absolute right-4 top-4 z-50 flex gap-2">
        <button type="button" onClick={() => { setPicked(null); setRun((n) => n + 1); }} className="rounded-control border-2 border-ui-border bg-ui-surface px-3 py-1.5 text-sm font-extrabold focus-ring">Replay</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-control border-2 border-ui-border bg-ui-surface px-3 py-1.5 text-sm font-extrabold focus-ring">Close</button>
      </div>
      {picked !== null ? (
        <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-ui-ink-strong">Start: {picked || 'Mixed'}</div>
      ) : (
        <CardsDoneRun key={run} onStart={(types) => setPicked(types.join(', '))} />
      )}
    </div>,
    document.body,
  );
};

/** The gallery: pick a screen, see it at the window's size; Replay remounts it from the start. */
export function QuizPreview() {
  const [previewKey, setPreviewKey] = useState<PreviewKey>('cards-done');
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PREVIEWS.map((preview) => (
          <button
            key={preview.key}
            type="button"
            onClick={() => { setPreviewKey(preview.key); setRun((n) => n + 1); }}
            className={cn(
              'rounded-control border-2 px-3 py-1.5 text-sm font-extrabold focus-ring',
              preview.key === previewKey ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'border-ui-divider bg-ui-surface text-ui-ink',
            )}
          >
            {preview.label}
          </button>
        ))}
        <button type="button" onClick={() => setRun((n) => n + 1)} className="rounded-control border-2 border-ui-border px-3 py-1.5 text-sm font-extrabold text-ui-muted-strong focus-ring">
          Replay
        </button>
      </div>
      <div className="relative h-[760px] w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-practice-canvas">
        <PreviewStage key={`${previewKey}-${run}`} previewKey={previewKey} />
      </div>
    </div>
  );
}
