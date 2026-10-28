/**
 * Study together: presence, lesson chat, invites and the quiz race. Everything live is ephemeral (rebuilt from the
 * games Worker on connect); only the learner's own choices (`showOnline`, `socialMuted`) are persisted locally.
 */
import type { ChatMessage, LessonCount, Person, MentionNotice } from '../../../shared/lobby';
import type { RaceRoomSummary, RaceSnapshot } from '../../../shared/quizRace';
import type { SocialStatus } from '../../services/socialService';

export type SocialPanel =
  | { kind: 'people'; tab: 'online' | 'chat' | 'party'; chatScope?: 'global' | 'lesson'; chatLesson?: number }
  | { kind: 'challenge'; tab: 'online' | 'rooms' }
  | { kind: 'partyChat' }
  | { kind: 'partyMention' }
  | null;

export interface SocialState {
  showOnline: boolean;
  setShowOnline: (show: boolean) => void;
  /** No cheer or invite pop-ups and no unread dot (people and chat still update). */
  socialMuted: boolean;
  setSocialMuted: (muted: boolean) => void;

  socialStatus: SocialStatus;
  socialMe: string | null;
  socialCounts: Record<string, LessonCount>;
  socialOnlineTotal: number;
  socialFaces: Person[];
  socialPeople: Person[];
  socialOnline: Person[];
  socialRooms: RaceRoomSummary[];
  socialChat: { lesson: number; messages: ChatMessage[] } | null;
  /** Ephemeral private room messages; cleared when leaving or switching accounts. */
  socialPartyChat: { code: string; messages: ChatMessage[] } | null;
  socialUnread: boolean;
  socialMentions: MentionNotice[];
  socialMentionToast: MentionNotice | null;
  socialMentionTarget: MentionNotice | null;
  socialReadingParty: string | null;
  socialInvite: { from: Person; room: RaceRoomSummary } | null;
  socialCheer: { from: Person; phrase: number; at: number } | null;
  /** Lesson key (`bookId * 100 + lessonId`) of the open lesson window, for presence. */
  socialViewingLesson: number | null;
  socialPanel: SocialPanel;
  race: RaceSnapshot | null;
  /** True while the race quiz is on screen (the room window steps aside). */
  racePlaying: boolean;
  raceStatus: SocialStatus;
  racePending: boolean;
  setSocial: (patch: Partial<Omit<SocialState, 'setSocial' | 'setShowOnline' | 'setSocialMuted'>>) => void;
}

type SetState = (patch: Partial<SocialState> | ((state: SocialState) => Partial<SocialState>)) => void;

const LIVE_DEFAULTS = {
  socialStatus: 'off' as SocialStatus,
  socialMe: null,
  socialCounts: {},
  socialOnlineTotal: 0,
  socialFaces: [],
  socialPeople: [],
  socialOnline: [],
  socialRooms: [],
  socialChat: null,
  socialPartyChat: null,
  socialUnread: false,
  socialMentions: [],
  socialMentionToast: null,
  socialMentionTarget: null,
  socialReadingParty: null,
  socialInvite: null,
  socialCheer: null,
  socialViewingLesson: null,
  socialPanel: null,
  race: null,
  racePlaying: false,
  raceStatus: 'off' as SocialStatus,
  racePending: false,
} satisfies Partial<SocialState>;

export function createSocialSlice(set: SetState): SocialState {
  return {
    showOnline: true,
    setShowOnline: (showOnline) => set({ showOnline }),
    socialMuted: false,
    setSocialMuted: (socialMuted) => set({ socialMuted, ...(socialMuted ? { socialUnread: false, socialCheer: null, socialInvite: null, socialMentionToast: null } : {}) }),
    ...LIVE_DEFAULTS,
    setSocial: (patch) => set(patch),
  };
}

export const SOCIAL_PERSISTED_KEYS = ['showOnline', 'socialMuted'] as const;
/** Live state belongs to the signed-in account. */
export const SOCIAL_ACCOUNT_SWITCH_DEFAULTS = { ...LIVE_DEFAULTS };

/** The lesson key the Lobby uses: book 1 lesson 4 → 104. */
export const lessonKey = (bookId: number, lessonId: number) => bookId * 100 + lessonId;
