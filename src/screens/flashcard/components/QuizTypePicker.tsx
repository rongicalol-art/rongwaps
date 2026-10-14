import { rectMorphFrames } from '../../../utils/browser/rectMorph';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ActionButton, PlayfulNavIcon, type PlayfulNavIconName } from '../../../lib/widgets';
import { PracticeChoiceButton, beginQuizLaunch } from '../../../features/practice';
import type { Flashcard } from '../../../data/flashcards';
import { availableQuizTypes, type QuizTypeId } from '../../../utils/vocabulary/quizDirector';
import { cn } from '../../../utils/cn';
import { EASE_OUT } from '../flashcardMotion';

const TYPES: ReadonlyArray<{ id: QuizTypeId; label: string; icon: PlayfulNavIconName }> = [
  { id: 'meaning', label: 'Meaning', icon: 'meaning' },
  { id: 'listen', label: 'Listen', icon: 'listening' },
  { id: 'hanzi', label: 'Characters', icon: 'characters' },
  { id: 'match', label: 'Match pairs', icon: 'quiz' },
  { id: 'true-false', label: 'True or false', icon: 'trueFalse' },
  { id: 'build', label: 'Build the word', icon: 'build' },
];

const MORPH_MS = 520;
const RISE_MS = 300;
/** A touch of settle as the types land in their slots. */
const SLIDE_EASE = 'cubic-bezier(.25,1.12,.4,1)';
const SELECTED_EDGE = 'var(--color-brand-primary)';

type Box = { left: number; top: number; width: number; height: number };

/**
 * How the picker arrives. `morph`: the button that opened it (viewport box) becomes the Mixed card: the
 * Start quiz button on Cards done (`look: 'button'`) or the dock's quiz button (`look: 'dock'`). `rise`: the Mixed
 * card rises in place (no button on screen). `none`: reduced motion.
 */
export type QuizPickerEntrance =
  | { kind: 'morph'; from: Box; look: 'button' | 'dock' }
  | { kind: 'rise' }
  | { kind: 'none' };

interface QuizTypePickerProps {
  entrance: QuizPickerEntrance;
  /** The quiz's words: only types at least one of them can take are offered, and Mixed's cards show one. */
  deck: readonly Flashcard[];
  /** Start with the picked types; [] means Mixed (every type). */
  onStart: (types: QuizTypeId[]) => void;
  /** Exposes Start to a parent that owns the keyboard (Cards done). */
  startRef?: MutableRefObject<() => void>;
}

/** The word on Mixed's middle card: a one-character word reads best at this size. */
function mixedHanzi(deck: readonly Flashcard[]) {
  return (deck.find((c) => Array.from(c.front).length === 1) ?? deck.find((c) => Array.from(c.front).length === 2) ?? deck[0])?.front ?? '字';
}

/**
 * Mixed's art: a small hand of three cards (the Listen and Meaning type icons around a word) that waves while
 * idle and spreads on hover.
 */
function MiniDeck({ hanzi }: { hanzi: string }) {
  const face = 'flex h-full w-full items-center justify-center rounded-xs border-2 border-b-[3px] border-ui-border';
  return (
    <span aria-hidden className="relative block h-[70px] w-[132px]">
      <span className="rw-deck-card rw-deck-left h-[52px] w-[41px]">
        <span className={cn(face, 'bg-ui-surface-hover')}><PlayfulNavIcon name="listening" className="h-6 w-6" /></span>
      </span>
      <span className="rw-deck-card rw-deck-right h-[52px] w-[41px]">
        <span className={cn(face, 'bg-ui-surface-hover')}><PlayfulNavIcon name="meaning" className="h-6 w-6" /></span>
      </span>
      <span className="rw-deck-card rw-deck-front h-[60px] w-[46px]">
        <span className={cn(face, 'bg-ui-surface font-chinese text-ui-ink', Array.from(hanzi).length > 1 ? 'text-lg' : 'text-2xl')}>{hanzi}</span>
      </span>
    </span>
  );
}

/**
 * Pick the quiz: Mixed (the default) or any set of single types. The Mixed card arrives first (morphing out of
 * the button that opened it, or rising in place), then the types slide out from under it to their slots.
 */
