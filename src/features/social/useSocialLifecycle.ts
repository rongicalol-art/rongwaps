import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useProfileAvatar } from '../../hooks/useProfileAvatar';
import { GLOBAL_CHAT } from '../../../shared/lobby';
import { isNameAllowed } from '../../../shared/nameFilter';
import { lobby, startLobby, stopLobby } from './lobbyController';
import { presenceFor } from './presence';
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

  // Presence: only lesson and activity changes, never per card.
  const presence = useAppStore(useShallow((state) => {
    const { lesson, a } = presenceFor(state);
    const panel = state.socialPanel;
    const chat = panel?.kind === 'people' && panel.tab === 'chat' ? panel.chatScope === 'global' ? GLOBAL_CHAT : panel.chatLesson ?? lesson ?? GLOBAL_CHAT : lesson;
    return { lesson, a, show: state.showOnline, online: panel?.kind === 'people' || panel?.kind === 'challenge', chat };
  }));
  useEffect(() => {
    lobby.here(presence.lesson, presence.a, presence.show, identity.image);
    // The current lesson's chat is followed so the unread dot and room cards arrive; Online only while open.
    lobby.subscribe(presence.online, presence.chat);
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
}
