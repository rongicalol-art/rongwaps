import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, ContextualChineseText } from '../../lib/widgets';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';
import type { GrammarPractice, GrammarWordToken, SlotBuildItem } from '../../types/models';
import { checkSlotBuild, practiceSlots, slotBuildResult, slotBuildSolutions } from '../../utils/grammar/grammarPracticeCheck';
import { shuffleItems } from '../../utils/srs/sessionOrder';
import { ExerciseItem, type ExerciseItemState } from './components/ExerciseItem';
import { textIn, type PracticeScript } from './practiceTypes';
import { PracticeScene } from './components/PracticeScene';

export interface ExercisePageProps {
  practice: GrammarPractice;
  script: PracticeScript;
  showPinyin: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
  /** Continue after the last item. */
  onComplete: () => void;
  /** Back to the grammar page this exercise follows. */
  onBack?: () => void;
  /** A panel (book page, dictionary, notes) is open on top: ignore key shortcuts. */
  shortcutsDisabled?: boolean;
}

/** How long a result shows before the page moves on (ms). */
const PAUSE = { check: 320, correct: 650, retry: 1000, revealed: 1500 } as const;

const fresh = (): ExerciseItemState => ({ placed: {}, status: 'idle', tries: 0, wrong: [] });
const done = (state: ExerciseItemState) => state.status === 'correct' || state.status === 'revealed';
const sameText = (a: { traditional: string }, b: { traditional: string }) => a.traditional === b.traditional;

/**
 * A Book 1 exercise page: the book's instruction once, then every item in book order on one scroll.
 * The learner taps words into the blanks; an item checks itself when it is full.
 * Wrong: the why, wrong words go back, one retry. Wrong again: the answer fills in and the page moves on.
 */
