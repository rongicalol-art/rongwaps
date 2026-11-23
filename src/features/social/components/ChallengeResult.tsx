import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { ActionButton, AppIcon, Avatar, LottiePlayer } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useProfileAvatar } from '../../../hooks/useProfileAvatar';
import { challengeOutcome, challengePercent, type ChallengeLink, type ChallengeScore } from '../../../../shared/challenge';
import { socialColor } from '../../../../shared/quizRace';
import { befriend } from '../challenge';

// The Session complete bird (src/features/practice), so a challenge ends with the same mascot.
const loadBird = () => import('../../../assets/animations/deck-complete-bird.json').then((m) => m.default);
const BIRD_LAST_FRAME = 203;
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

const clock = (ms: number) => {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export interface ChallengeResultProps {
  link: ChallengeLink;
  /** My first pass: right answers, words, and how long it took. */
  me: ChallengeScore;
  onContinue: () => void;
  onTryAgain: () => void;
  onReviewMissed?: () => void;
  missedCount?: number;
}

/**
 * The end of a challenge: the mascot, who won, both runs as two lanes (score, then time), and the sender with
 * Add friend. Lanes fill in after the headline; a tap skips to the end, and reduced motion starts there.
 */
export function ChallengeResult({ link, me, onContinue, onTryAgain, onReviewMissed, missedCount = 0 }: ChallengeResultProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const them: ChallengeScore = { correct: link.correct, total: link.total, ms: link.run[link.run.length - 1] ?? 0 };
  const outcome = challengeOutcome(me, them);
  const myName = useAppStore((state) => state.displayName.trim() || 'You');
  const myColor = socialColor(useAppStore((state) => state.avatarColor));
  const photo = useProfileAvatar();
  const friends = useAppStore((state) => (state.challenge?.code === link.code ? state.challenge.friends : link.friends));
  const [adding, setAdding] = useState<'idle' | 'busy' | 'requested'>('idle');
  const headline = outcome === 'won' ? `You beat ${link.name}’s run!` : outcome === 'lost' ? `${link.name} wins this time` : `A tie with ${link.name}!`;
  const lanes = [
    { key: 'me', label: 'You', name: myName, color: myColor, src: photo, score: me, lead: outcome !== 'lost' },
    { key: 'them', label: link.name, name: link.name, color: link.color, src: undefined, score: them, lead: outcome === 'lost' },
  ];

  const rootRef = useRef<HTMLDivElement>(null);
  const birdRef = useRef<LottieRefCurrentProps>(null);
  const skipRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (reduceMotion || !root) return undefined;
    const anims: Animation[] = [];
    const A = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (el) anims.push(el.animate(keyframes, { fill: 'both', ...options }));
    };
    A(root.querySelector('[data-bird]'), [
      { opacity: 0, transform: 'translateY(-60px) scale(.9, 1.1)' },
      { opacity: 1, transform: 'translateY(6px) scale(1.06, .92)', offset: 0.6 },
      { opacity: 1, transform: 'none' },
    ], { delay: 120, duration: 560, easing: 'cubic-bezier(.3,.9,.4,1)' });
    const birdTimer = window.setTimeout(() => birdRef.current?.goToAndPlay(0, true), 150);
    A(root.querySelector('h1'), [{ opacity: 0, transform: 'translateY(14px) scale(.7)' }, { opacity: 1, transform: 'none' }], { delay: 520, duration: 520, easing: SPRING });
    // Each lane fills to its score, mine first; the face rides the end of its fill.
    root.querySelectorAll('[data-lane-fill]').forEach((fill, i) => A(fill, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: 860 + i * 220, duration: 900, easing: EASE_OUT }));
    root.querySelectorAll('[data-lane-face]').forEach((face, i) => A(face, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { delay: 1500 + i * 220, duration: 420, easing: SPRING }));
    root.querySelectorAll('[data-rise]').forEach((el, i) => A(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 1900 + i * 60, duration: 450, easing: EASE_OUT }));
    skipRef.current = () => {
      window.clearTimeout(birdTimer);
      anims.forEach((anim) => anim.finish());
      birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true);
    };
    return () => {
      window.clearTimeout(birdTimer);
      anims.forEach((anim) => anim.cancel());
    };
  }, [reduceMotion]);

  const add = async () => {
    setAdding('busy');
    const result = await befriend(link);
    setAdding(result === 'requested' ? 'requested' : 'idle');
  };

  // At most two boxed buttons: the main one, then Review missed (or Continue after a loss).
  const primary = outcome === 'lost' ? { label: 'Try again', onClick: onTryAgain } : { label: 'Continue', onClick: onContinue };
  const secondary = onReviewMissed && missedCount > 0 ? { label: `Review missed (${missedCount})`, onClick: onReviewMissed }
    : outcome === 'lost' ? { label: 'Continue', onClick: onContinue } : null;
  const quietContinue = outcome === 'lost' && secondary?.onClick !== onContinue;
  // Enter or Space takes the main action, as on Session complete.
  const primaryRef = useRef(primary.onClick);
  primaryRef.current = primary.onClick;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat || (event.target as HTMLElement | null)?.closest('button')) return;
      event.preventDefault();
      primaryRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      ref={rootRef}
      onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button')) skipRef.current(); }}
      className="absolute inset-0 flex flex-col items-center overflow-y-auto overscroll-contain px-4 pb-sheet-safe md:pb-14"
    >
      <div className="my-auto flex w-full max-w-[360px] shrink-0 flex-col items-center md:max-w-[440px]">
        <div data-bird className="relative mt-[clamp(12px,2.5dvh,24px)] h-[clamp(170px,22dvh,230px)] w-[clamp(170px,22dvh,230px)] shrink-0">
          <LottiePlayer
            loadAnimationData={loadBird}
            loop={false}
            autoplay={false}
            lottieRef={birdRef}
            onDOMLoaded={() => { if (reduceMotion) birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true); }}
          />
        </div>

        <h1 className="text-balance text-center text-[28px] font-black leading-tight text-ui-ink-strong md:text-[34px]">{headline}</h1>

        <div className="mt-7 grid w-full gap-3.5">
          {lanes.map((lane) => (
            <div key={lane.key} className="flex items-center gap-3">
              <span className="w-14 shrink-0 truncate text-sm font-black text-ui-ink-strong">{lane.label}</span>
              <span className="relative h-4 min-w-0 flex-1 rounded-full bg-brand-primary-track">
                <span
                  data-lane-fill
                  className={`absolute inset-y-0 left-0 origin-left rounded-full ${lane.key === 'me' ? 'bg-brand-primary' : 'bg-ui-muted'}`}
                  style={{ width: `${Math.max(4, challengePercent(lane.score))}%` }}
                />
                <span
                  data-lane-face
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `clamp(0px, calc(${Math.max(4, challengePercent(lane.score))}% - 14px), calc(100% - 28px))` }}
                >
                  <Avatar name={lane.name} color={lane.color} src={lane.src} size="sm" className="!h-7 !w-7" />
                </span>
              </span>
              <span className={`w-12 shrink-0 text-right text-base font-black tabular-nums ${lane.lead ? 'text-brand-primary-text' : 'text-ui-muted-strong'}`}>
                {challengePercent(lane.score)}%
              </span>
            </div>
          ))}
          <p data-rise className="text-center text-sm font-extrabold tabular-nums text-ui-muted-strong">{clock(me.ms)} vs {clock(them.ms)}</p>
        </div>

        <div data-rise className="mt-5 flex w-full items-center gap-3 py-1">
          <Avatar name={link.name} color={link.color} size="lg" />
          <span className="min-w-0 flex-1 truncate text-base font-black text-ui-ink-strong">{link.name}</span>
          {friends ? (
            <span className="flex items-center gap-1.5 text-sm font-black text-ui-muted"><AppIcon name="check" size={16} />Friends</span>
          ) : adding === 'requested' ? (
            <span className="text-sm font-black text-ui-muted">Requested</span>
          ) : (
            <ActionButton size="sm" variant="secondary" loading={adding === 'busy'} loadingLabel="Adding" onClick={() => void add()} className="gap-1.5 !text-brand-primary-text">
              <AppIcon name="plus" size={16} />Add friend
            </ActionButton>
          )}
        </div>

        <div data-rise className="mt-6 grid w-full gap-2 md:max-w-[340px]">
          <ActionButton size="lg" fullWidth onClick={primary.onClick}>{primary.label}</ActionButton>
          {secondary && (
            <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" className="!bg-ui-surface !text-ui-muted-strong hover:!bg-ui-hover uppercase tracking-normal" onClick={secondary.onClick}>
              {secondary.label}
            </ActionButton>
          )}
          {quietContinue && <ActionButton variant="quiet" fullWidth onClick={onContinue}>Continue</ActionButton>}
        </div>
      </div>
    </div>
  );
}
