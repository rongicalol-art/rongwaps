import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import type { Flashcard } from '../../../data/flashcards';
import { ActionButton, LottiePlayer } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { QuizTypeId } from '../../../utils/vocabulary/quizDirector';
import { QuizTypePicker, type QuizPickerEntrance } from './QuizTypePicker';
import { CARD_SURFACE_CLASS, EASE_OUT, TILE_BORDER, TILE_RADIUS, TILE_RATIO, fitFont, questionWordPx } from '../flashcardMotion';

// Module-level so the player keeps one stable loader identity (same trophy as the review intro).
const loadTrophy = () => import('../../../assets/animations/review-trophy.json').then((m) => m.default);
const TROPHY_LAST_FRAME = 70;

/** One easing for the whole glide of the last card into its place in the sheet. */
const SMOOTH = 'cubic-bezier(.22,1,.36,1)';
const GLIDE_MS = 560;
/** The big card shrinks evenly: an expo-out would drop it to tile size in the first frames. */
const SHRINK_EASE = 'cubic-bezier(.32,.72,0,1)';
/** The real card clears its answer (pinyin, meaning, examples) before the shrink. */
const CLEAR_MS = 120;
const RISE = [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }];
const LEAVE_EASE = 'cubic-bezier(.4,0,1,1)';

interface CardsDoneProps {
  /** Up to six sheet tiles; the last one is the card that was just answered (its tile is fed by the real card). */
  cards: Flashcard[];
  /** The session's whole deck: the picker offers only the types its words can take. */
  deck: Flashcard[];
  /** Words in the session (the subtitle). */
  wordCount: number;
  /** The flashcard stage (card area + answer bar); the answered card and answer bar are read from it. */
  stageRef: RefObject<HTMLElement | null>;
  /** The honey tone can drain now. */
  onTone: () => void;
  /** The quiz was picked on the picker Start quiz opens: [] = Mixed. */
  onStart: (types: QuizTypeId[]) => void;
  /** Practice only the first-pass misses when there are any. */
  onReviewAgain: () => void;
  missedCount?: number;
}

/**
 * The bridge between the cards and the quiz. The last answered card shrinks into the sheet, the other words
 * are set down around it. Start quiz clears the sheet and turns into the quiz picker (`QuizTypePicker`).
 */