export function ExercisePage({ practice, script, showPinyin, contextTokens, onOpenWord, onComplete, onBack, shortcutsDisabled = false }: ExercisePageProps) {
  const reduceMotion = useReducedMotion();
  // One picture for every item (the book's people row) shows once under the title, as the book prints it.
  const shared = useMemo(() => {
    const scenes = practice.items.map((item) => ('scene' in item ? item.scene : undefined));
    const first = JSON.stringify(scenes[0] ?? null);
    return scenes.length > 1 && first !== 'null' && scenes.every((scene) => JSON.stringify(scene ?? null) === first) ? scenes[0] : undefined;
  }, [practice]);
  // Tiles are mixed once per visit; every occurrence keeps its own index.
  const items = useMemo(() => practice.items.flatMap((item) => (item.kind === 'slot-build'
    ? [{ ...item, scene: shared ? undefined : item.scene, tiles: shuffleItems(item.tiles, sameText) }]
    : [])), [practice, shared]);
  const [states, setStates] = useState<ExerciseItemState[]>(() => items.map(fresh));
  // Every change goes through `commit`, so timers and scrolling read the latest state and run once.
  const statesRef = useRef(states);
  const commit = useCallback((index: number, next: ExerciseItemState) => {
    statesRef.current = statesRef.current.map((state, at) => (at === index ? next : state));
    setStates(statesRef.current);
  }, []);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const activate = useCallback((index: number) => { activeRef.current = index; setActive(index); }, []);
  const nodes = useRef<Array<HTMLElement | null>>([]);
  // Steady ref callbacks keep the memoised items from re-rendering.
  const refs = useMemo(() => items.map((_, index) => (node: HTMLElement | null) => { nodes.current[index] = node; }), [items]);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const later = useCallback((ms: number, run: () => void) => { timers.current.push(window.setTimeout(run, reduceMotion ? Math.min(ms, 200) : ms)); }, [reduceMotion]);

  /** The next unfinished item after this one (else any unfinished), or the end of the page. */
  const advance = useCallback((from: number) => {
    const current = statesRef.current;
    const after = current.findIndex((state, index) => index > from && !done(state));
    const next = after >= 0 ? after : current.findIndex((state) => !done(state));
    activate(next);
    const node = next >= 0 ? nodes.current[next] : endRef.current;
    window.requestAnimationFrame(() => node?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
  }, [activate, reduceMotion]);

  const check = useCallback((index: number) => {
    const item = items[index];
    const state = statesRef.current[index];
    const answer = Object.fromEntries(practiceSlots(item).map((slot) => [slot.id, state.placed[slot.id] === undefined ? undefined : item.tiles[state.placed[slot.id]].traditional]));
    const verdict = checkSlotBuild(item, answer);
    if (verdict.correct) {
      commit(index, { ...state, status: 'correct', note: undefined, wrong: [], sentence: slotBuildResult(item, answer) });
      later(PAUSE.correct, () => advance(index));
      return;
    }
    if (state.tries >= 1) {
      // Second miss: the answer fills in, with the why kept.
      const solution = slotBuildSolutions(item)[0] ?? {};
      const used = new Set<number>();
      const placed = Object.fromEntries(Object.entries(solution).map(([slotId, word]) => {
        const tile = item.tiles.findIndex((candidate, at) => candidate.traditional === word && !used.has(at));
        used.add(tile);
        return [slotId, tile];
      }));
      commit(index, { ...state, status: 'revealed', placed, wrong: [], tries: state.tries + 1, note: verdict.note, sentence: slotBuildResult(item, solution) });
      later(PAUSE.revealed, () => advance(index));
      return;
    }
    const wrongSlots = practiceSlots(item).filter((slot) => !slot.answers.includes(answer[slot.id] ?? '')).map((slot) => slot.id);
    // Right words in a wrong combination: every word goes back.
    const back = wrongSlots.length ? wrongSlots : Object.keys(state.placed);
    commit(index, { ...state, status: 'wrong', tries: state.tries + 1, note: verdict.note, wrong: back });
    later(PAUSE.retry, () => {
      const latest = statesRef.current[index];
      if (latest.status !== 'wrong') return;
      commit(index, {
        ...latest,
        status: 'idle',
        wrong: [],
        placed: Object.fromEntries(Object.entries(latest.placed).filter(([slotId]) => !back.includes(slotId))),
      });
    });
  }, [advance, commit, items, later]);

  /** Put a word in the next empty blank; a full item checks itself. */
  const place = useCallback((index: number, tile: number) => {
    const slots = practiceSlots(items[index]);
    const state = statesRef.current[index];
    if (!state || state.status !== 'idle') return;
    const target = slots.find((slot) => state.placed[slot.id] === undefined)?.id;
    if (!target) return;
    const placed = Object.fromEntries(Object.entries(state.placed).filter(([, other]) => other !== tile));
    placed[target] = tile;
    const full = slots.every((slot) => placed[slot.id] !== undefined);
    commit(index, {
      ...state,
      placed,
      status: full ? 'checking' : 'idle',
      note: undefined,
    });
    if (full) later(PAUSE.check, () => check(index));
  }, [check, commit, items, later]);

  const takeBack = useCallback((index: number, slotId: string) => {
    const state = statesRef.current[index];
    if (state.status !== 'idle') return;
    const placed = { ...state.placed };
    delete placed[slotId];
    commit(index, { ...state, placed });
  }, [commit]);

  const select = useCallback((index: number) => {
    if (!done(statesRef.current[index]) && index !== activeRef.current) activate(index);
  }, [activate]);

  const activeState = active >= 0 ? states[active] : undefined;
  const activeItem: SlotBuildItem | undefined = active >= 0 ? items[active] : undefined;
  const bank = activeItem && activeState ? activeItem.tiles.map((_, tile) => tile).filter((tile) => !Object.values(activeState.placed).includes(tile)) : [];
  useNumberKeySelection({ items: bank, onSelect: (tile) => place(active, tile), disabled: shortcutsDisabled || activeState?.status !== 'idle' });

  const finished = states.every(done);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col pb-24">
      {onBack && (
        <div className="mb-1 px-1 sm:px-2">
          <ActionButton variant="quiet" size="md" className="!px-3 !text-ui-muted-strong" onClick={onBack} aria-label="Back to grammar" title="Back to grammar">
            <AppIcon name="back" size={20} />
            <span>Grammar</span>
          </ActionButton>
        </div>
      )}
      <h1 className="mb-4 px-3 text-2xl font-black leading-tight text-balance text-ui-ink-strong sm:mb-6 sm:px-5 sm:text-2xl">{practice.title}</h1>
      {shared && (
        <div className="mb-4 max-w-md px-3 sm:mb-6 sm:px-5">
          <PracticeScene
            scene={shared}
            arrived={false}
            renderChinese={(text) => <ContextualChineseText wordClassName="font-chinese font-semibold" text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />}
          />
        </div>
      )}
      <ol className="flex flex-col gap-0.5">
        {items.map((item, index) => (
          <ExerciseItem
            key={item.id}
            ref={refs[index]}
            item={item}
            index={index}
            state={states[index]}
            active={index === active}
            script={script}
            showPinyin={showPinyin}
            contextTokens={contextTokens}
            onOpenWord={onOpenWord}
            onActivate={select}
            onPlace={place}
            onTakeBack={takeBack}
          />
        ))}
      </ol>
      <div ref={endRef} className="flex scroll-mt-[30vh] items-center justify-center gap-3 px-1 pt-10 sm:px-2">
        {/* Always a way on: Skip while items are left, Continue once every item is done. */}
        <ActionButton size="lg" variant={finished ? 'primary' : 'secondary'} className="min-w-56" onClick={onComplete}>
          {finished ? 'Continue' : 'Skip'}
        </ActionButton>
      </div>
    </div>
  );
}
