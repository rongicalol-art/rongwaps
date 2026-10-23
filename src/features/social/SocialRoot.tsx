import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import type { ActivityType } from '../../types/models';
import { InviteToast, CheerToast } from './components/SocialToasts';
import { ChallengePanel, PeoplePanel } from './components/SocialPanels';
import { RoomWindow } from './components/RoomWindow';
import { joinRace, leaveRace, restoreRace, setRaceLauncher } from './raceController';
import { useSocialIdentity, useSocialLifecycle } from './useSocialLifecycle';
import { Drawer } from '../../lib/widgets';
import { PartyChatThread } from './components/ChatThread';

/**
 * Study together, mounted by the app shell after first idle (its own chunk). Owns the Lobby lifecycle and the
 * social overlays; screens only read the store.
 */
export default function SocialRoot({ setActiveActivity }: { setActiveActivity: (activity: ActivityType) => void }) {
  useSocialLifecycle();
  const identity = useSocialIdentity();
  const panel = useAppStore((state) => state.socialPanel);
  const race = useAppStore((state) => state.race);
  const racePlaying = useAppStore((state) => state.racePlaying);
  const activity = useAppStore((state) => state.activeActivity);
  const [params, setParams] = useSearchParams();
  const roomCode = params.get('room');
  const userId = useAppStore(state => state.currentUser?.id ?? null);
  const lifecycle = useRef({ version: 0 });
  const account = useRef(userId);

  // A race opens the existing mixed quiz on the room's lessons and parts (Book 1 during the beta).
  useEffect(() => {
    const owner = lifecycle.current;
    const version = ++owner.version;
    if (account.current !== userId) leaveRace();
    account.current = userId;
    setRaceLauncher({
      start: () => {
        const store = useAppStore.getState();
        // The activity consumes the room's selection directly; personal deck/preferences stay intact.
        // Bypass normal saved-quiz interception: this room owns a fresh session key.
        store.setActiveActivity('quiz');
      },
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
      {race && !racePlaying && <RoomWindow key={`${race.code}:${race.round}`} race={race} />}
      {panel?.kind === 'people' && <PeoplePanel panel={panel} />}
      {panel?.kind === 'challenge' && <ChallengePanel panel={panel} />}
      {panel?.kind === 'partyChat' && race && <Drawer isOpen onClose={() => useAppStore.getState().setSocial({ socialPanel: null })} title={<Drawer.Title>Party chat</Drawer.Title>} tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full" contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4"><PartyChatThread /></Drawer>}
    </>
  );
}
