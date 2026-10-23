import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, Avatar, AvatarStack } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { CHEER_PHRASES, type ChatMessage } from '../../../../shared/lobby';
import { lobby } from '../lobbyController';
import { MuteButton, PersonRow } from './SocialBits';

const EMPTY: ChatMessage[] = [];

/**
 * Practice header (flashcards and friends): faces of who's in this lesson. The popover sends a cheer,
 * 一起考試？ opens a room with them, and Open chat jumps to the lesson chat. Nothing renders when alone.
 */
export function PracticeFaces() {
  const people = useAppStore((state) => state.socialPeople);
  const me = useAppStore((state) => state.socialMe);
  const blocked = useAppStore((state) => state.blockedUsers);
  const unread = useAppStore((state) => state.socialUnread);
  const chat = useAppStore((state) => state.socialChat?.messages ?? EMPTY);
  const racing = useAppStore((state) => Boolean(state.race));
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const others = useMemo(() => people.filter((person) => person.u !== me && !blocked.includes(person.u)), [people, me, blocked]);
  const lesson = people.find((person) => person.u === me)?.l ?? others[0]?.l ?? null;

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  if (others.length === 0 || racing) return null;
  const phrase = (index: number) => {
    const to = others.map((person) => person.u);
    setSent(index);
    lobby.cheer(to, index);
    window.setTimeout(() => { setOpen(false); setSent(null); }, 650);
  };
  const lastLine = [...chat].reverse().find((line) => line.u !== me && !line.r && !blocked.includes(line.u));
  const openChat = () => { setOpen(false); useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'chat' } }); };
  return (
    <div ref={root} className="relative mr-1">
      {/* Quiet like the other header controls: faces only, the book-colour dot for new messages. */}
      <button
        type="button"
        aria-label={`${others.length} studying with you`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`relative flex h-11 items-center rounded-control px-1.5 outline-none transition-colors hover:bg-ui-hover focus-ring ${open ? 'bg-ui-hover' : ''}`}
      >
        <AvatarStack people={others.map((person) => ({ name: person.n, color: person.c, src: person.i }))} total={others.length} max={3} size="md" />
        {unread && <span aria-label="New messages" className="absolute right-0.5 top-1 h-2.5 w-2.5 rounded-full bg-brand-primary ring-2 ring-ui-practice-canvas" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-popover w-[21rem] max-w-[calc(100vw-2rem)] rounded-feature border-2 border-ui-divider bg-ui-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-ui-ink-strong">Studying with you</span>
              <MuteButton />
            </div>
            <div className="mt-1">
              {others.slice(0, 3).map((person) => <PersonRow key={person.u} person={person} lesson={lesson} />)}
              {others.length > 3 && <p className="pb-1 pt-2 text-sm font-extrabold text-ui-muted">+{others.length - 3} more in this lesson</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {CHEER_PHRASES.slice(0, 2).map((text, index) => (
                <ActionButton key={text} size="sm" variant="secondary" onClick={() => phrase(index)}
                  className={`font-chinese-sans font-bold normal-case tracking-normal ${sent === index ? '!text-ui-muted' : ''}`}>
                  {sent === index ? '已送出' : text}
                </ActionButton>
              ))}
            </div>
            {/* The chat entry is the latest line itself: tap it to jump into the lesson chat. */}
            <button
              type="button"
              onClick={openChat}
              className={`mt-3 flex w-full items-center gap-3 rounded-control border-2 px-3 py-2.5 text-left outline-none transition-colors focus-ring border-ui-divider hover:bg-ui-hover`}
            >
              {lastLine ? <Avatar name={lastLine.n} color={lastLine.c} size="md" src={lastLine.i} /> : <AppIcon name="chat" size={22} className="text-ui-ink-strong" />}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-black text-ui-ink-strong">
                  Lesson chat{unread && <span className="h-2 w-2 rounded-full bg-ui-ink-strong" aria-label="New messages" />}
                </span>
                <span className="block truncate font-chinese-sans text-sm font-bold text-ui-ink-strong">
                  {lastLine ? <><span className="font-black text-ui-ink">{lastLine.n}</span> {lastLine.t}</> : 'Say hi to your classmates'}
                </span>
              </span>
              <AppIcon name="next" size={18} className="text-ui-ink-strong" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
