import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { ActionButton, AppIcon, LottiePlayer, type AppIconName } from '../../../lib/widgets';

// Module-level so the player keeps one stable loader identity.
const loadBird = () => import('../../../assets/animations/deck-complete-bird.json').then((m) => m.default);
const BIRD_LAST_FRAME = 203;
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const RISE = 'cubic-bezier(.16,1,.3,1)';
const MAX_CHIPS = 19;
/**
 * Entrance (~2s): the bird drops in with a glow and a burst, the headline pops word by word, the tiles rise as solid
 * blocks, each number counts once its tile has landed (every poured word presses the Words tile down), each tile
 * squash-pops when its count finishes, one shine passes, Continue rises.
 */
const AT = { bird: 120, burst: 380, title: 520, tiles: 860, pour: 1020, button: 1500 };
const TILE_GAP_MS = 90;
const TILE_MS = 520;
const POUR_GAP_MS = 45;
const POUR_MS = 620;
const BURST_PIECES = 14;
const BURST_COLORS = ['bg-brand-primary', 'bg-feedback-success', 'bg-palette-purple', 'bg-feedback-warning'];

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** What the flashcard round hands to the quiz that follows it, so Session complete reports the whole session. */
export interface SessionStats {
  /** Every distinct word of the round (the chips that pour into the Words tile). */
  words: string[];
  firstTryPct: number;
  /** Forgot and With effort words remain available after the following quiz. */
  trickyCardIds?: string[];
  /** Epoch ms of the first flashcard. */
  startedAt: number;
}

export interface SessionCompleteProps {
  headline?: string;
  reviewLabel?: string;
  words: string[];
  /** The accuracy tile's value: quiz result, or first-try result when no quiz ran. */
  pct: number;
  pctLabel: 'Quiz' | 'First try';
  seconds: number;
  onContinue: () => void;
  /** Practice just the cards missed on the first pass. This replay does not change SRS progress. */
  onReviewMissed?: () => void;
  missedCount?: number;
  /** Start the complete deck again. */
  onStudyAllAgain?: () => void;
}

interface StatTileProps {
  label: string;
  icon: AppIconName;
  shown: number;
  format: (value: number) => string;
  frameClass: string;
  /** Colours the value and its icon in the tile's own edge colour. */
  inkClass: string;
  bodyRef?: Ref<HTMLSpanElement>;
}

/** Solid colored frame, white label, white body with the value (and a shine that sweeps once it lands). */
function StatTile({ label, icon, shown, format, frameClass, inkClass, bodyRef }: StatTileProps) {
  return (
    <div className={`origin-bottom rounded-sm border-b-4 p-0.5 ${frameClass}`}>
      <span className="block py-1 text-center text-[11px] font-black uppercase tracking-[0.09em] text-white">{label}</span>
      <span ref={bodyRef} className={`relative flex h-13 items-center justify-center gap-1.5 overflow-hidden rounded-[10px] bg-ui-surface md:h-14 ${inkClass}`}>
        <AppIcon name={icon} size={20} className="shrink-0" />
        <b className="inline-block text-[22px] font-black tabular-nums md:text-[24px]">{format(shown)}</b>
        <span
          data-shine
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.85)_50%,transparent_70%)]"
        />
      </span>
    </div>
  );
}

