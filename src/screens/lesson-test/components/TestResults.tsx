import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { BIRD_LAST_FRAME, StatTile, formatTime, loadBird } from '../../../features/practice';
import { LottiePlayer } from '../../../lib/widgets';
import type { LessonTestScore } from '../../../utils/lesson/lessonTestPlan';
import { TestDock } from './TestDock';

const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const RISE = 'cubic-bezier(.16,1,.3,1)';
const AT = { bird: 100, title: 480, tiles: 820, rest: 1150 };

/** What to work on: one row per tested point, earlier lessons named. */
function focusRows(score: LessonTestScore, lessonId: number) {
  const rows = new Map<string, { zh: string; en: string; lesson: number }>();
  for (const { question } of score.missed) {
    if (!rows.has(question.focus.zh)) rows.set(question.focus.zh, { ...question.focus, lesson: question.lesson });
  }
  return [...rows.values()].sort((a, b) => Number(a.lesson !== lessonId) - Number(b.lesson !== lessonId)).slice(0, 4);
}

interface CelebrationProps {
  headline: string[];
  /** Pass/perfect headlines are in the success colour. */
  success: boolean;
  children?: React.ReactNode;
  dock: React.ReactNode;
}

/** The mascot drops in, the headline pops word by word, then the rest rises. A tap skips to the end. */
function Celebration({ headline, success, children, dock }: CelebrationProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const birdRef = useRef<LottieRefCurrentProps>(null);
  const birdWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (reduceMotion) return undefined;
    const birdWrap = birdWrapRef.current;
    const title = titleRef.current;
    const rest = restRef.current;
    if (!birdWrap || !title || !rest) return undefined;
    const anims: Animation[] = [];
    const timers: number[] = [];
    const A = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => { anims.push(el.animate(keyframes, { fill: 'both', ...options })); };
    // Centring uses the CSS `translate` property, so the keyframes animate `transform` only.
    A(birdWrap, [
      { opacity: 0, transform: 'translateY(-50px) scale(.9, 1.1)' },
      { opacity: 1, transform: 'translateY(5px) scale(1.05, .93)', offset: 0.6 },
      { opacity: 1, transform: 'none' },
    ], { delay: AT.bird, duration: 560, easing: 'cubic-bezier(.3,.9,.4,1)' });
    timers.push(window.setTimeout(() => birdRef.current?.goToAndPlay(0, true), AT.bird + 30));
    Array.from(title.children).forEach((word, i) => A(word, [{ opacity: 0, transform: 'translateY(14px) scale(.7)' }, { opacity: 1, transform: 'none' }], { delay: AT.title + i * 110, duration: 520, easing: SPRING }));
    Array.from(rest.children).forEach((block, i) => {
      const isTiles = block instanceof HTMLElement && block.dataset.tiles !== undefined;
      if (isTiles) {
        Array.from(block.children).forEach((tile, k) => A(tile, [
          { opacity: 0, transform: 'translateY(26px) scale(.92)' },
          { opacity: 1, transform: 'translateY(-4px) scale(1.02)', offset: 0.45 },
          { opacity: 1, transform: 'none' },
        ], { delay: AT.tiles + k * 90, duration: 520, easing: RISE }));
      } else {
        A(block, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: AT.rest + i * 80, duration: 420, easing: RISE });
      }
    });
    skipRef.current = () => {
      timers.forEach(window.clearTimeout);
      anims.forEach((anim) => anim.finish());
      birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true);
    };
    return () => {
      timers.forEach(window.clearTimeout);
      anims.forEach((anim) => anim.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the entrance runs once per mount
  }, []);

  return (
    <>
      <div
        onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button')) skipRef.current(); }}
        className="absolute inset-0 flex flex-col items-center overflow-y-auto overscroll-contain px-5 pb-48"
      >
        <div className="my-auto flex w-full max-w-lg shrink-0 flex-col items-center">
          <div className="relative mt-[clamp(12px,2.5dvh,24px)] h-[var(--bb)] w-full shrink-0" style={{ '--bb': 'clamp(170px,23dvh,230px)' } as CSSProperties}>
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[58%] h-[calc(var(--bb)*.9)] w-[calc(var(--bb)*.9)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-feedback-warning)_38%,transparent),transparent_65%)]"
            />
            <div ref={birdWrapRef} className="absolute bottom-2.5 left-1/2 h-[calc(var(--bb)*1.3)] w-[calc(var(--bb)*1.27)] -translate-x-1/2">
              <LottiePlayer
                loadAnimationData={loadBird}
                loop={false}
                autoplay={false}
                lottieRef={birdRef}
                onDOMLoaded={() => { if (reduceMotion) birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true); }}
              />
            </div>
          </div>
          <h1 ref={titleRef} className={`flex flex-wrap justify-center gap-2 text-center text-3xl font-black md:text-4xl ${success ? 'text-feedback-success-text' : 'text-ui-ink-strong'}`}>
            {headline.map((word, index) => <span key={`${word}-${index}`} className="inline-block">{word}</span>)}
          </h1>
          <div ref={restRef} className="mt-6 flex w-full flex-col items-center gap-5">{children}</div>
        </div>
      </div>
      {dock}
    </>
  );
}