export function CardsDone({ cards, deck, wordCount, stageRef, onTone, onStart, onReviewAgain, missedCount = 0 }: CardsDoneProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const trophyWrapRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<LottieRefCurrentProps>(null);
  /** Set once it is time for the trophy to play, so a late-loading animation still plays. */
  const trophyDue = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const onToneRef = useRef(onTone);
  onToneRef.current = onTone;
  const startedRef = useRef(false);
  /** Start quiz opened the picker: it morphs out of the button (no entrance with reduced motion). */
  const [picker, setPicker] = useState<QuizPickerEntrance | null>(null);
  const pickerStartRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    const slot = slotRef.current;
    const layer = layerRef.current;
    const btnWrap = buttonRef.current;
    const trophyWrap = trophyWrapRef.current;
    const stage = stageRef.current;
    if (!root || !text || !trophyWrap || !slot || !layer || !btnWrap || !stage) return undefined;

    const timers: number[] = [];
    const anims: Animation[] = [];
    const restore: Array<() => void> = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    const A = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim = el.animate(keyframes, { fill: 'both', ...options });
      anims.push(anim);
      return anim;
    };

    const count = cards.length;
    const lastIdx = count - 1;
    const lastCard = cards[lastIdx];
    const rootRect = root.getBoundingClientRect();

    // ---- sheet geometry: one row on wide screens (width is plentiful), a grid on phones; tiles shrink to fit,
    // so nothing crowds the button ----
    const wide = window.innerWidth >= 1024;
    const slots = count;
    const baseTw = wide ? 136 : 92;
    const gap = wide ? 28 : 14;
    const baseFont = wide ? 42 : 28;
    const cols = wide ? slots : Math.min(3, slots);
    const rows = Math.ceil(slots / cols);
    // On desktop the two buttons sit in the group under the sheet (2 × h-14 + gaps).
    const fitH = (slot.parentElement?.clientHeight ?? Infinity) - text.offsetHeight - 48 - (wide ? 290 : 0);
    const fitW = slot.clientWidth - 32;
    const tw = Math.max(48, Math.min(baseTw, (fitW - (cols - 1) * gap) / cols, (fitH - (rows - 1) * gap) / rows / TILE_RATIO));
    const th = tw * TILE_RATIO;
    slot.style.height = `${rows * th + (rows - 1) * gap}px`;
    const slotRect = slot.getBoundingClientRect();
    const slotLeft = slotRect.left + slotRect.width / 2 - rootRect.left;
    const slotTop = slotRect.top - rootRect.top;
    const tileEls = Array.from(layer.children) as HTMLElement[];
    const wordOf = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-clone-word]');
    const tileFont = (i: number) => fitFont(cards[i].front, tw, (baseFont * tw) / baseTw);
    tileEls.forEach((el, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, slots - row * cols);
      const rowW = inRow * tw + (inRow - 1) * gap;
      const word = wordOf(el);
      if (word) word.style.fontSize = `${tileFont(i)}px`;
      Object.assign(el.style, {
        left: `${slotLeft - rowW / 2 + (i % cols) * (tw + gap)}px`,
        top: `${slotTop + row * (th + gap)}px`,
        width: `${tw}px`,
        height: `${th}px`,
      });
    });
    const [title, subtitle] = Array.from(text.querySelectorAll<HTMLElement>('h2, p'));
    const morphEl = tileEls[lastIdx];
    const morphWord = wordOf(morphEl);

    // ---- the answered card: its box, borders and word, read once (it stays in place under this overlay) ----
    const box = Array.from(stage.querySelectorAll<HTMLElement>('[data-fc-card]')).find((el) => el.dataset.fcCard === lastCard.id) ?? null;
    const surface = box?.querySelector<HTMLElement>('[data-fc-surface]') ?? null;
    const cardArea = stage.querySelector<HTMLElement>('[data-fc-cardarea]');
    const barInner = stage.querySelector<HTMLElement>(wide ? '.rw-answer-bar' : '.rw-answer-bar > div');
    let real: {
      left: number; top: number; width: number; height: number; font: number; gapEm: number;
      wordCx: number; wordCy: number; shift: string; border: string; radius: string; displaced: boolean;
    } | null = null;
    if (box && surface) {
      const r = box.getBoundingClientRect();
      const sr = surface.getBoundingClientRect();
      const identity = getComputedStyle(box).transform;
      const settled = identity === 'none' || identity === 'matrix(1, 0, 0, 1, 0, 0)';
      const container = box.offsetParent as HTMLElement | null;
      const cr = container?.getBoundingClientRect();
      const width = box.offsetWidth;
      const height = box.offsetHeight;
      const left = settled || !cr ? r.left : cr.left + box.offsetLeft;
      const top = settled || !cr ? r.top : cr.top + box.offsetTop;
      let l = Infinity; let t = Infinity; let rt = -Infinity; let bm = -Infinity; let font = 0;
      Array.from(box.querySelectorAll<HTMLElement>('[data-fc-word] *')).forEach((el) => {
        if (el.childElementCount > 0 || !/[㐀-鿿]/.test(el.textContent ?? '')) return;
        const q = el.getBoundingClientRect();
        l = Math.min(l, q.left); t = Math.min(t, q.top); rt = Math.max(rt, q.right); bm = Math.max(bm, q.bottom);
        font ||= q.height;
      });
      const hasWord = Number.isFinite(l) && font > 0;
      const chars = Array.from(lastCard.front).length;
      const endFont = hasWord ? font : questionWordPx(chars, width);
      const cs = getComputedStyle(surface);
      const [bl, br, bt, bb] = [cs.borderLeftWidth, cs.borderRightWidth, cs.borderTopWidth, cs.borderBottomWidth].map(parseFloat);
      // Where the tile's flex-centred word would sit, vs where the real word is (relative to the card).
      const natCx = width / 2 + (bl - br) / 2;
      const natCy = height / 2 + (bt - bb) / 2;
      const wordCx = hasWord ? (l + rt) / 2 - sr.left : natCx;
      const wordCy = hasWord ? (t + bm) / 2 - sr.top : natCy;
      real = {
        left: left - rootRect.left, top: top - rootRect.top, width, height, font: endFont,
        gapEm: hasWord && chars > 1 ? Math.max(0, (rt - l - chars * endFont) / (chars - 1) / endFont) : 0,
        wordCx, wordCy,
        shift: `translate(${wordCx - natCx}px,${wordCy - natCy}px)`,
        border: `${cs.borderTopWidth} ${cs.borderRightWidth} ${cs.borderBottomWidth} ${cs.borderLeftWidth}`,
        radius: cs.borderTopLeftRadius,
        // A card that was swiped away is no longer where its box is: its tile fades in instead of replacing it.
        displaced: Math.abs(sr.left - r.left) > 3 || Math.abs(sr.top - r.top) > 3,
      };
    }

    let ready = false;
    let started = false;
    const hideRealCard = () => {
      if (cardArea) {
        cardArea.style.opacity = '0';
        restore.push(() => { cardArea.style.opacity = ''; });
      }
    };

    if (reduceMotion) {
      [trophyWrap, title, subtitle, btnWrap, ...tileEls].forEach((el) => { el.style.opacity = '1'; });
      trophyRef.current?.goToAndStop(TROPHY_LAST_FRAME, true);
      if (barInner) {
        barInner.style.opacity = '0';
        restore.push(() => { barInner.style.opacity = ''; });
      }
      hideRealCard();
      morphEl.querySelector<HTMLElement>('[data-tile-pinyin]')?.style.setProperty('opacity', '1');
      onToneRef.current();
      ready = true;
      startRef.current = () => {
        if (started) return;
        started = true;
        startedRef.current = true;
        [text, layer, btnWrap].forEach((el) => { el.style.visibility = 'hidden'; });
        startRef.current = () => pickerStartRef.current();
        setPicker({ kind: 'none' });
      };
    } else {
      const start = real ? CLEAR_MS : 0;
      if (barInner) A(barInner, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out' });
      if (box && real) {
        box.querySelectorAll<HTMLElement>('.rw-rise').forEach((el) => A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: CLEAR_MS, easing: 'ease-out' }));
      }
      // The other tiles settle with the leading card, rather than waiting in a queue.
      const others = tileEls.filter((_, i) => !(real && i === lastIdx));
      if (!real) others.forEach((el) => A(el, RISE, { delay: start, duration: GLIDE_MS, easing: EASE_OUT }));
      // The trophy marks the checkpoint: it rises as the last card settles and plays once.
      A(trophyWrap, RISE, { delay: start + 260, duration: 440, easing: EASE_OUT });
      at(start + 260, () => { trophyDue.current = true; trophyRef.current?.goToAndPlay(0, true); });
      A(title, RISE, { delay: start + 310, duration: 440, easing: EASE_OUT });
      A(subtitle, RISE, { delay: start + 350, duration: 440, easing: EASE_OUT });
      A(btnWrap, RISE, { delay: start + 420, duration: 440, easing: EASE_OUT });
      // The honey drains last: the screen has settled, so the tone change is only a colour cross-fade (no ghost of the big card).
      at(start + 420 + 440, () => { ready = true; onToneRef.current(); });

      if (real) {
        const r = real;
        at(start, () => {
          // The tile takes the card's place exactly, the real card goes, and the box glides into the sheet.
          const finalBox = {
            left: morphEl.style.left, top: morphEl.style.top, width: morphEl.style.width, height: morphEl.style.height,
          };
          morphEl.style.opacity = '1';
          hideRealCard();
          if (r.displaced) A(morphEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
          const to = { left: parseFloat(finalBox.left), top: parseFloat(finalBox.top), width: parseFloat(finalBox.width), height: parseFloat(finalBox.height) };
          // Real size, border and corner radius animate (not a scale), so the paper keeps true corners and edges.
          const box = (v: { left: number; top: number; width: number; height: number }) => ({
            left: `${v.left}px`, top: `${v.top}px`, width: `${v.width}px`, height: `${v.height}px`,
          });
          A(morphEl, [
            { ...box(r), borderWidth: r.border, borderRadius: r.radius },
            { ...box(to), borderWidth: TILE_BORDER, borderRadius: TILE_RADIUS },
          ], { duration: GLIDE_MS, easing: SHRINK_EASE });
          if (morphWord) {
            const word = morphWord.cloneNode(true) as HTMLElement;
            const x = to.left + to.width / 2;
            const y = to.top + to.height / 2 - 1;
            Object.assign(word.style, {
              position: 'absolute', left: `${x}px`, top: `${y}px`, width: 'max-content',
              fontSize: `${tileFont(lastIdx)}px`, columnGap: '0em', zIndex: '21', transformOrigin: 'center',
            });
            morphWord.style.visibility = 'hidden';
            layer.appendChild(word);
            const restoreWord = () => { word.remove(); morphWord.style.visibility = ''; };
            restore.push(restoreWord);
            A(word, [
              { transform: `translate(-50%,-50%) translate(${r.left + r.wordCx - x}px,${r.top + r.wordCy - y}px) scale(${r.font / tileFont(lastIdx)})` },
              { transform: 'translate(-50%,-50%)' },
            ], { duration: GLIDE_MS, easing: SHRINK_EASE });
            at(GLIDE_MS, restoreWord);
          }
          // A small settle as it lands, like a card set down on the table.
          A(morphEl, [{ translate: '0 0' }, { translate: '0 3px' }, { translate: '0 0' }], {
            delay: GLIDE_MS - 60, duration: 220, easing: 'ease-out', composite: 'add', fill: 'none',
          });
          const py = morphEl.querySelector('[data-tile-pinyin]');
          if (py) A(py, [{ opacity: 0 }, { opacity: 1 }], { delay: GLIDE_MS - 160, duration: 260, easing: 'ease-out' });
          // The other words come out from under the shrinking card, nearest first, rather than appearing from nothing.
          const ox = r.left + r.width / 2;
          const oy = r.top + r.height / 2;
          others.forEach((el, i) => {
            el.style.opacity = '1';
            const dx = ox - (parseFloat(el.style.left) + tw / 2);
            const dy = oy - (parseFloat(el.style.top) + th / 2);
            A(el, [{ transform: `translate(${dx}px,${dy}px) scale(.9)` }, { transform: 'none' }], {
              delay: 70 + (others.length - 1 - i) * 28, duration: 560, easing: SMOOTH,
            });
          });
        });
      } else {
        // Whatever card is on the stage (not the one that was answered) must not sit behind the sheet.
        if (cardArea) A(cardArea, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' });
        morphEl.querySelector<HTMLElement>('[data-tile-pinyin]')?.style.setProperty('opacity', '1');
        onToneRef.current();
      }

      // ---- Start quiz: the sheet and text leave, and the button becomes the picker's Mixed card ----
      startRef.current = () => {
        if (!ready || started) return;
        started = true;
        startedRef.current = true;
        (document.activeElement as HTMLElement | null)?.blur?.();
        btnWrap.style.pointerEvents = 'none';
        [trophyWrap, title, subtitle, btnWrap].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
        [trophyWrap, title, subtitle].forEach((el, i) => A(
          el,
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px)' }],
          { delay: i * 30, duration: 220, easing: LEAVE_EASE },
        ));
        const button = btnWrap.querySelector('button');
        const r = (button ?? btnWrap).getBoundingClientRect();
        // The picker's ghost takes over the button from this frame.
        btnWrap.style.opacity = '0';
        startRef.current = () => pickerStartRef.current();
        flushSync(() => setPicker({ kind: 'morph', look: 'button', from: { left: r.left, top: r.top, width: r.width, height: r.height } }));
        // The tiles gather under the Mixed card (the picker's types slide back out from there) instead of fading.
        const hero = root.querySelector<HTMLElement>('[data-picker-hero]')?.getBoundingClientRect();
        if (hero) {
          const cx = hero.left + hero.width / 2;
          const cy = hero.top + hero.height / 2;
          tileEls.forEach((el, i) => {
            const tr = el.getBoundingClientRect();
            const dx = cx - (tr.left + tr.width / 2);
            const dy = cy - (tr.top + tr.height / 2);
            A(el, [
              { transform: 'none', opacity: 1 },
              { transform: `translate(${dx}px,${dy}px) scale(.82)`, opacity: 1, offset: 0.85 },
              { transform: `translate(${dx}px,${dy}px) scale(.82)`, opacity: 0 },
            ], { delay: (count - 1 - i) * 18, duration: 440, easing: SMOOTH });
          });
        } else {
          A(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' });
        }
      };
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      anims.forEach((a) => a.cancel());
      restore.forEach((fn) => fn());
      startRef.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the bridge is built once per mount
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) startRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const trophySize = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 130 : 96;
  const subtitle = wordCount === 1 ? 'Quiz yourself on this word' : `Quiz yourself on these ${wordCount} words`;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label={`Cards done. ${subtitle}.`}
      tabIndex={-1}
      className="absolute inset-0 z-30 flex flex-col items-center outline-none"
    >
      {/* Centred in the space above the button, so the sheet never crowds it. */}
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
        <div ref={textRef} className="flex flex-col items-center">
          <div ref={trophyWrapRef} className="-mb-2" style={{ opacity: 0 }}>
            <LottiePlayer
              loadAnimationData={loadTrophy}
              loop={false}
              autoplay={false}
              lottieRef={trophyRef}
              onDOMLoaded={() => {
                if (reduceMotion) trophyRef.current?.goToAndStop(TROPHY_LAST_FRAME, true);
                else if (trophyDue.current) trophyRef.current?.goToAndPlay(0, true);
              }}
              width={trophySize}
              height={trophySize}
            />
          </div>
          <h2 className="text-[28px] font-black text-ui-ink-strong" style={{ opacity: 0 }}>Cards done</h2>
          <p className="mt-3 text-base font-bold text-ui-muted-strong" style={{ opacity: 0 }}>{subtitle}</p>
        </div>
        <div ref={slotRef} aria-hidden className="mt-8 w-full lg:mt-12" />
        {/* Phones: where the answer bar's buttons were. Desktop: in the group, right under the sheet. */}
        <div ref={buttonRef} className="absolute inset-x-0 bottom-0 px-4 pb-sheet-safe pt-4 sm:px-8 lg:static lg:mt-20 lg:w-full lg:p-0" style={{ opacity: 0 }}>
          <div className="mx-auto w-full max-w-md lg:max-w-xs">
            <ActionButton size="lg" fullWidth onClick={() => startRef.current()}>
              <span>Start quiz</span>
            </ActionButton>
            <div className="mt-2 w-full">
              <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" className="!bg-ui-surface !text-ui-muted-strong hover:!bg-ui-hover uppercase tracking-normal" onClick={() => { if (!startedRef.current) onReviewAgain(); }}>
                {missedCount > 0 ? `Review missed (${missedCount})` : 'Study all again'}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden className="w-full shrink-0 pb-sheet-safe pt-4 lg:hidden"><div className="h-32" /></div>
      <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0">
        {cards.map((card) => (
          <div
            key={card.id}
            className={cn(CARD_SURFACE_CLASS, 'absolute flex items-center justify-center')}
            style={{ opacity: 0, borderWidth: TILE_BORDER, borderRadius: TILE_RADIUS }}
          >
            <span className="font-chinese flex leading-none text-ui-ink" data-clone-word>
              {Array.from(card.front).map((ch, c) => <span key={c}>{ch}</span>)}
            </span>
          </div>
        ))}
      </div>
      {picker && (
        <QuizTypePicker
          entrance={picker}
          deck={deck}
          onStart={onStart}
          startRef={pickerStartRef}
        />
      )}
    </div>
  );
}
