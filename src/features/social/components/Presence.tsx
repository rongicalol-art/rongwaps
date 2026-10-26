import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, AvatarStack, PlayfulNavIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';

/** Global classmates in the existing header slot; full roster loads only after opening it. */
export function GlobalPresenceButton() {
  const samples = useAppStore(state => state.socialFaces);
  const me = useAppStore(state => state.socialMe);
  const total = useAppStore(state => Math.max(0, state.socialOnlineTotal - (state.showOnline && state.socialStatus === 'live' ? 1 : 0)));
  const faces = samples.filter(person => person.u !== me).slice(0, 3).map(person => ({ name: person.n, color: person.c, src: person.i }));
  return <button type="button" aria-label={total === 0 ? 'Classmates. Open profiles and chat.' : `${total} classmates online. Open profiles and chat.`}
    onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online', chatScope: 'global' } })}
    className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-control px-1 text-ui-muted-strong outline-none transition-colors hover:bg-ui-hover focus-ring-inline">
    {faces.length && total > 0 ? <AvatarStack people={faces} size="sm" max={3} /> : <AppIcon name="family" size={22} />}
    {total > 0 && <span className="text-xs font-black tabular-nums">{total > 99 ? '99+' : total}</span>}
  </button>;
}

/** Others in one lesson (from the Lobby's per-lesson counts), without me. */
function useLessonOthers(lesson: number | null) {
  const entry = useAppStore((state) => (lesson === null ? undefined : state.socialCounts[lesson]));
  const me = useAppStore((state) => state.socialMe);
  const mePresent = useAppStore(state => state.socialPeople.some(person => person.u === state.socialMe && person.l === lesson));
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

/** Lesson window: "N here" opens who's here and the lesson chat. Hidden while nobody else is in the lesson. */
export function HereButton({ lesson }: { lesson: number }) {
  const { faces, total } = useLessonOthers(lesson);
  const unread = useAppStore((state) => state.socialUnread);
  if (total === 0) return null;
  return (
    <button
      type="button"
      onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: unread ? 'chat' : 'lesson' } })}
      className="group mt-4 flex items-center gap-2.5 rounded-control py-1 pr-1 text-left outline-none focus-ring-inline"
    >
      <AvatarStack people={faces} max={3} size="sm" />
      <span className="text-base font-black text-ui-muted-strong transition-colors group-hover:text-ui-ink-strong">{total} here</span>
      {unread && <span aria-label="New messages" className="h-2.5 w-2.5 rounded-full bg-brand-primary" />}
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
      onClick={() => { onOpen(); useAppStore.getState().setSocial({ socialPanel: { kind: 'challenge', tab: 'lesson' } }); }}
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
