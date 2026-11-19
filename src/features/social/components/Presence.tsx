import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, Avatar, AvatarStack, PlayfulNavIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { countedIn, unreadTotal } from '../../../store/slices/socialSlice';
import type { ChatMessage } from '../../../../shared/lobby';
import { isStudying } from '../presence';

const NO_LINES: ChatMessage[] = [];
const SETTLE = [0.22, 1, 0.36, 1] as const;

/** The small square count on a face stack (the same family as the 1/2/3 answer badges). */
export function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  return <span className={`inline-grid h-5 min-w-5 place-items-center rounded-xs bg-brand-primary px-1 text-[11px] font-black leading-none tabular-nums text-brand-on-primary ${className}`}>{count > 9 ? '9+' : count}</span>;
}

/**
 * The faces in the top bar are the chat button. Whoever wrote since you last looked moves to the front, and the
 * number counts the new lines; with nothing new it shows who's online. While studying the faces stay still.
 */
export function GlobalPresenceButton() {
  const samples = useAppStore(state => state.socialFaces);
  const me = useAppStore(state => state.socialMe);
  const total = useAppStore(state => Math.max(0, state.socialOnlineTotal - (state.showOnline && state.socialStatus === 'live' ? 1 : 0)));
  const unread = useAppStore(unreadTotal);
  const lines = useAppStore(state => state.socialChat?.messages ?? NO_LINES);
  const read = useAppStore(state => state.socialChatRead);
  const still = useAppStore(isStudying);
  const reduce = useReducedMotion();
  const animate = !still && !reduce;
  const faces = useMemo(() => {
    const writers = unread > 0 ? [...lines].reverse().filter(line => line.id > read && line.u !== me && line.t) : [];
    const seen = new Set<string>();
    return [...writers.map(line => ({ id: line.u, name: line.n, color: line.c, src: line.i })), ...samples.filter(person => person.u !== me).map(person => ({ id: person.u, name: person.n, color: person.c, src: person.i }))]
      .filter(face => !seen.has(face.id) && seen.add(face.id)).slice(0, 3);
  }, [lines, read, me, samples, unread]);
  const label = unread > 0 ? `${unread} new ${unread === 1 ? 'message' : 'messages'}. Open chat.` : total === 0 ? 'Study together. Open chat.' : `${total} people online. Open chat.`;
  return <button type="button" aria-label={label}
    onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'chat' } })}
    className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-control px-1 text-ui-muted-strong outline-none transition-colors hover:bg-ui-hover focus-ring-inline">
    {faces.length && (total > 0 || unread > 0) ? (
      <span className="flex">
        <AnimatePresence initial={false} mode="popLayout">
          {faces.map((face, index) => (
            <motion.span key={face.id} layout={animate ? 'position' : false}
              initial={animate ? { opacity: 0, scale: 0.4 } : false} animate={{ opacity: 1, scale: 1 }} exit={animate ? { opacity: 0, scale: 0.5 } : { opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.45, ease: SETTLE }}
              style={{ zIndex: faces.length - index }} className={`relative flex ${index ? '-ml-2' : ''}`}>
              <Avatar name={face.name} color={face.color} src={face.src} size="sm" />
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    ) : <AppIcon name="family" size={22} />}
    {unread > 0
      ? <motion.span key={unread} initial={animate ? { scale: 0.6 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18, delay: animate ? 0.12 : 0 }} className="flex"><UnreadBadge count={unread} /></motion.span>
      : total > 0 && <span className="text-xs font-black tabular-nums">{total > 99 ? '99+' : total}</span>}
  </button>;
}

/** Others in one lesson (from the Lobby's per-lesson counts), without me. */
function useLessonOthers(lesson: number | null) {
  const entry = useAppStore((state) => (lesson === null ? undefined : state.socialCounts[lesson]));
  const me = useAppStore((state) => state.socialMe);
  const mePresent = useAppStore(state => countedIn(state, lesson));
  return useMemo(() => {
    if (!entry) return { faces: [], total: 0 };
    const others = entry.f.filter((person) => person.u !== me);
    const meHere = mePresent || entry.f.some((person) => person.u === me);
    return { faces: others.map((person) => ({ name: person.n, color: person.c, src: person.i })), total: Math.max(others.length, entry.n - (meHere ? 1 : 0)) };
  }, [entry, me, mePresent]);
}

/** Faces on a Books lesson tile: who's studying it now. Fades in; renders nothing when nobody is. */
export function LessonFaces({ lesson }: { lesson: number }) {
  const { faces, total } = useLessonOthers(lesson);
  const reduce = useReducedMotion();
  if (total === 0) return null;
  return (
    <motion.span initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="shrink-0" aria-label={`${total} studying now`}>
      <AvatarStack people={faces} total={total} size="sm" />
    </motion.span>
  );
}

/** Lesson window: "N here" opens who's here. Hidden while nobody else is in the lesson. */
export function HereButton({ lesson }: { lesson: number }) {
  const { faces, total } = useLessonOthers(lesson);
  if (total === 0) return null;
  return (
    <button
      type="button"
      onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online' } })}
      className="group mt-4 flex items-center gap-2.5 rounded-control py-1 pr-1 text-left outline-none focus-ring-inline"
    >
      <AvatarStack people={faces} max={3} size="sm" />
      <span className="text-base font-black text-ui-muted-strong transition-colors group-hover:text-ui-ink-strong">{total} here</span>
    </button>
  );
}

/** Practice hub: Challenge sits under Quiz; a quiet row like Quiz, with a live online line. Hidden when study together is off. */
export function ChallengeCard({ onOpen }: { onOpen: () => void }) {
  // Hidden only when study together is off (a brief reconnect keeps it in place).
  const live = useAppStore((state) => state.socialStatus !== 'off');
  const counts = useAppStore((state) => state.socialCounts);
  const me = useAppStore((state) => state.socialMe);
  const total = useAppStore(state => Math.max(0, state.socialOnlineTotal - (state.showOnline ? 1 : 0)));
  const online = useMemo(() => {
    const people = Object.values(counts).flatMap((entry) => entry.f).filter((person) => person.u !== me);
    return { faces: people.slice(0, 3).map((person) => ({ name: person.n, color: person.c, src: person.i })), total };
  }, [counts, me, total]);
  if (!live) return null;
  return (
    <ActionButton
      variant="secondary"
      size="lg"
      fullWidth
      edgeColor="var(--color-ui-border)"
      onClick={() => { onOpen(); useAppStore.getState().setSocial({ socialPanel: { kind: 'challenge', tab: 'online' } }); }}
      className="min-h-[5rem] justify-start gap-3.5 normal-case tracking-normal !border-ui-border !text-ui-ink-strong"
    >
      <PlayfulNavIcon name="challenge" className="h-8 w-8" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-lg font-black">Challenge</span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-ui-muted-strong">
          {online.total > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-feedback-success" />}
          <span className="truncate">{online.total > 0 ? `${online.total} online · race or join a room` : 'Race friends or join a room'}</span>
        </span>
      </span>
      {online.total > 0 && <AvatarStack people={online.faces} size="sm" max={3} />}
      <AppIcon name="next" size={18} className="shrink-0 text-ui-muted-strong" />
    </ActionButton>
  );
}