/** Shared session end screen with a clear Continue action and optional review/restart choices. */
export function SessionComplete({ headline: customHeadline, reviewLabel = 'Review missed', words, pct, pctLabel, seconds, onContinue, onReviewMissed, missedCount = 0, onStudyAllAgain }: SessionCompleteProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const isPerfect = pct >= 100;
  const total = words.length;
  const chips = words.slice(0, MAX_CHIPS);
  const headline = customHeadline ? [customHeadline] : isPerfect ? ['Perfect', 'session!'] : ['Session', 'complete!'];
  const [wordsShown, setWordsShown] = useState(reduceMotion ? total : 0);
  const [pctShown, setPctShown] = useState(reduceMotion ? pct : 0);
  const [secondsShown, setSecondsShown] = useState(reduceMotion ? seconds : 0);

  const rootRef = useRef<HTMLDivElement>(null);
  const birdRef = useRef<LottieRefCurrentProps>(null);
  const birdWrapRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const wordsBodyRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<() => void>(() => {});
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  useLayoutEffect(() => {
    if (reduceMotion) return undefined;
    const root = rootRef.current;
    const title = titleRef.current;
    const tiles = Array.from(tilesRef.current?.children ?? []) as HTMLElement[];
    const chipEls = Array.from(chipsRef.current?.children ?? []) as HTMLElement[];
    const burstEls = Array.from(burstRef.current?.children ?? []) as HTMLElement[];
    const button = buttonRef.current;
    const birdWrap = birdWrapRef.current;
    const halo = haloRef.current;
    const wordsBody = wordsBodyRef.current;
    if (!root || !title || !button || !birdWrap || !halo || !wordsBody || tiles.length === 0) return undefined;

    setWordsShown(0);
    setPctShown(0);
    setSecondsShown(0);
    const timers: number[] = [];
    const anims: Animation[] = [];
    const frames = new Set<number>();
    let dead = false;
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (!dead) fn(); }, ms)); };
    const A = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim = el.animate(keyframes, { fill: 'both', ...options });
      anims.push(anim);
      return anim;
    };
    const rise = [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];


    // The bird drops in with a little squash, then plays. (Centring uses the CSS `translate` property, so keyframes animate `transform` only.)
    A(birdWrap, [
      { opacity: 0, transform: 'translateY(-60px) scale(.9, 1.1)' },
      { opacity: 1, transform: 'translateY(6px) scale(1.06, .92)', offset: 0.6 },
      { opacity: 1, transform: 'none' },
    ], { delay: AT.bird, duration: 560, easing: 'cubic-bezier(.3,.9,.4,1)' });
    at(AT.bird + 30, () => birdRef.current?.goToAndPlay(0, true));

    // A warm glow and a soft burst behind it.
    A(halo, [
      { opacity: 0, transform: 'scale(.5)' },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.4 },
      { opacity: 0, transform: 'scale(1.4)' },
    ], { delay: AT.burst, duration: 1100, easing: 'ease-out' });
    burstEls.forEach((piece, i) => {
      const angle = (i / burstEls.length) * Math.PI * 2 + (i % 2) * 0.25;
      const reach = 120 + (i % 3) * 22;
      A(piece, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
        { opacity: 1, transform: `translate(${Math.cos(angle) * reach * 0.6}px, ${Math.sin(angle) * reach * 0.6}px) rotate(${angle * 90}deg)`, offset: 0.35 },
        { opacity: 0, transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach + 30}px) scale(.6) rotate(${angle * 180}deg)` },
      ], { delay: AT.burst + 10, duration: 900, easing: 'cubic-bezier(.2,.7,.3,1)' });
    });

    // The headline pops in word by word.
    Array.from(title.children).forEach((word, i) => A(
      word,
      [{ opacity: 0, transform: 'translateY(14px) scale(.7)' }, { opacity: 1, transform: 'none' }],
      { delay: AT.title + i * 110, duration: 520, easing: SPRING },
    ));

    // The tiles rise as solid blocks with a small overshoot (opaque early, so no washed-out mid-frames).
    tiles.forEach((tile, i) => A(
      tile,
      [
        { opacity: 0, transform: 'translateY(28px) scale(.92)' },
        { opacity: 1, transform: 'translateY(-4px) scale(1.02)', offset: 0.45 },
        { opacity: 1, transform: 'none' },
      ],
      { delay: AT.tiles + i * TILE_GAP_MS, duration: TILE_MS, easing: 'cubic-bezier(.2,.8,.2,1)' },
    ));
    const landed = (i: number) => AT.tiles + i * TILE_GAP_MS + TILE_MS;
    /** A tactile press into the tile's own bottom edge, like tapping one of the app's buttons. */
    const press = (tile: Element | undefined) => {
      if (tile) A(tile, [{ transform: 'none' }, { transform: 'translateY(3px)' }, { transform: 'none' }], { duration: 170, easing: 'ease-out', fill: 'none' });
    };
    /** The finishing squash-and-stretch when a count completes. */
    const settle = (tile: Element | undefined) => {
      if (tile) A(tile, [
        { transform: 'none' },
        { transform: 'scale(1.07, .93)', offset: 0.3 },
        { transform: 'scale(.97, 1.04)', offset: 0.65 },
        { transform: 'none' },
      ], { duration: 440, easing: 'ease-out', fill: 'none' });
    };

    // The session's words pour from the top (where the progress bar finished) into the Words tile, counting as they land.
    const rootBox = root.getBoundingClientRect();
    const target = wordsBody.getBoundingClientRect();
    const tx = target.left + target.width / 2 - rootBox.left;
    const ty = target.top + target.height / 2 - rootBox.top + root.scrollTop;
    chipEls.forEach((chip, i) => {
      const sx = rootBox.width * (0.2 + (0.6 * i) / Math.max(1, chipEls.length - 1));
      const sy = 8;
      chip.style.left = `${sx}px`;
      chip.style.top = `${sy}px`;
      const dx = tx - sx;
      const dy = ty - sy;
      const delay = AT.pour + i * POUR_GAP_MS;
      A(chip, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.6)' },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.3 - 40}px)) scale(1)`, offset: 0.35 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35)` },
      ], { delay, duration: POUR_MS, easing: 'cubic-bezier(.45,0,.3,1)' });
      at(delay + POUR_MS - 40, () => {
        setWordsShown(Math.round(((i + 1) * total) / chipEls.length));
        press(tiles[0]);
      });
    });
    const pourEnd = AT.pour + Math.max(0, chipEls.length - 1) * POUR_GAP_MS + POUR_MS;
    if (chipEls.length === 0) at(landed(0), () => { setWordsShown(total); settle(tiles[0]); });
    else at(pourEnd, () => settle(tiles[0]));

    // Accuracy and time count once their tiles have landed, then settle.
    const countUp = (end: number, delay: number, set: (v: number) => void, tile: HTMLElement | undefined) => at(delay, () => {
      const t0 = performance.now();
      let lastPaint = -Infinity;
      const step = (now: number) => {
        if (dead) return;
        const p = Math.min(1, (now - t0) / 700);
        if (now - lastPaint >= 50 || p === 1) {
          lastPaint = now;
          set(Math.round(end * (1 - (1 - p) ** 3)));
        }
        if (p < 1) frames.add(requestAnimationFrame(step));
        else settle(tile);
      };
      frames.add(requestAnimationFrame(step));
    });
    countUp(pct, landed(1), setPctShown, tiles[1]);
    countUp(seconds, landed(2), setSecondsShown, tiles[2]);

    // One shine across the tiles once everything has landed, then Continue.
    const settled = Math.max(AT.button, pourEnd + 120, landed(2) + 700 + 120);
    Array.from(tilesRef.current?.querySelectorAll('[data-shine]') ?? []).forEach((shine, i) => A(
      shine,
      [{ translate: '-120% 0' }, { translate: '120% 0' }],
      { delay: settled + i * 90, duration: 600, easing: 'ease-in-out' },
    ));
    A(button, rise, { delay: settled, duration: 450, easing: RISE });

    // A tap anywhere skips to the finished screen.
    skipRef.current = () => {
      if (dead) return;
      dead = true;
      timers.forEach(window.clearTimeout);
      frames.forEach(cancelAnimationFrame);
      anims.forEach((a) => a.finish());
      setWordsShown(total);
      setPctShown(pct);
      setSecondsShown(seconds);
      birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true);
    };

    return () => {
      dead = true;
      timers.forEach(window.clearTimeout);
      anims.forEach((a) => a.cancel());
      frames.forEach(cancelAnimationFrame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the entrance is built once per mount
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return;
      event.preventDefault();
      continueRef.current();
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
      <div className="my-auto flex w-full shrink-0 flex-col items-center">
      {/* The bird scales with the viewport height so short desktop windows keep Continue in view. */}
      <div
        className="relative mt-[clamp(12px,2.5dvh,24px)] h-[var(--bb)] w-full shrink-0"
        style={{ '--bb': 'clamp(190px,25dvh,260px)' } as CSSProperties}
      >
        <div
          ref={haloRef}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[58%] h-[calc(var(--bb)*.9)] w-[calc(var(--bb)*.9)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-feedback-warning)_40%,transparent),transparent_65%)] opacity-0"
        />
        <div ref={burstRef} aria-hidden className="pointer-events-none absolute left-1/2 top-[55%] h-0 w-0">
          {Array.from({ length: reduceMotion ? 0 : BURST_PIECES }, (_, i) => (
            <span key={i} className={`absolute h-2.5 w-2.5 opacity-0 ${i % 3 === 0 ? 'rounded-full' : 'rounded-[3px]'} ${BURST_COLORS[i % BURST_COLORS.length]}`} />
          ))}
        </div>
        <div ref={birdWrapRef} className="absolute bottom-3.5 left-1/2 h-[calc(var(--bb)*1.3)] w-[calc(var(--bb)*1.27)] -translate-x-1/2">
          <LottiePlayer
            loadAnimationData={loadBird}
            loop={false}
            autoplay={false}
            lottieRef={birdRef}
            onDOMLoaded={() => {
              if (reduceMotion) birdRef.current?.goToAndStop(BIRD_LAST_FRAME, true);
            }}
          />
        </div>
      </div>

      <h1
        ref={titleRef}
        className={`flex flex-wrap justify-center gap-[0.3em] text-center text-[28px] font-black md:text-[34px] ${isPerfect ? 'text-feedback-success-edge' : 'text-ui-ink-strong'}`}
      >
        {headline.map((word) => <span key={word} className="inline-block max-w-full">{word}</span>)}
      </h1>

      <div ref={tilesRef} className="relative z-10 mt-7 grid w-full max-w-[360px] grid-cols-3 gap-3 md:mt-8 md:max-w-[440px] md:gap-4">
        <StatTile
          label="Words" icon="cards" shown={wordsShown} format={String} bodyRef={wordsBodyRef}
          frameClass="border-brand-primary-edge bg-brand-primary" inkClass="text-brand-primary-edge"
        />
        <StatTile
          label={pctLabel} icon="target" shown={pctShown} format={(v) => `${v}%`}
          frameClass="border-feedback-success-edge bg-feedback-success" inkClass="text-feedback-success-edge"
        />
        <StatTile
          label="Time" icon="clock" shown={secondsShown} format={formatTime}
          frameClass="border-palette-purple-edge bg-palette-purple" inkClass="text-palette-purple-edge"
        />
      </div>

      <div aria-hidden className="h-8 shrink-0 md:h-10" />
      <div ref={buttonRef} className="w-full max-w-md md:max-w-[340px]">
        <ActionButton size="lg" fullWidth onClick={onContinue}>
          <span>Continue</span>
        </ActionButton>
        <div className="mt-2 flex w-full flex-col gap-1">
          {onReviewMissed && (
            <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" className="!bg-ui-surface !text-ui-muted-strong hover:!bg-ui-hover uppercase tracking-normal" onClick={onReviewMissed}>
              {reviewLabel} ({missedCount})
            </ActionButton>
          )}
          {onStudyAllAgain && (
            <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" className="!bg-ui-surface !text-ui-muted-strong hover:!bg-ui-hover uppercase tracking-normal" onClick={onStudyAllAgain}>
              Study all again
            </ActionButton>
          )}
        </div>
      </div>
      </div>

      {/* The session's words, poured from the top into the Words tile. */}
      {!reduceMotion && (
        <div ref={chipsRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0">
          {chips.map((word, i) => (
            <span
              key={`${word}-${i}`}
              style={{ opacity: 0 }}
              className="font-chinese absolute whitespace-nowrap rounded-sm border-2 border-b-4 border-ui-divider bg-ui-surface px-2.5 py-1 text-[20px] leading-tight text-ui-ink"
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
