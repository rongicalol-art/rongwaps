import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { LottiePlayer } from '../../../lib/widgets';
import type { Flashcard } from '../../../data/flashcards';
import { cn } from '../../../utils/cn';
import type { QuizHandoff } from '../../quiz';
import { CARD_SURFACE_CLASS, EASE_OUT, TILE_BORDER, TILE_RADIUS, TILE_RATIO, fitFont, questionWordPx } from '../flashcardMotion';

// Module-level so the player keeps one stable loader identity.
const loadTrophy = () => import('../../../assets/animations/review-trophy.json').then((m) => m.default);
const TROPHY_LAST_FRAME = 70;

/** The tuck: one easing for the whole glide of the first missed tile into the real card. */
const TUCK_EASE = 'cubic-bezier(.22,1,.36,1)';
const TUCK_MS = 780;
const MAX_TILES = 6;
const MAX_MISSED_TILES = 3;
interface ReviewDealIntroProps {
  /** The review deck; the first card is the first review card. */
  cards: Flashcard[];
  /** The deck of the pass that just ended: its known cards fill the sheet around the missed ones. */
  passCards: Flashcard[];
  /** 1 = first review pass, 2+ = repeat passes. */
  pass: number;
  /** 'card' (default): the first missed tile morphs into the real flashcard. 'ghost' (quiz): it becomes a fixed clone handed to the quiz via `onHandoff`. */
  landing?: 'card' | 'ghost';
  /** The flashcard stage (card area + answer bar); the card box and answer bar are measured and revealed from it. Not used by 'ghost'. */
  stageRef?: RefObject<HTMLElement | null>;
  /** The missed tiles are highlighted: the app turns honey now. */
  onHighlight: () => void;
  /** The first card has landed on the real one: reveal the real deck (the overlay stays until it has painted). */
  onLanded?: () => void;
  /** 'ghost' only: the first missed tile is now a clone in document.body (undefined with reduced motion); the quiz lands it on its first question. */
  onHandoff?: (handoff?: QuizHandoff) => void;
  /** The real deck has painted underneath: the overlay can go. */
  onDone: () => void;
  /** The deal begins: the header switches from the finished deck to the review progress. */
  onDealStart: () => void;
}

interface Tile { card: Flashcard; miss: boolean }

/** Up to three missed cards, mixed with known ones (known, miss, known, miss, ...) up to six tiles. */
function buildTiles(cards: Flashcard[], passCards: Flashcard[]): Tile[] {
  const missIds = new Set(cards.map((c) => c.id));
  const miss = cards.slice(0, MAX_MISSED_TILES).map((card) => ({ card, miss: true }));
  const known = passCards.filter((c) => !missIds.has(c.id)).slice(0, MAX_TILES - miss.length).map((card) => ({ card, miss: false }));
  const out: Tile[] = [];
  for (let i = 0; i < Math.max(miss.length, known.length); i += 1) {
    if (known[i]) out.push(known[i]);
    if (miss[i]) out.push(miss[i]);
  }
  return out;
}

const wordsLabel = (n: number) => (n === 1 ? 'One word' : `${n} words`);

/**
 * Between the first pass and the review: a trophy checkpoint, a small sheet of cards with the missed ones
 * lifted (the app turns honey), then the sheet is tucked away: the first missed tile glides into the real card.
 */
