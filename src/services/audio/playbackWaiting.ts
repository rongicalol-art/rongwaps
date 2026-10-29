/**
 * Where the current playback is: still loading, or playing. A speaker button claims the next playback,
 * then shows a spinner if sound hasn't started after a short beat, and sound bars while it plays.
 */
export interface PlaybackOwner { token: symbol; key: string }
/** `starting` is the quiet first beat before `loading` shows; `idle` once the playback ends. */
export type PlaybackPhase = 'idle' | 'starting' | 'loading' | 'playing';
export interface PlaybackWaitingState { seq: number; owner: PlaybackOwner | null; phase: PlaybackPhase }

/** Cached clips start well inside this, so the loading spinner only appears when a fetch is slow. */
const SHOW_AFTER_MS = 200;

let next: PlaybackOwner | null = null;
let state: PlaybackWaitingState = { seq: 0, owner: null, phase: 'idle' };
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const set = (patch: Partial<PlaybackWaitingState>) => {
  const changed = Object.entries(patch).some(([key, value]) => state[key as keyof PlaybackWaitingState] !== value);
  if (!changed) return;
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

export const playbackWaiting = {
  /** The next playback belongs to this button (called right before it plays). */
  claimNext(owner: PlaybackOwner) { next = owner; },
  /** A follow-up playback (e.g. a lookup that then plays the recording) keeps the current owner. */
  carryOwner() { next = state.owner; },
  begin(): number {
    clearTimeout(timer);
    const seq = state.seq + 1;
    set({ seq, owner: next, phase: 'starting' });
    next = null;
    timer = setTimeout(() => { if (state.seq === seq && state.phase === 'starting') set({ phase: 'loading' }); }, SHOW_AFTER_MS);
    return seq;
  },
  /** First sound of the current playback. */
  started() {
    clearTimeout(timer);
    if (state.phase !== 'idle') set({ phase: 'playing' });
  },
  end(seq: number) {
    if (seq !== state.seq) return;
    clearTimeout(timer);
    set({ phase: 'idle' });
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  snapshot: (): PlaybackWaitingState => state,
};
