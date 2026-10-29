import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import type { ActivityType } from '../../types/models';
import { InviteToast, CheerToast, MentionToast } from './components/SocialToasts';
import { ChallengePanel, PeoplePanel } from './components/SocialPanels';
import { RoomWindow } from './components/RoomWindow';
import { joinRace, leaveRace, restoreRace, setRaceLauncher } from './raceController';
import { useSocialIdentity, useSocialLifecycle } from './useSocialLifecycle';
import { Avatar, Drawer } from '../../lib/widgets';
import { CHAT_TTL_MS } from '../../../shared/lobby';
import { PartyChatThread } from './components/ChatThread';

/**
 * Study together, mounted by the app shell after first idle (its own chunk). Owns the Lobby lifecycle and the
 * social overlays; screens only read the store.
 */
export default function SocialRoot({ setActiveActivity, startRaceQuiz }: { setActiveActivity: (activity: ActivityType) => void; startRaceQuiz: () => void }) {
  // Read at race start; a ref keeps the launcher effect (and the room) from restarting when the shell re-renders.
  const startQuiz = useRef(startRaceQuiz);
  startQuiz.current = startRaceQuiz;
  useSocialLifecycle();
  const identity = useSocialIdentity();
  const panel = useAppStore((state) => state.socialPanel);
  const race = useAppStore((state) => state.race);
  const racePlaying = useAppStore((state) => state.racePlaying);
  const activity = useAppStore((state) => state.activeActivity);
  const [params, setParams] = useSearchParams();
  const roomCode = params.get('room');
  const userId = useAppStore(state => state.currentUser?.id ?? null);
  const mentionTarget = useAppStore(state => state.socialMentionTarget);
  const mentions = useAppStore(state => state.socialMentions);
  useEffect(() => {
    if (!mentions.length) return;
    const delay = Math.max(0, Math.min(...mentions.map(item => item.message.ts + CHAT_TTL_MS)) - Date.now());
    const timer = setTimeout(() => {
      const store = useAppStore.getState();
      const fresh = store.socialMentions.filter(item => Date.now() - item.message.ts < CHAT_TTL_MS);
      store.setSocial({ socialMentions: fresh, ...(store.socialMentionToast && !fresh.some(item => item.key === store.socialMentionToast?.key) ? { socialMentionToast: null } : {}), ...(store.socialMentionTarget && !fresh.some(item => item.key === store.socialMentionTarget?.key) ? { socialMentionTarget: null, ...(store.socialPanel?.kind === 'partyMention' ? { socialPanel: null } : {}) } : {}) });
    }, delay);
    return () => clearTimeout(timer);
  }, [mentions]);
  const lifecycle = useRef({ version: 0 });
  const account = useRef(userId);

  // A race opens the existing mixed quiz on the room's book, lessons and parts.
  useEffect(() => {
    const owner = lifecycle.current;
    const version = ++owner.version;
    if (account.current !== userId) leaveRace();
    account.current = userId;
    setRaceLauncher({
      // The quiz consumes the room's selection directly; personal deck/preferences stay intact, and the room's
      // fresh session key bypasses saved-quiz interception. Open reading/grammar windows close first.
      start: () => startQuiz.current(),
      stop: () => setActiveActivity(null),
    });
    if (userId && !roomCode) restoreRace(identity, userId);
    return () => { queueMicrotask(() => { if (version === owner.version) { leaveRace(); setRaceLauncher(null); } }); };
  }, [setActiveActivity, userId, identity, roomCode]);

  // Closing the quiz mid-race leaves the race (the others see "Left").
  const sawQuiz = useRef(false);
  useEffect(() => {
    if (!racePlaying) { sawQuiz.current = false; return; }
    if (activity === 'quiz') sawQuiz.current = true;
    else if (sawQuiz.current) leaveRace();
  }, [racePlaying, activity]);

  // Invite links: /?room=CODE joins that room once, then the parameter is dropped.
  useEffect(() => {
    if (!userId || !roomCode || !/^[A-Z2-9]{6}$/.test(roomCode)) return;
    void joinRace(identity, roomCode);
    setParams((prev) => { prev.delete('room'); return prev; }, { replace: true });
  }, [roomCode, identity, setParams, userId]);

  return (
    <>
      <InviteToast />
      <CheerToast />
      <MentionToast />
      {race && !racePlaying && <RoomWindow key={`${race.code}:${race.round}`} race={race} />}
      {panel?.kind === 'people' && <PeoplePanel panel={panel} />}
      {panel?.kind === 'challenge' && <ChallengePanel panel={panel} />}
      {panel?.kind === 'partyMention' && mentionTarget && <Drawer isOpen onClose={() => useAppStore.getState().setSocial({ socialPanel: null, socialMentionTarget: null })} title={<Drawer.Title>Party chat</Drawer.Title>} tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full"><div className="flex items-end gap-2.5 py-4"><Avatar name={mentionTarget.message.n} color={mentionTarget.message.c} src={mentionTarget.message.i} size="md" /><div><p className="text-sm font-black text-ui-ink">{mentionTarget.message.n}</p><p className="rounded-control border-2 border-brand-primary bg-ui-surface px-3.5 py-2 font-chinese font-bold text-ui-ink-strong">{mentionTarget.message.t}</p></div></div></Drawer>}
      {panel?.kind === 'partyChat' && race && <Drawer isOpen onClose={() => useAppStore.getState().setSocial({ socialPanel: null })} title={<Drawer.Title>Party chat</Drawer.Title>} tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full" contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4"><PartyChatThread /></Drawer>}
    </>
  );
}