interface TestResultsProps {
  lessonId: number;
  score: LessonTestScore;
  seconds: number;
  passed: boolean;
  onFix: () => void;
  onLater: () => void;
}

/** After the test: how it went per part, what to fix, then the Fix round (or later). */
export function TestResults({ lessonId, score, seconds, passed, onFix, onLater }: TestResultsProps) {
  const [rows] = useState(() => focusRows(score, lessonId));
  const misses = score.missed.length;
  const percent = Math.round((score.correct / score.total) * 100);
  const headline = misses === 0 ? ['Perfect', 'test!'] : passed ? ['Lesson', String(lessonId), 'passed!'] : ['Almost', 'there!'];
  return (
    <Celebration
      headline={headline}
      success={passed}
      dock={misses > 0
        ? <TestDock label={`Fix ${misses} mistake${misses === 1 ? '' : 's'}`} onPress={onFix} secondary={{ label: 'Later', onPress: onLater }} />
        : <TestDock label="Continue" onPress={onLater} />}
    >
      <div data-tiles className="grid w-full max-w-90 grid-cols-3 gap-3 md:max-w-110 md:gap-4">
        <StatTile
          label="Listening" icon="audio" shown={score.listening[0]} format={(value) => `${value}/${score.listening[1]}`}
          frameClass="border-brand-primary-edge bg-brand-primary" inkClass="text-brand-primary-text"
        />
        <StatTile
          label="Reading" icon="book" shown={score.reading[0]} format={(value) => `${value}/${score.reading[1]}`}
          frameClass="border-brand-secondary-edge bg-brand-secondary" inkClass="text-brand-secondary-text"
        />
        <StatTile
          label="Time" icon="clock" shown={seconds} format={formatTime}
          frameClass="border-palette-purple-edge bg-palette-purple" inkClass="text-palette-purple-text"
        />
      </div>
      {!passed && <p className="text-center text-base font-bold text-ui-muted-strong">You got {percent}%. You need 80% to pass.</p>}
      {rows.length > 0 && (
        <ul aria-label="To fix" className="flex w-full max-w-md flex-col">
          {rows.map((row) => (
            <li key={row.zh} className="flex items-baseline gap-3 border-b-2 border-ui-divider px-1 py-2.5 last:border-b-0">
              <span className="min-w-28 font-chinese text-xl text-ui-ink-strong">{row.zh}</span>
              <span className="flex-1 text-base font-bold text-ui-muted-strong">{row.en}</span>
              {row.lesson !== lessonId && <span className="whitespace-nowrap text-sm font-extrabold text-ui-muted">Lesson {row.lesson}</span>}
            </li>
          ))}
        </ul>
      )}
    </Celebration>
  );
}

/** After the Fix round. */
export function TestDone({ lessonId, passed, rescheduled, onClose }: { lessonId: number; passed: boolean; rescheduled: boolean; onClose: () => void }) {
  return (
    <Celebration
      headline={passed ? ['Lesson', String(lessonId), 'passed!'] : ['Mistakes', 'fixed!']}
      success={passed}
      dock={<TestDock label="Back to lesson" onPress={onClose} />}
    >
      {rescheduled && <p className="text-center text-base font-bold text-ui-muted-strong">Missed words come back in your next review.</p>}
    </Celebration>
  );
}
