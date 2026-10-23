import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, Avatar } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { CHEER_PHRASES } from '../../../../shared/lobby';
import { joinRace } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { describeSelection } from '../socialText';

const INVITE_MS = 20_000;
const CHEER_MS = 2600;
/** Beside the side panel (not over it) while one is open. */
const place = (panelOpen: boolean) => `fixed z-popover left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] md:left-auto md:w-[24rem] ${panelOpen ? 'md:right-[28rem]' : 'md:right-6'}`;

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
              <span aria-hidden className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ui-ink-strong text-xs font-black text-ui-surface ring-2 ring-ui-surface">?</span>
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
          className={`fixed z-popover right-4 top-[max(4.5rem,env(safe-area-inset-top))] flex items-center gap-2.5 rounded-control border-2 border-ui-divider bg-ui-surface py-2 pl-2 pr-4 ${panelOpen ? 'md:right-[28rem]' : 'md:right-8'}`}
        >
          <Avatar name={cheer.from.n} color={cheer.from.c} size="sm" src={cheer.from.i} />
          <span className="text-sm font-black text-ui-ink-strong">{cheer.from.n}</span>
          <span className="font-chinese-sans text-lg font-semibold text-ui-ink-strong">{CHEER_PHRASES[cheer.phrase]}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
