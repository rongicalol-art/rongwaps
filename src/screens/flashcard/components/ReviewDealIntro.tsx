import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { LottiePlayer } from '../../../lib/widgets';
import type { Flashcard } from '../../../data/flashcards';
import { cn } from '../../../utils/cn';
import { CARD_SURFACE_CLASS, REVIEW_CARD_CLASS, questionWordPx } from '../flashcardMotion';

// Module-level so the player keeps one stable loader identity.
const loadTrophy = () => import('../../../assets/animations/review-trophy.json').then((m) => m.default);
const TROPHY_LAST_FRAME = 70;

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const SH_REST = '0 30px 60px -30px rgba(120,85,20,.35)';
const SH_LIFT = '0 70px 120px -40px rgba(120,85,20,.45)';
const SH_CARD = '0 0 0 0 rgba(120,85,20,0)';
/** Mini cards: a fixed portrait size, independent of the real card. Wide screens get the larger set. */
const MINI = {
  narrow: { w: 120, h: 168, font: 40, k: 1, trophy: 150 },
  wide: { w: 172, h: 240, font: 56, k: 172 / 120, trophy: 180 },
};
const CORNER_FAN = [{ x: 0, y: 0, r: 0 }, { x: 9, y: -2, r: 4 }, { x: 18, y: -2, r: 8 }, { x: 27, y: 0, r: 12 }];
const MINI_BORDER = '2px 2px 6px';
const TINTS = ['#ffffff', '#fffaf0', '#fdf3e0', '#faecd0'];
/** Set on <html> while the intro runs so the header counter stays hidden until the card lands. */
const INTRO_ATTR = 'data-review-intro';

interface Pose { x: number; y: number; r: number }

interface ReviewDealIntroProps {
  /** The review deck; the first card is the first review card. */
  cards: Flashcard[];
  /** 1 = first review pass, 2+ = repeat passes. */
  pass: number;
  /** The flashcard stage (card area + answer bar); the card box and answer bar are measured and revealed from it. */
  stageRef: RefObject<HTMLElement | null>;
  /** The first card has landed on the real one: reveal the real deck (the overlay stays until it has painted). */
  onLanded: () => void;
  /** The real deck has painted underneath: the overlay can go. */
  onDone: () => void;
  /** The deal begins: the header switches from the finished deck to the review progress. */
  onDealStart: () => void;
}

const wordsLabel = (n: number) => (n === 1 ? 'One word' : `${n} words`);

/**
 * Between the first pass and the review: a trophy checkpoint, the missed cards set down as a small
 * stack, then the stack is dealt: the top card glides into the real card.
 */
