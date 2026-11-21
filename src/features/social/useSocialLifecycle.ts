import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useProfileAvatar } from '../../hooks/useProfileAvatar';
import { GLOBAL_CHAT } from '../../../shared/lobby';
import { isNameAllowed } from '../../../shared/nameFilter';
import { lobby, startLobby, stopLobby } from './lobbyController';
import { presenceFor } from './presence';
import { updateOpen } from './socialUpdate';
import { socialColor } from '../../../shared/quizRace';
import { loadBlocks } from './safety';

const HIDDEN_CLOSE_MS = 30_000;

/** Self-chosen profile name, else the first word of the Google name (if the name filter allows it); never the student id. */
export function useSocialIdentity() {
  const identity = useAppStore(useShallow((state) => {
    const googleFirst = (state.currentUser?.fullName ?? state.currentUser?.name ?? '').trim().split(/\s+/)[0];
    return {
      name: state.displayName.trim() || (googleFirst && isNameAllowed(googleFirst) ? googleFirst : 'Student'),
      color: state.avatarColor,
    };
  }));
  return { ...identity, image: useProfileAvatar() };
}

/** One Lobby socket while the app is visible; closed 30 s after the tab is hidden. */
export function useSocialLifecycle() {
  const identity = useSocialIdentity();
  const userId = useAppStore(state => state.currentUser?.id ?? null);
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      if (document.visibilityState === 'visible') startLobby({ name: identity.name, color: identity.color });
      else timer = setTimeout(stopLobby, HIDDEN_CLOSE_MS);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', sync); stopLobby(); };
  }, [identity.name, identity.color, userId]);

  // The block list loads once per account; the Lobby gets it on every connect.
  useEffect(() => { if (userId) void loadBlocks(userId); }, [userId]);

  // After the privacy update: keep this learner's saved profile (offline visits, "Seen 2 h ago") current while
  // they're connected; the switches in Settings decide what it holds.
  const live = useAppStore(state => state.socialStatus === 'live');
  const sharing = useAppStore(useShallow(state => [state.showProfile, state.showOnline]));
  useEffect(() => {
    if (!userId || !live || !updateOpen()) return;
    const save = () => {
      void Promise.all([import('./friendsController'), import('./profileCard')]).then(([friends, profile]) => {
        void friends.saveMyProfile({ n: identity.name, c: socialColor(identity.color), ...(identity.image ? { i: identity.image } : {}) }, profile.buildProfileCard);
      });
    };
    save();
    const timer = setInterval(save, 10 * 60_000);
    return () => clearInterval(timer);
  }, [userId, live, sharing, identity.name, identity.color, identity.image]);

  // The @username and "Let classmates find me" come from the database, so Settings and the profile show them even
  // when the Study together connection can't open.
  useEffect(() => {
    if (userId && updateOpen()) void import('./friendsController').then(friends => friends.ensureUsername(identity.name));
  }, [userId, identity.name]);

  // Presence: only lesson and activity changes, never per card.
  const presence = useAppStore(useShallow((state) => {
    const { lesson, a } = presenceFor(state);
    const panel = state.socialPanel;
    return { lesson, a, show: state.showOnline, online: panel?.kind === 'people' || panel?.kind === 'challenge' };
  }));
  useEffect(() => {
    lobby.here(presence.lesson, presence.a, presence.show, identity.image);
    // Everyone follows the class chat, so the new-message count is live on every screen; Online only while open.
    lobby.subscribe(presence.online, GLOBAL_CHAT);
  }, [presence, identity.image]);

  // The Online list is a snapshot: opening the panel brings one; switching to a list inside it asks again.
  const view = useAppStore(state => {
    const panel = state.socialPanel;
    return panel?.kind === 'people' || panel?.kind === 'challenge' ? `${panel.kind}:${panel.tab}` : null;
  });
  const previousView = useRef<string | null>(null);
  useEffect(() => {
    const opened = previousView.current === null;
    previousView.current = view;
    if (view && !opened && !view.endsWith(':rooms')) lobby.roster();
  }, [view]);

  // While a list is open, someone arriving or leaving changes the live count; ask for a fresh snapshot so the list
  // keeps up instead of showing "1 more online". Only open panels ask, and the controller spaces requests out.
  const listOpen = !!view && !view.endsWith(':rooms');
  const onlineTotal = useAppStore(state => state.socialOnlineTotal);
  const seenTotal = useRef<number | null>(null);
  useEffect(() => {
    if (!listOpen) { seenTotal.current = null; return; }
    if (seenTotal.current !== null && seenTotal.current !== onlineTotal) lobby.roster();
    seenTotal.current = onlineTotal;
  }, [listOpen, onlineTotal]);
}
