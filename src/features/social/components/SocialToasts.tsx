import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, Avatar } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { CHEER_PHRASES } from '../../../../shared/lobby';
import { joinRace } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { describeSelection } from '../socialText';
import { openMention } from '../lobbyController';

const INVITE_MS = 20_000;
const CHEER_MS = 2600;
/** Every social notice hangs just under the window header (progress bar, faces, menu), never over it. */
const BELOW_HEADER = 'top-[calc(var(--size-window-header)+env(safe-area-inset-top,0px)+0.75rem)]';
/** Beside the side panel (not over it) while one is open. */
const dock = (panelOpen: boolean) => `fixed z-popover right-3 ${BELOW_HEADER} ${panelOpen ? 'md:right-[28rem]' : 'md:right-6'}`;
const place = (panelOpen: boolean) => `${dock(panelOpen)} left-3 md:left-auto md:w-[24rem]`;
/** Quiet one-line notices (cheer, mention): the same card, corner and width. */
const noticeCard = (panelOpen: boolean) => `${dock(panelOpen)} flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-control border-2 border-ui-divider bg-ui-surface py-2 pl-2 pr-4 text-left md:max-w-[24rem]`;

/** A challenge drops in from the top (like a chess.com challenge): Join enters the host's room. */
export function InviteToast() {
  const invite = useAppStore((state) => state.socialInvite);
  const setSocial = useAppStore((state) => state.setSocial);
  const identity = useSocialIdentity();
  const panelOpen = useAppStore((state) => state.socialPanel !== null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!invite) return;
    const timer = setTimeout(() => setSocial({ socialInvite: null }), INVITE_MS);
    return () => clearTimeout(timer);
  }, [invite, setSocial]);
  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          key={invite.room.code}
          role="alertdialog"
          aria-label={`${invite.from.n} invited you to a quiz`}
          initial={reduce ? false : { opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className={`${place(panelOpen)} flex flex-col gap-3 rounded-feature border-2 border-b-[6px] border-ui-border bg-ui-surface p-4`}
        >
          <div className="flex items-center gap-3">
            <span className="relative">
              <Avatar name={invite.from.n} color={invite.from.c} size="lg" src={invite.from.i} />
              <span aria-hidden className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ui-inverse text-xs font-black text-ui-on-inverse ring-2 ring-ui-surface">?</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-ui-ink-strong">{invite.from.n} invited you to a quiz</span>
              <span className="block truncate text-sm font-bold text-ui-muted-strong">{describeSelection(invite.room.selection)}</span>
            </span>
          </div>
          <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-brand-primary-track">
            <motion.span
              className="block h-full rounded-full bg-brand-primary"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: INVITE_MS / 1000, ease: 'linear' }}
            />
          </span>
          <div className="flex gap-2.5">
            <ActionButton variant="secondary" size="md" fullWidth onClick={() => setSocial({ socialInvite: null })}>Decline</ActionButton>
            <ActionButton variant="primary" size="md" fullWidth onClick={() => { void joinRace(identity, invite.room.code); }}>Join</ActionButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A friend's cheer appears briefly and quietly. */
export function CheerToast() {
  const cheer = useAppStore((state) => state.socialCheer);
  const setSocial = useAppStore((state) => state.setSocial);
  const panelOpen = useAppStore((state) => state.socialPanel !== null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!cheer) return;
    const timer = setTimeout(() => setSocial({ socialCheer: null }), CHEER_MS);
    return () => clearTimeout(timer);
  }, [cheer, setSocial]);
  return (
    <AnimatePresence>
      {cheer && (
        <motion.div
          key={cheer.at}
          role="status"
          initial={reduce ? false : { opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={noticeCard(panelOpen)}
        >
          <Avatar name={cheer.from.n} color={cheer.from.c} size="sm" src={cheer.from.i} />
          <span className="text-sm font-black text-ui-ink-strong">{cheer.from.n}</span>
          <span className="font-chinese text-lg font-semibold text-ui-ink-strong">{CHEER_PHRASES[cheer.phrase]}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MentionToast() {
  const notice = useAppStore(state => state.socialMentionToast);
  const panelOpen = useAppStore(state => state.socialPanel !== null);
  const setSocial = useAppStore(state => state.setSocial);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setSocial({ socialMentionToast: null }), 6000);
    return () => clearTimeout(timer);
  }, [notice, setSocial]);
  if (!notice) return null;
  return <div role="status"><button type="button" onClick={() => openMention(notice)} className={`${noticeCard(panelOpen)} outline-none focus-ring`}>
    <Avatar name={notice.message.n} color={notice.message.c} size="sm" src={notice.message.i} />
    <span className="min-w-0"><span className="block font-black text-ui-ink-strong">{notice.message.n} mentioned you</span><span className="block truncate text-sm font-bold text-ui-muted-strong">{notice.room ? 'Party' : notice.channel === 0 ? 'Global' : `Lesson ${notice.channel % 100}`} · {notice.message.t}</span></span>
  </button></div>;
}