export function ReviewDealIntro({ cards, passCards, pass, landing = 'card', stageRef, onHighlight, onLanded, onHandoff, onDone, onDealStart }: ReviewDealIntroProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [size] = useState(() => {
    const wide = window.innerWidth >= 1024;
    return { cols: wide ? 6 : 3, tw: wide ? 140 : 96, gap: wide ? 18 : 12, font: wide ? 44 : 30, trophy: window.innerHeight < 720 ? 150 : wide && window.innerHeight >= 800 ? 250 : 210 };
  });
  const n = cards.length;
  const tiles = useMemo(() => buildTiles(cards, passCards), [cards, passCards]);

  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const trophyWrapRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<LottieRefCurrentProps>(null);
  const dealRef = useRef<() => void>(() => {});
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;
  const onHandoffRef = useRef(onHandoff);
  onHandoffRef.current = onHandoff;
  const onDealStartRef = useRef(onDealStart);
  onDealStartRef.current = onDealStart;
  const onHighlightRef = useRef(onHighlight);
  onHighlightRef.current = onHighlight;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    const trophyWrap = trophyWrapRef.current;
    const hint = hintRef.current;
    // The header progress fill doubles as the intro's timer (a story bar).
    const storyFill = stageRef?.current?.querySelector<HTMLElement>('[data-practice-progress-fill]') ?? document.querySelector<HTMLElement>('[data-practice-progress-fill]');
    const storyHighlight = storyFill?.parentElement?.querySelector<HTMLElement>('[data-practice-progress-highlight]');
    const slot = slotRef.current;
    const layer = layerRef.current;
    const ghostMode = landing === 'ghost';
    const stage = stageRef?.current ?? null;
    const firstId = cards[0].id;
    const getBox = () => Array.from(stage?.querySelectorAll<HTMLElement>('[data-fc-card]') ?? []).find((el) => el.dataset.fcCard === firstId) ?? null;
    // While the previous card is still exiting, its ghost stands in for the (identical) layout box.
    const box0 = ghostMode ? null : getBox() ?? stage?.querySelector<HTMLElement>('[data-fc-card]') ?? null;
    const container = box0?.offsetParent as HTMLElement | null;
    if (!root || !text || !trophyWrap || !slot || !layer || (!ghostMode && (!stage || !box0 || !container))) {
      onDoneRef.current();
      return undefined;
    }

    const timers: number[] = [];
    const anims: Animation[] = [];
    const clones: HTMLElement[] = [];
    // Animations on the real screen (answer bar) that must outlive the overlay; only a real abort cancels them.
    const keep: Animation[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    const A = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim = el.animate(keyframes, { fill: 'both', ...options });
      anims.push(anim);
      return anim;
    };

    const rootRect = root.getBoundingClientRect();
    const containerRect = container?.getBoundingClientRect() ?? rootRect;
    // The card is looked up each time: while the previous card is still exiting, the first match is its ghost.
    const wordLeaves = (box: HTMLElement) => Array.from(box.querySelectorAll<HTMLElement>('[data-fc-word] *')).filter(
      (el) => el.childElementCount === 0 && /[\u3400-\u9fff]/.test(el.textContent ?? ''),
    );
    /** Real card box and real front word, in overlay coordinates, fractional. */
    const measureReal = () => {
      const box = (getBox() ?? box0)!;
      const r = box.getBoundingClientRect();
      const identity = getComputedStyle(box).transform;
      const settled = identity === 'none' || identity === 'matrix(1, 0, 0, 1, 0, 0)';
      // Mid-entrance (scaled) cards fall back to the untransformed layout box.
      const left = settled ? r.left : containerRect.left + box.offsetLeft;
      const top = settled ? r.top : containerRect.top + box.offsetTop;
      const width = settled ? r.width : box.offsetWidth;
      const height = settled ? r.height : box.offsetHeight;
      // Skipped mid-entrance the card is still scaled: measure the word in the card's own (unscaled) space.
      const scale = settled || box.offsetWidth === 0 ? 1 : r.width / box.offsetWidth;
      let l = Infinity; let t = Infinity; let rt = -Infinity; let bm = -Infinity; let font = 0;
      wordLeaves(box).forEach((el) => {
        const q = el.getBoundingClientRect();
        l = Math.min(l, q.left); t = Math.min(t, q.top); rt = Math.max(rt, q.right); bm = Math.max(bm, q.bottom);
        font ||= q.height / scale;
      });
      const hasWord = Number.isFinite(l) && font > 0;
      return {
        left: left - rootRect.left, top: top - rootRect.top, width, height,
        wordCx: hasWord ? ((l + rt) / 2 - r.left) / scale : width / 2,
        wordCy: hasWord ? ((t + bm) / 2 - r.top) / scale : height / 2,
        wordW: hasWord ? (rt - l) / scale : 0,
        font: hasWord ? font : 0,
      };
    };
    const cardW = box0?.offsetWidth ?? 0;
    const surface = box0?.querySelector<HTMLElement>('[data-fc-surface]');
    const cs = surface ? getComputedStyle(surface) : null;
    const endBorder = cs ? `${cs.borderTopWidth} ${cs.borderRightWidth} ${cs.borderBottomWidth} ${cs.borderLeftWidth}` : '2px 2px 6px 2px';
    const endRadius = cs?.borderTopLeftRadius ?? '28px';

    // ---- sheet geometry: one row on wide screens (width is plentiful, height isn't), 3 columns on phones;
    // tiles shrink to fit the space above the skip line, so the sheet never overlaps it ----
    const { gap } = size;
    const count = tiles.length;
    const cols = Math.min(size.cols, count);
    const rows = Math.ceil(count / cols);
    const fitH = (slot.parentElement?.clientHeight ?? Infinity) - text.offsetHeight - 48;
    const fitW = slot.clientWidth - 32;
    const tw = Math.max(48, Math.min(
      size.tw,
      (fitW - (cols - 1) * gap) / cols,
      (fitH - (rows - 1) * gap) / rows / TILE_RATIO,
    ));
    // Tiles are always portrait cards (the phone card's ratio), even where the real card is wide.
    const th = tw * TILE_RATIO;
    slot.style.height = `${rows * th + (rows - 1) * gap}px`;
    const slotRect = slot.getBoundingClientRect();
    const slotLeft = slotRect.left + slotRect.width / 2 - rootRect.left;
    const slotTop = slotRect.top - rootRect.top;
    const tileEls = Array.from(layer.children) as HTMLElement[];
    tileEls.forEach((el, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, count - row * cols);
      const rowW = inRow * tw + (inRow - 1) * gap;
      const word = el.querySelector<HTMLElement>('[data-clone-word]');
      if (word) word.style.fontSize = `${fitFont(tiles[i].card.front, tw, (size.font * tw) / size.tw)}px`;
      Object.assign(el.style, {
        left: `${slotLeft - rowW / 2 + (i % cols) * (tw + gap)}px`,
        top: `${slotTop + row * (th + gap)}px`,
        width: `${tw}px`,
        height: `${th}px`,
      });
    });
    const knownEls = tileEls.filter((_, i) => !tiles[i].miss);
    const missEls = tileEls.filter((_, i) => tiles[i].miss);
    // The first review card's tile is the one that becomes the real card.
    const morphIdx = tiles.findIndex((t) => t.miss && t.card.id === firstId);
    const morphEl = tileEls[morphIdx] ?? missEls[0];
    const morphWord = morphEl?.querySelector<HTMLElement>('[data-clone-word]') ?? null;
    const morphFont = fitFont(cards[0].front, tw, (size.font * tw) / size.tw);
    const [title, subtitle] = Array.from(text.querySelectorAll('h2, p'));
    // The real question word's effective size (the real card scales its answer word to this).
    const realFont = () => questionWordPx(Array.from(cards[0].front).length, cardW);
    const cardArea = stage?.querySelector<HTMLElement>('[data-fc-cardarea]');
    const answerBar = stage?.querySelector<HTMLElement>('.rw-answer-bar');
    let dealt = false;
    let finished = false;
    let highlighted = false;
    const highlight = () => {
      if (highlighted) return;
      highlighted = true;
      onHighlightRef.current();
    };
    // Handoff: reveal the real card under the clone, let it paint (two frames, with a timer in case frames
    // never come), and only then remove the overlay: no hard cut, no pixel jump.
    const finish = () => {
      if (finished) return;
      finished = true;
      onLandedRef.current?.();
      let gone = false;
      const done = () => { if (!gone) { gone = true; onDoneRef.current(); } };
      requestAnimationFrame(() => requestAnimationFrame(done));
      window.setTimeout(done, 120);
    };

    if (reduceMotion) {
      // Static sheet: missed tiles already lifted, known ones dimmed.
      [title, subtitle].forEach((el) => { (el as HTMLElement).style.opacity = '1'; });
      tileEls.forEach((el, i) => {
        el.style.opacity = tiles[i].miss ? '1' : '0.32';
        if (tiles[i].miss) el.style.transform = 'translateY(-6px)';
      });
      trophyRef.current?.goToAndStop(TROPHY_LAST_FRAME, true);
      if (hint) hint.style.opacity = '1';
      highlight();
      const go = () => {
        if (dealt) return;
        dealt = true;
        onDealStartRef.current();
        root.style.opacity = '0';
        if (cardArea) cardArea.style.opacity = '1';
        if (answerBar) answerBar.style.opacity = '1';
        if (ghostMode) onHandoffRef.current?.(undefined);
        finish();
      };
      dealRef.current = go;
      at(1200, go);
    } else {
      // ---- intro: title rises, the sheet is set down tile by tile, then the missed tiles are highlighted ----
      const rise = [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];
      A(title, rise, { duration: 600, delay: 300, easing: EASE_OUT });
      tileEls.forEach((el, i) => {
        A(el, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 520 + i * 60, easing: EASE_OUT });
      });
      const HIGHLIGHT_AT = 520 + count * 60 + 480 + 300;
      const TUCK_AT = HIGHLIGHT_AT + 1400;
      // Story bar: the header bar fills like a story until the intro moves on by itself; a quiet line says a tap
      // (or Space) starts now. On the deal the bar is released and springs to the review's own progress.
      if (storyFill) {
        const frames = [{ transform: `translateX(${-storyFill.offsetWidth}px)` }, { transform: 'translateX(0px)' }];
        A(storyFill, frames, { duration: TUCK_AT - 520, delay: 520, easing: 'linear' });
        if (storyHighlight) A(storyHighlight, frames, { duration: TUCK_AT - 520, delay: 520, easing: 'linear' });
      }
      if (hint) {
        A(hint, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 520, easing: 'ease-out' });
        at(920, () => A(hint, [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 2200, iterations: Infinity, easing: 'ease-in-out' }));
      }
      at(HIGHLIGHT_AT, () => {
        highlight();
        knownEls.forEach((el) => A(el, [{ opacity: 1 }, { opacity: 0.32 }], { duration: 480, easing: 'ease-out' }));
        missEls.forEach((el) => {
          A(el, [{ transform: 'none' }, { transform: 'translateY(-6px)' }], { duration: 560, delay: 100, easing: EASE_OUT });
        });
        A(subtitle, rise, { duration: 600, delay: 160, easing: EASE_OUT });
      });

      // ---- Tuck: the text and the other tiles leave, the first missed tile morphs into the real card ----
      const deal = () => {
        if (dealt) return;
        dealt = true;
        highlight();
        onDealStartRef.current();
        timers.forEach((id) => window.clearTimeout(id));
        timers.length = 0;
        // Continue from wherever each element is (a skip can land mid-rise), then replace the intro animations.
        const cur = (el: Element) => { const c = getComputedStyle(el); return { opacity: c.opacity, transform: c.transform, boxShadow: c.boxShadow }; };
        const snap = new Map<Element, ReturnType<typeof cur>>();
        [trophyWrap, title, subtitle, ...tileEls, ...(hint ? [hint] : [])].forEach((el) => snap.set(el, cur(el)));
        // The ghost starts exactly where the lifted tile stands.
        const liftedRect = morphEl?.getBoundingClientRect();
        const tileRects = new Map(tileEls.map((el) => [el, el.getBoundingClientRect()]));
        anims.forEach((a) => a.cancel());
        anims.length = 0;
        const base = (el: Element) => { const t = snap.get(el)!.transform; return t === 'none' ? '' : `${t} `; };

        [trophyWrap, title, subtitle].forEach((el, i) => {
          A(el, [{ transform: base(el) }, { transform: base(el) + (ghostMode ? 'translateY(-12px)' : 'translateY(-28px) scale(.96)') }],
            { duration: ghostMode ? 240 : 500, delay: ghostMode ? 0 : i * 35, easing: TUCK_EASE });
          // Opacity has its own clock: the fast movement easing must not erase the text at the start.
          A(el, [{ opacity: snap.get(el)!.opacity }, { opacity: snap.get(el)!.opacity, offset: 0.25 }, { opacity: 0 }],
            { duration: ghostMode ? 240 : 500, delay: ghostMode ? 0 : i * 35, easing: 'linear' });
        });
        if (hint) A(hint, [{ opacity: snap.get(hint)!.opacity }, { opacity: 0 }], { duration: 200, easing: 'ease-out' });
        tileEls.forEach((el) => {
          if (el === morphEl) return;
          const known = knownEls.includes(el);
          // The sheet gathers toward the leading tile, which stays above it.
          // Hold the starting opacity briefly so the movement can be read.
          const rect = tileRects.get(el)!;
          const travel = ghostMode ? 0.12 : 0.28;
          const dx = liftedRect ? (liftedRect.left - rect.left) * travel : 0;
          const dy = liftedRect ? (liftedRect.top - rect.top) * travel : -16;
          A(
            el,
            [
              { transform: base(el) },
              { transform: `${base(el)}translate(${dx}px,${dy}px) scale(${ghostMode ? 0.96 : known ? 0.88 : 0.92})` },
            ],
            { duration: ghostMode ? 280 : 480, easing: TUCK_EASE },
          );
          A(el, [{ opacity: snap.get(el)!.opacity }, { opacity: snap.get(el)!.opacity, offset: 0.25 }, { opacity: 0 }],
            { duration: ghostMode ? 220 : 480, easing: 'linear' });
        });

        if (ghostMode) {
          // Quiz: the first missed tile becomes a fixed clone (as in Cards done) that the quiz glides onto its prompt.
          root.style.pointerEvents = 'none';
          if (morphEl && liftedRect) {
            const rect = liftedRect;
            const ghost = morphEl.cloneNode(true) as HTMLElement;
            Object.assign(ghost.style, {
              position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
              margin: '0', opacity: '1', transform: 'none', boxShadow: 'none', pointerEvents: 'none', zIndex: '9999', willChange: 'auto',
            });
            ghost.setAttribute('aria-hidden', 'true');
            ghost.querySelector('[data-tile-pinyin]')?.remove();
            document.body.appendChild(ghost);
            A(morphEl, [{ opacity: 0 }, { opacity: 0 }], { duration: 1 });
            onHandoffRef.current?.({ ghost, rect, front: cards[0].front });
          } else {
            onHandoffRef.current?.(undefined);
          }
          at(320, finish);
          return;
        }

        const real = measureReal();
        // Lay out the landing once. The paper and the word travel independently:
        // only transforms change per frame, so Chinese glyphs keep their proportions.
        const endFont = real.font > 0 ? real.font : realFont();
        const chars = Array.from(cards[0].front).length;
        const gapEm = endFont > 0 && chars > 1 ? Math.max(0, (real.wordW - chars * endFont) / (chars - 1) / endFont) : 0;
        if (morphEl && liftedRect) {
          const fromLeft = liftedRect.left - rootRect.left;
          const fromTop = liftedRect.top - rootRect.top;
          const word = morphWord?.cloneNode(true) as HTMLElement | undefined;
          if (word) {
            clones.push(word);
            const wordX = real.left + real.wordCx;
            const wordY = real.top + real.wordCy;
            Object.assign(word.style, {
              position: 'absolute', left: `${wordX}px`, top: `${wordY}px`,
              width: 'max-content', fontSize: `${endFont}px`, columnGap: `${gapEm}em`,
              zIndex: '21', transformOrigin: 'center',
            });
            layer.appendChild(word);
            morphWord!.style.visibility = 'hidden';
            A(word, [
              { transform: `translate(-50%,-50%) translate(${fromLeft + liftedRect.width / 2 - wordX}px,${fromTop + liftedRect.height / 2 - wordY}px) scale(${morphFont / endFont})` },
              { transform: 'translate(-50%,-50%)' },
            ], { duration: TUCK_MS, easing: TUCK_EASE });
          }
          Object.assign(morphEl.style, {
            left: `${real.left}px`, top: `${real.top}px`, width: `${real.width}px`, height: `${real.height}px`,
            borderRadius: endRadius, borderWidth: endBorder, boxShadow: 'none', zIndex: '20', transformOrigin: 'top left',
          });
          A(morphEl, [
            { transform: `translate(${fromLeft - real.left}px,${fromTop - real.top}px) scale(${liftedRect.width / real.width},${liftedRect.height / real.height})`, opacity: snap.get(morphEl)!.opacity },
            { transform: 'none', opacity: 1 },
          ], { duration: TUCK_MS, easing: TUCK_EASE });
        }
        if (answerBar) {
          const raise = A(answerBar, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 520, easing: EASE_OUT });
          anims.splice(anims.indexOf(raise), 1);
          keep.push(raise);
          raise.onfinish = () => { if (finished) raise.cancel(); };
        }
        at(TUCK_MS, finish);
      };
      dealRef.current = deal;
      at(TUCK_AT, deal);
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      anims.forEach((a) => a.cancel());
      clones.forEach((clone) => clone.remove());
      // A finished intro lets the answer bar finish rising on its own; an aborted one drops it.
      if (!finished) keep.forEach((a) => a.cancel());
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
      event.stopImmediatePropagation();
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
      className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center outline-none"
    >
      {/* Centred in the space above the skip line, so the sheet never crowds it. */}
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
        <div ref={textRef} className="flex flex-col items-center">
          <div ref={trophyWrapRef} className="-mb-3">
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
          <h2 className="text-[28px] font-black text-ui-ink-strong" style={{ opacity: 0 }}>{title}</h2>
          <p className="mt-1.5 text-base font-bold text-ui-muted-strong" style={{ opacity: 0 }}>{subtitle}</p>
        </div>
        <div ref={slotRef} aria-hidden className="mt-6 w-full" />
      </div>
      <div aria-hidden className="w-full shrink-0 pb-sheet-safe pt-4"><div className="h-14" /></div>
      {/* Where the answer bar will rise: a quiet line that says the intro can be skipped. */}
      <div ref={hintRef} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 pb-sheet-safe pt-4" style={{ opacity: 0 }}>
        <p className="flex h-14 items-center justify-center text-sm font-extrabold text-ui-muted">
          <span className="hidden pointer-fine:inline">Press Space to start</span>
          <span className="pointer-fine:hidden">Tap anywhere to start</span>
        </p>
      </div>
      <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0">
        {tiles.map(({ card }) => (
          <div
            key={card.id}
            className={cn(CARD_SURFACE_CLASS, 'absolute flex items-center justify-center')}
            style={{ opacity: 0, borderWidth: TILE_BORDER, borderRadius: TILE_RADIUS }}
          >
            <span
              className="font-chinese flex leading-none text-ui-ink"
              data-clone-word
              style={{ fontSize: `${fitFont(card.front, size.tw, size.font)}px` }}
            >
              {Array.from(card.front).map((ch, c) => <span key={c}>{ch}</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