export function ReviewDealIntro({ cards, pass, stageRef, onLanded, onDone, onDealStart }: ReviewDealIntroProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [size] = useState(() => {
    const wide = window.innerWidth >= 1024;
    return { ...(wide ? MINI.wide : MINI.narrow), trophy: wide && window.innerHeight >= 800 ? 180 : window.innerHeight < 720 ? 124 : 150 };
  });
  const n = cards.length;
  const fan = n <= 3;
  const layerCount = fan ? n : CORNER_FAN.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<LottieRefCurrentProps>(null);
  const dealRef = useRef<() => void>(() => {});
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;
  const onDealStartRef = useRef(onDealStart);
  onDealStartRef.current = onDealStart;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    const slot = slotRef.current;
    const layer = layerRef.current;
    const stage = stageRef.current;
    const firstId = cards[0].id;
    const getBox = () => Array.from(stage?.querySelectorAll<HTMLElement>('[data-fc-card]') ?? []).find((el) => el.dataset.fcCard === firstId) ?? null;
    // While the previous card is still exiting, its ghost stands in for the (identical) layout box.
    const box0 = getBox() ?? stage?.querySelector<HTMLElement>('[data-fc-card]') ?? null;
    const container = box0?.offsetParent as HTMLElement | null;
    if (!root || !text || !slot || !layer || !stage || !box0 || !container) {
      onDoneRef.current();
      return undefined;
    }

    const timers: number[] = [];
    const anims: Animation[] = [];
    // Animations on the real screen (answer bar) that must outlive the overlay; only a real abort cancels them.
    const keep: Animation[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    const A = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim = el.animate(keyframes, { fill: 'both', ...options });
      anims.push(anim);
      return anim;
    };

    const rootRect = root.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    // The card is looked up each time: while the previous card is still exiting, the first match is its ghost.
    const wordLeaves = (box: HTMLElement) => Array.from(box.querySelectorAll<HTMLElement>('[data-fc-word] *')).filter(
      (el) => el.childElementCount === 0 && /[\u3400-\u9fff]/.test(el.textContent ?? ''),
    );
    /** Real card box and real front word, in overlay coordinates, fractional. */
    const measureReal = () => {
      const box = getBox() ?? box0;
      const r = box.getBoundingClientRect();
      const identity = getComputedStyle(box).transform;
      const settled = identity === 'none' || identity === 'matrix(1, 0, 0, 1, 0, 0)';
      // Mid-entrance (scaled) cards fall back to the untransformed layout box.
      const left = settled ? r.left : containerRect.left + box.offsetLeft;
      const top = settled ? r.top : containerRect.top + box.offsetTop;
      const width = settled ? r.width : box.offsetWidth;
      const height = settled ? r.height : box.offsetHeight;
      let l = Infinity; let t = Infinity; let rt = -Infinity; let bm = -Infinity; let font = 0;
      wordLeaves(box).forEach((el) => {
        const q = el.getBoundingClientRect();
        l = Math.min(l, q.left); t = Math.min(t, q.top); rt = Math.max(rt, q.right); bm = Math.max(bm, q.bottom);
        font ||= q.height;
      });
      const hasWord = Number.isFinite(l) && font > 0;
      return {
        left: left - rootRect.left, top: top - rootRect.top, width, height,
        wordCx: hasWord ? (l + rt) / 2 - left : width / 2,
        wordCy: hasWord ? (t + bm) / 2 - top : height / 2,
        wordW: hasWord ? rt - l : 0,
        font: hasWord ? font : 0,
      };
    };
    const cardW = box0.offsetWidth;
    const surface = box0.querySelector<HTMLElement>('[data-fc-surface]');
    const cs = surface ? getComputedStyle(surface) : null;
    const endBorder = cs ? `${cs.borderTopWidth} ${cs.borderRightWidth} ${cs.borderBottomWidth} ${cs.borderLeftWidth}` : '2px 2px 6px 2px';
    const endRadius = cs?.borderTopLeftRadius ?? '28px';
    const { w: mw, h: mh, k } = size;
    const miniRadius = `${Math.max(14, parseFloat(endRadius) * (mw / cardW))}px`;

    const slotRect = slot.getBoundingClientRect();
    const slotCx = slotRect.left + slotRect.width / 2 - rootRect.left;
    const slotCy = slotRect.top + slotRect.height / 2 - rootRect.top;
    const poses: Pose[] = fan
      ? Array.from({ length: n }, (_, j) => {
        const mid = (n - 1) / 2;
        const step = (n === 2 ? 128 : 96) * k;
        return { x: (j - mid) * step, y: (j % 2 ? 6 : 0) * k, r: (j - mid) * 5 };
      })
      : CORNER_FAN.map((p) => ({ x: p.x * k, y: p.y * k, r: p.r }));
    const L = poses.length;
    // Every mini card sits centred on the slot; its pose is a transform on top of that.
    const T = (p: Pose, ex = 0, ey = 0, er = 0, sc = 1) =>
      `translate(${p.x + ex}px,${p.y + ey}px) rotate(${p.r + er}deg) scale(${sc})`;

    const clones = Array.from(layer.children) as HTMLElement[];
    clones.forEach((el) => {
      Object.assign(el.style, { left: `${slotCx - mw / 2}px`, top: `${slotCy - mh / 2}px`, width: `${mw}px`, height: `${mh}px` });
    });
    const miniWords = clones.map((el) => el.querySelector<HTMLElement>('[data-clone-word]'));
    // The real question word's effective size (the real card scales its answer word to this).
    const realFont = (j: number) => questionWordPx(Array.from(cards[j].front).length, cardW);
    const topCard = clones[0];
    const others = clones.slice(1);
    const topWord = miniWords[0];
    const counterEl = () => document.querySelector<HTMLElement>('[data-practice-counter]');
    const html = document.documentElement;
    html.setAttribute(INTRO_ATTR, '');
    const revealCounter = () => {
      html.removeAttribute(INTRO_ATTR);
      counterEl()?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
    };

    const cardArea = stage.querySelector<HTMLElement>('[data-fc-cardarea]');
    const answerBar = stage.querySelector<HTMLElement>('.rw-answer-bar');
    let dealt = false;
    let finished = false;
    // Handoff: reveal the real card under the clone, let it paint (two frames, with a timer in case frames
    // never come), and only then remove the overlay: no hard cut, no pixel jump.
    const finish = () => {
      if (finished) return;
      finished = true;
      onLandedRef.current();
      let gone = false;
      const done = () => { if (!gone) { gone = true; onDoneRef.current(); } };
      requestAnimationFrame(() => requestAnimationFrame(done));
      window.setTimeout(done, 120);
    };

    if (reduceMotion) {
      clones.forEach((el, j) => { el.style.transform = T(poses[j]); });
      trophyRef.current?.goToAndStop(TROPHY_LAST_FRAME, true);
      const fade = (el: Element | null | undefined, from: number, to: number) =>
        el && A(el, [{ opacity: from }, { opacity: to }], { duration: 300, easing: 'ease-out' });
      const go = () => {
        if (dealt) return;
        dealt = true;
        fade(root, 1, 0);
        fade(cardArea, 0, 1);
        fade(answerBar, 0, 1);
        revealCounter();
        at(320, finish);
      };
      dealRef.current = go;
      at(1200, go);
    } else {
      // ---- intro: text fades up, cards are set down one by one, top card last ----
      const rise = [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];
      const [title, subtitle] = Array.from(text.querySelectorAll('h2, p'));
      A(title, rise, { duration: 600, delay: 450, easing: EASE_OUT });
      A(subtitle, rise, { duration: 600, delay: 560, easing: EASE_OUT });
      clones.forEach((el, j) => {
        const p = poses[j];
        const order = L - 1 - j;
        A(el, [
          { transform: T(p, -150, 60, p.r > 0 ? -14 : 14, 0.92), opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.25 },
          { transform: T(p), opacity: 1 },
        ], { duration: 950, delay: 700 + order * 120, easing: EASE_OUT });
      });
      const landed = 700 + (L - 1) * 120 + 950;
      // ---- Deal: pile squares up and settles away, top card lifts into place ----
      const GO = Math.max(2700, landed + 500);
      const deal = () => {
        if (dealt) return;
        dealt = true;
        onDealStartRef.current();
        timers.forEach((id) => window.clearTimeout(id));
        timers.length = 0;
        // Restart every clone/text animation from its current pose by replacing it with the deal keyframes.
        const now = [...anims];
        now.forEach((a) => a.cancel());
        anims.length = 0;
        const shown = (el: Element) => { (el as HTMLElement).style.opacity = '1'; };
        clones.forEach(shown);
        [title, subtitle].forEach(shown);
        text.querySelectorAll('h2, p').forEach((el) => { (el as HTMLElement).style.transform = 'none'; });

        A(text, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 420, easing: 'cubic-bezier(.4,0,1,1)' });
        others.forEach((el, i) => {
          const p = poses[i + 1];
          A(el, [
            { transform: T(p), opacity: 1, easing: 'cubic-bezier(.45,0,.55,1)' },
            { offset: 0.42, transform: T({ x: p.x * 0.25, y: p.y * 0.4, r: p.r * 0.2 }), opacity: 1, easing: 'cubic-bezier(.3,0,.2,1)' },
            { transform: T({ x: 0, y: p.y * 0.4 + 26 * k, r: 0 }, 0, 0, 0, 0.94), opacity: 0 },
          ], { duration: 900, delay: i * 40 });
        });
        // A small lift (straightens, grows a touch, shadow deepens), then one long glide in which the card's own
        // box, radius, borders and word size morph into the real card: text is never stretched.
        const p0 = poses[0];
        const real = measureReal();
        const endFont = real.font > 0 ? real.font : realFont(0);
        // Gap between the real glyphs (em), so the clone word is spaced exactly like the real one.
        const chars = Array.from(cards[0].front).length;
        const gapEm = endFont > 0 && chars > 1 ? Math.max(0, (real.wordW - chars * endFont) / (chars - 1) / endFont) : 0;
        const bw = (cs ? [cs.borderLeftWidth, cs.borderRightWidth, cs.borderTopWidth, cs.borderBottomWidth] : ['2px', '2px', '2px', '6px']).map(parseFloat);
        // Where the clone's flex-centred word would end up, vs where the real word really is.
        const natCx = real.width / 2 + (bw[0] - bw[1]) / 2;
        const natCy = real.height / 2 + (bw[2] - bw[3]) / 2;
        const shift = `translate(${real.wordCx - natCx}px,${real.wordCy - natCy}px)`;
        const mini = {
          left: `${slotCx - mw / 2}px`, top: `${slotCy - mh / 2}px`, width: `${mw}px`, height: `${mh}px`,
          borderRadius: miniRadius, borderWidth: MINI_BORDER,
        };
        topCard.style.willChange = 'auto';
        A(topCard, [
          { ...mini, transform: T(p0), boxShadow: SH_REST, easing: 'cubic-bezier(.35,0,.25,1)' },
          { ...mini, offset: 0.2, transform: T({ x: p0.x, y: p0.y - 10 * k, r: 0 }, 0, 0, 0, 1.06), boxShadow: SH_LIFT, easing: 'cubic-bezier(.2,.75,.15,1)' },
          {
            left: `${real.left}px`, top: `${real.top}px`, width: `${real.width}px`, height: `${real.height}px`,
            borderRadius: endRadius, borderWidth: endBorder, transform: 'translate(0px,0px) rotate(0deg) scale(1)', boxShadow: SH_CARD,
          },
        ], { duration: 1050, delay: 140 });
        if (topWord) {
          A(topWord, [
            { fontSize: `${size.font}px`, columnGap: '0em', transform: 'translate(0px,0px)', easing: 'cubic-bezier(.35,0,.25,1)' },
            { fontSize: `${size.font}px`, columnGap: '0em', transform: 'translate(0px,0px)', offset: 0.2, easing: 'cubic-bezier(.2,.75,.15,1)' },
            { fontSize: `${endFont}px`, columnGap: `${gapEm}em`, transform: shift },
          ], { duration: 1050, delay: 140 });
        }
        A(topCard, [{ rotate: '0deg' }, { rotate: '-1.6deg', offset: 0.45 }, { rotate: '0deg' }], { duration: 1050, delay: 140, easing: 'ease-in-out', composite: 'add' });
        if (answerBar) {
          const rise = A(answerBar, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 780, easing: EASE_OUT });
          anims.splice(anims.indexOf(rise), 1);
          keep.push(rise);
          rise.onfinish = () => { if (finished) rise.cancel(); };
        }
        at(640, revealCounter);
        at(140 + 1050, finish);
      };
      dealRef.current = deal;
      at(GO, deal);
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      anims.forEach((a) => a.cancel());
      // A finished intro lets the answer bar finish rising on its own; an aborted one drops it.
      if (!finished) keep.forEach((a) => a.cancel());
      html.removeAttribute(INTRO_ATTR);
      dealRef.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the intro is built once per mount (parent keys it by pass)
  }, []);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      dealRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const title = pass > 1 ? 'Almost there' : 'Deck done';
  const subtitle = pass > 1 ? `${wordsLabel(n)} left` : `${wordsLabel(n)} to go over again`;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label={`${title}. ${subtitle}.`}
      onClick={() => dealRef.current()}
      tabIndex={-1}
      className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center outline-none"
    >
      <div ref={textRef} className="flex flex-col items-center">
        <div className="-mb-1.5">
          <LottiePlayer
            loadAnimationData={loadTrophy}
            loop={false}
            autoplay={!reduceMotion}
            lottieRef={trophyRef}
            onDOMLoaded={() => { if (reduceMotion) trophyRef.current?.goToAndStop(TROPHY_LAST_FRAME, true); }}
            width={size.trophy}
            height={size.trophy}
          />
        </div>
        <h2 className="text-[28px] font-black text-ui-ink-strong">{title}</h2>
        <p className="mt-1.5 text-base font-bold text-ui-muted-strong">{subtitle}</p>
      </div>
      <div ref={slotRef} aria-hidden className="mt-[22px] w-full" style={{ height: size.h + 36 * (size.k > 1 ? 1.4 : 1) }} />
      <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: layerCount }, (_, j) => {
          const top = j === 0;
          const showWord = top || fan;
          return (
            <div
              key={j}
              className={cn(
                CARD_SURFACE_CLASS,
                'absolute flex items-center justify-center will-change-transform',
                top ? REVIEW_CARD_CLASS : 'border-review-line',
              )}
              style={{
                zIndex: layerCount - j,
                opacity: 0,
                boxShadow: SH_REST,
                borderWidth: MINI_BORDER,
                borderRadius: `${Math.max(14, 28 * (size.w / 360))}px`,
                ...(fan ? null : { background: TINTS[j % TINTS.length] }),
              }}
            >
              {showWord && (
                <span
                  className="font-chinese flex leading-none text-ui-ink"
                  data-clone-word
                  style={{ fontSize: `${size.font}px` }}
                >
                  {Array.from(cards[j].front).map((ch, c) => <span key={c}>{ch}</span>)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