export function QuizTypePicker({ entrance, deck, onStart, startRef }: QuizTypePickerProps) {
  const available = useMemo(() => availableQuizTypes(deck), [deck]);
  const hanzi = useMemo(() => mixedHanzi(deck), [deck]);
  const types = TYPES.filter((type) => available.has(type.id));
  const [picked, setPicked] = useState<QuizTypeId[]>([]);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  const toggle = (id: QuizTypeId) => setPicked((current) => {
    const next = current.includes(id) ? current.filter((type) => type !== id) : [...current, id];
    // None, or every offered type, is just Mixed.
    return next.length === types.length ? [] : next;
  });

  const start = () => {
    const root = rootRef.current;
    if (leaving.current || !root) return;
    leaving.current = true;
    root.style.pointerEvents = 'none';
    const chosen = pickedRef.current;
    if (entrance.kind === 'none') {
      onStart(chosen);
      return;
    }
    const selected = chosen.length === 0
      ? heroRef.current?.querySelector<HTMLElement>('button')
      : gridRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (selected) beginQuizLaunch(root, selected);
    onStart(chosen);
  };
  if (startRef) startRef.current = start;
  const startNow = useRef(start);
  startNow.current = start;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat) startNow.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const grid = gridRef.current;
    const title = titleRef.current;
    const dock = dockRef.current;
    if (entrance.kind === 'none' || !root || !hero || !grid || !title || !dock) return undefined;

    const anims: Animation[] = [];
    const timers: number[] = [];
    const rootRect = root.getBoundingClientRect();
    const rel = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { left: r.left - rootRect.left, top: r.top - rootRect.top, width: r.width, height: r.height };
    };
    const to = rel(hero);
    const heroCx = to.left + to.width / 2;
    const heroCy = to.top + to.height / 2;
    const tiles = Array.from(grid.children) as HTMLElement[];
    const offsets = tiles.map((tile) => {
      const r = rel(tile);
      return `translate(${heroCx - (r.left + r.width / 2)}px, ${heroCy - (r.top + r.height / 2)}px) scale(.82)`;
    });

    [title, dock].forEach((el) => { el.style.opacity = '0'; });
    // Hidden until the Mixed card is in place, so nothing shows under it while it arrives.
    tiles.forEach((tile, i) => { tile.style.transform = offsets[i]; tile.style.visibility = 'hidden'; });

    // Mixed holds every type: they slide out from under it, top row first, the centre card a beat early.
    const reveal = () => {
      tiles.forEach((tile, i) => {
        tile.style.transform = '';
        tile.style.visibility = '';
        const delay = Math.floor(i / 3) * 70 + Math.abs((i % 3) - 1) * 30;
        anims.push(tile.animate([{ transform: offsets[i] }, { transform: 'none' }], {
          duration: 480, delay, easing: SLIDE_EASE, fill: 'backwards',
        }));
      });
      if (entrance.kind === 'morph') {
        title.style.opacity = '';
        anims.push(title.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }));
      }
      dock.style.opacity = '';
      anims.push(dock.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], {
        duration: 320, delay: 160, easing: EASE_OUT, fill: 'backwards',
      }));
    };

    let ghost: HTMLElement | null = null;
    let ghostLabel: HTMLElement | null = null;
    if (entrance.kind === 'morph') {
      // The button you pressed becomes the Mixed card: same box, rising to its spot, softening to the selected look.
      const { look } = entrance;
      const from = { ...entrance.from, left: entrance.from.left - rootRect.left, top: entrance.from.top - rootRect.top };
      hero.style.visibility = 'hidden';
      const css = getComputedStyle(root);
      const color = (name: string) => css.getPropertyValue(name).trim();
      const el = document.createElement('div');
      ghost = el;
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        position: 'absolute', zIndex: '20', pointerEvents: 'none', boxSizing: 'border-box', borderStyle: 'solid',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 'var(--radius-control)',
      });
      const label = document.createElement('span');
      if (look === 'button') {
        label.textContent = 'Start quiz';
        label.className = 'text-base font-black uppercase tracking-wider text-brand-on-primary';
        ghostLabel = label;
        Object.assign(label.style, { position: 'absolute', left: `${from.left + from.width / 2}px`, top: `${from.top + from.height / 2}px`, zIndex: '21', whiteSpace: 'nowrap', transform: 'translate(-50%,-50%)' });
        root.appendChild(label);
      }
      root.appendChild(el);
      // The dock's quiz button is a soft tile already: it only grows and takes the accent edge.
      const start = look === 'button'
        ? {
          backgroundColor: color('--color-brand-primary'), borderColor: color('--color-brand-primary'),
          borderWidth: '0px', borderBottomWidth: 'var(--depth-lg)', borderBottomColor: color('--color-brand-primary-edge'),
        }
        : {
          backgroundColor: color('--color-brand-primary-soft'), borderColor: color('--color-brand-primary'),
          borderWidth: '2px', borderBottomWidth: '2px', borderBottomColor: color('--color-brand-primary'),
        };
      Object.assign(el.style, {
        left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
        backgroundColor: color('--color-brand-primary-soft'), borderColor: color('--color-brand-primary'),
        borderWidth: '2px', borderBottomWidth: 'calc(2px + var(--depth-md))', transformOrigin: 'top left',
      });
      const oldPaint = document.createElement('div');
      Object.assign(oldPaint.style, { position: 'absolute', inset: '0', borderStyle: 'solid', borderRadius: 'inherit', ...start });
      el.appendChild(oldPaint);
      anims.push(oldPaint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MORPH_MS, easing: EASE_OUT, fill: 'forwards' }));
      anims.push(el.animate(rectMorphFrames(from, to), { duration: MORPH_MS, easing: EASE_OUT, fill: 'forwards' }));
      anims.push(label.animate([
        { opacity: 1, transform: 'translate(-50%,-50%)' },
        { opacity: 0, transform: `translate(-50%,-50%) translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height / 2 - from.top - from.height / 2}px)` },
      ], { duration: 140, fill: 'forwards' }));
      timers.push(window.setTimeout(() => {
        hero.style.visibility = '';
        el.remove();
        ghostLabel?.remove();
        reveal();
      }, MORPH_MS));
    } else {
      // Opened from the quiz button: the title and the Mixed card rise together, then the types come out.
      title.style.opacity = '';
      [title, hero].forEach((el) => anims.push(el.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, easing: EASE_OUT, fill: 'backwards' },
      )));
      timers.push(window.setTimeout(reveal, RISE_MS));
    }

    return () => {
      timers.forEach(window.clearTimeout);
      anims.forEach((anim) => anim.cancel());
      ghost?.remove();
      ghostLabel?.remove();
      hero.style.visibility = '';
      [title, dock].forEach((el) => { el.style.opacity = ''; });
      tiles.forEach((tile) => { tile.style.transform = ''; tile.style.visibility = ''; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the entrance plays once per mount
  }, []);

  const mixed = picked.length === 0;

  return (
    <div ref={rootRef} className="absolute inset-0 z-10 flex flex-col items-center">
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4">
        <h2 ref={titleRef} className="text-2xl font-black text-ui-ink-strong lg:text-[28px]">Choose your quiz</h2>
        {/* The tiles sit under the Mixed card while they slide out. */}
        <div ref={heroRef} className="relative z-[1] mt-6 w-[212px] lg:mt-8 lg:w-[260px]">
          <PracticeChoiceButton
            compact
            state={mixed ? 'selected' : 'idle'}
            selectedEdgeColor={SELECTED_EDGE}
            aria-pressed={mixed}
            onClick={() => setPicked([])}
          >
            <span className="flex flex-col items-center gap-1.5 py-1">
              <MiniDeck hanzi={hanzi} />
              <span className="text-xl font-black leading-none lg:text-[22px]">Mixed</span>
              <span className="mt-0.5 rounded-xs bg-brand-primary-wash px-2 py-0.5 text-xs font-black text-brand-primary-deep">Recommended</span>
            </span>
          </PracticeChoiceButton>
        </div>
        {/* Rows of three; a short last row stays centred under the Mixed card. */}
        <div ref={gridRef} className="mt-5 flex w-full max-w-[344px] flex-wrap justify-center gap-3 lg:mt-6 lg:max-w-[432px] lg:gap-4">
          {types.map((type) => {
            const on = picked.includes(type.id);
            return (
              <PracticeChoiceButton
                key={type.id}
                compact
                state={on ? 'selected' : 'idle'}
                selectedEdgeColor={SELECTED_EDGE}
                aria-pressed={on}
                onClick={() => toggle(type.id)}
                className="w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2rem)/3)]"
              >
                {/* Icons share one line across the grid; a two-line label grows down, never pushes its icon. */}
                <span className="flex h-[92px] flex-col items-center gap-2 pt-[13px] lg:h-[100px]">
                  {type.id === 'hanzi' ? (
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center font-chinese text-4xl font-bold leading-none text-ui-ink-strong lg:h-12 lg:w-12 lg:text-5xl">字</span>
                  ) : (
                    <PlayfulNavIcon name={type.icon} className="h-10 w-10 lg:h-12 lg:w-12" />
                  )}
                  <span className="text-[15px] font-black leading-tight">{type.label}</span>
                </span>
              </PracticeChoiceButton>
            );
          })}
        </div>
        {/* Phones: the bottom dock spot. Desktop: in the group, under the types. */}
        <div ref={dockRef} className="absolute inset-x-0 bottom-0 px-4 pb-sheet-safe pt-4 sm:px-8 lg:static lg:mt-12 lg:w-full lg:p-0">
          <div className="mx-auto w-full max-w-md lg:max-w-xs">
            <ActionButton size="lg" fullWidth onClick={start}>
              <span>Start quiz</span>
            </ActionButton>
          </div>
        </div>
      </div>
      <div aria-hidden className="w-full shrink-0 pb-sheet-safe pt-4 lg:hidden"><div className="h-14" /></div>
    </div>
  );
}
