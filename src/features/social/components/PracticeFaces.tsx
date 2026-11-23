import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, Avatar, AvatarStack } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { countedIn, partyUnread, unreadTotal } from '../../../store/slices/socialSlice';
import { CHEER_PHRASES, type ChatMessage } from '../../../../shared/lobby';
import { socialColor } from '../../../../shared/quizRace';
import { lobby } from '../lobbyController';
import { MuteButton, PersonRow } from './SocialBits';
import { GlobalPresenceButton, UnreadBadge } from './Presence';
import { linePhoto } from '../socialText';

const EMPTY: ChatMessage[] = [];

/**
 * Practice header (flashcards and friends): faces of who's in this lesson. The popover sends a cheer,
 * 一起考試？ opens a room with them, and the Chat row opens the class chat. When alone, the faces button stays available.
 */
export function PracticeFaces() {
  const people = useAppStore((state) => state.socialPeople);
  const me = useAppStore((state) => state.socialMe);
  const unread = useAppStore(unreadTotal);
  const partyChatUnread = useAppStore(partyUnread);
  const chat = useAppStore((state) => state.socialChat?.messages ?? EMPTY);
  const saved = useAppStore((state) => state.socialSaved);
  const race = useAppStore((state) => state.race);
  const reduce = useReducedMotion();
  const onlineTotal = useAppStore((state) => Math.max(0, state.socialOnlineTotal - (state.showOnline && state.socialStatus === 'live' ? 1 : 0)));
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const others = useMemo(() => people.filter((person) => person.u !== me), [people, me]);
  const lesson = people.find((person) => person.u === me)?.l ?? others[0]?.l ?? null;
  // Lists are capped; the count is exact.
  const hereTotal = useAppStore((state) => lesson === null ? others.length : Math.max(others.length, (state.socialCounts[lesson]?.n ?? 0) - (countedIn(state, lesson) ? 1 : 0)));

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  if (race) {
    // In a party the header shows who is in it; new party chat lines ride as the chat bubble on their corner.
    const party = race.players.filter((player) => !player.left && player.id !== me);
    return (
      <button type="button" aria-label={`${party.length ? `${party.length} in your party` : 'Party'}${partyChatUnread > 0 ? `, ${partyChatUnread} new ${partyChatUnread === 1 ? 'message' : 'messages'}` : ''}. Open party chat.`}
        onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'partyChat' } })}
        className={`relative mr-1 flex h-11 items-center rounded-control pl-1.5 outline-none transition-colors hover:bg-ui-hover focus-ring ${partyChatUnread > 0 ? 'pr-3.5' : 'pr-1.5'}`}>
        <span className="relative flex">
          {party.length
            ? <AvatarStack people={party.map((player) => ({ name: player.name, color: socialColor(player.color), src: player.image }))} total={party.length} max={3} size="md" />
            : <AppIcon name="party" size={22} className="text-ui-muted-strong" />}
          {partyChatUnread > 0 && <span className="absolute -right-3 -top-2.5 z-10 flex"><UnreadBadge count={partyChatUnread} edge="var(--color-ui-practice-canvas)" /></span>}
        </span>
      </button>
    );
  }
  if (others.length === 0) return <GlobalPresenceButton />;
  const phrase = (index: number) => {
    const to = others.map((person) => person.u);
    setSent(index);
    lobby.cheer(to, index);
    window.setTimeout(() => { setOpen(false); setSent(null); }, 650);
  };
  const lastLine = [...chat].reverse().find((line) => line.u !== me && !line.r);
  const openOnline = () => { setOpen(false); useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online' } }); };
  const openChat = () => { setOpen(false); useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'chat' } }); };
  return (
    <div ref={root} className="relative mr-1">
      {/* Quiet like the other header controls: faces, with the new-message chat bubble on their corner (still while studying). */}
      <button
        type="button"
        aria-label={`${others.length} studying with you${unread > 0 ? `, ${unread} new ${unread === 1 ? 'message' : 'messages'}` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`relative flex h-11 items-center rounded-control pl-1.5 outline-none transition-colors hover:bg-ui-hover focus-ring ${unread > 0 ? 'pr-3.5' : 'pr-1.5'} ${open ? 'bg-ui-hover' : ''}`}
      >
        <span className="relative flex">
          <AvatarStack people={others.map((person) => ({ name: person.n, color: person.c, src: person.i }))} total={others.length} max={3} size="md" />
          {unread > 0 && <span className="absolute -right-3 -top-2.5 z-10 flex"><UnreadBadge count={unread} edge="var(--color-ui-practice-canvas)" /></span>}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-3 top-[calc(var(--size-window-header)+env(safe-area-inset-top,0px)+0.5rem)] z-popover w-[21rem] max-w-[calc(100vw-1.5rem)] md:right-6 rounded-feature border-2 border-ui-divider bg-ui-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-ui-ink-strong">Studying with you</span>
              <MuteButton />
            </div>
            <div className="mt-1">
              {others.slice(0, 3).map((person) => <PersonRow key={person.u} person={person} lesson={lesson} />)}
              {(hereTotal > 3 || onlineTotal > hereTotal) && (
                <button type="button" onClick={openOnline} className="-mx-1 mt-1 flex items-center gap-1.5 rounded-compact px-1 py-1 text-sm font-extrabold text-ui-muted outline-none transition-colors hover:text-ui-ink focus-ring-inline">
                  {hereTotal > 3 && <span>+{hereTotal - 3} more here</span>}
                  {hereTotal > 3 && onlineTotal > hereTotal && <span aria-hidden>·</span>}
                  {onlineTotal > hereTotal && <><span className="h-2 w-2 rounded-full bg-feedback-success" />{onlineTotal} online</>}
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {CHEER_PHRASES.slice(0, 2).map((text, index) => (
                <ActionButton key={text} size="sm" variant="secondary" onClick={() => phrase(index)}
                  className={`font-chinese font-bold normal-case tracking-normal ${sent === index ? '!text-ui-muted' : ''}`}>
                  {sent === index ? '已送出' : text}
                </ActionButton>
              ))}
            </div>
            {/* One chat entry: the latest line, opening the class chat. */}
            <button
              type="button"
              onClick={openChat}
              className={`mt-3 flex w-full items-center gap-3 rounded-control border-2 px-3 py-2.5 text-left outline-none transition-colors focus-ring border-ui-divider hover:bg-ui-hover`}
            >
              {lastLine ? <Avatar name={lastLine.n} color={lastLine.c} size="md" src={linePhoto(lastLine, saved)} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ui-hover text-ui-muted-strong"><AppIcon name="chat" size={20} /></span>}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-black text-ui-ink-strong">
                  Chat{unread > 0 && <UnreadBadge count={unread} />}
                </span>
                <span className="block truncate font-chinese text-sm font-bold text-ui-muted-strong">
                  {lastLine ? <><span className="font-black text-ui-ink">{lastLine.n}</span> {lastLine.t}</> : 'Say hi to everyone'}
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
