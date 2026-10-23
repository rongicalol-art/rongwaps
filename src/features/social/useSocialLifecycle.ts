import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { lessonKey } from '../../store/slices/socialSlice';
import { getSelectedLessonIds } from '../../utils/lesson/lessonPartSelection';
import { useProfileAvatar } from '../../hooks/useProfileAvatar';
import type { Activity } from '../../../shared/lobby';
import type { ActivityType } from '../../types/models';
import { lobby, startLobby, stopLobby } from './lobbyController';

const HIDDEN_CLOSE_MS = 30_000;

/** Self-chosen profile name, else the first word of the Google name; never the student id. */
export function useSocialIdentity() {
  const identity = useAppStore(useShallow((state) => ({
    name: state.displayName.trim() || (state.currentUser?.fullName ?? state.currentUser?.name ?? '').trim().split(/\s+/)[0] || 'Student',
    color: state.avatarColor,
  })));
  return { ...identity, image: useProfileAvatar() };
}

const ACTIVITY: Partial<Record<NonNullable<ActivityType>, Activity>> = { flashcards: 'cards', quiz: 'quiz', writing: 'writing', listening: 'quiz' };

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

  // Presence: only lesson and activity changes, never per card.
  const presence = useAppStore(useShallow((state) => {
    const activity = state.activeActivity;
    const book = state.activeBookId;
    const fromActivity = state.racePlaying && state.race ? Number(Object.keys(state.race.selection.lessons)[0]) : activity ? getSelectedLessonIds(state.selectedLessonParts, book)[0] : undefined;
    const lesson = fromActivity !== undefined ? lessonKey(state.racePlaying ? 1 : book, fromActivity) : state.socialViewingLesson;
    const a: Activity | null = state.racePlaying ? 'race' : activity ? ACTIVITY[activity] ?? 'lesson' : lesson !== null ? 'lesson' : null;
    return { lesson, a, show: state.showOnline, online: state.socialPanel?.tab === 'online' };
  }));
  useEffect(() => {
    lobby.here(presence.lesson, presence.a, presence.show, identity.image);
    // The current lesson's chat is followed so the unread dot and room cards arrive; Online only while open.
    lobby.subscribe(presence.online, presence.lesson);
  }, [presence, identity.image]);
}
