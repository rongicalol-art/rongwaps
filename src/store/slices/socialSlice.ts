/**
 * Study together: presence, lesson chat, invites and the quiz race. Everything live is ephemeral (rebuilt from the
 * games Worker on connect); only the learner's own choices (`showOnline`, `showProfile`, `socialMuted`) are persisted locally.
 */
import type { ChatMessage, LessonCount, Person, MentionNotice, ProfileCard } from '../../../shared/lobby';
import type { RaceRoomSummary, RaceSnapshot } from '../../../shared/quizRace';
import type { SocialStatus } from '../../services/socialService';
import type { BlockedPerson, ReportPlace } from '../../services/safetyService';

/** The open report or block sheet; `report-done` offers to block after a report. */
export interface SafetyPrompt { kind: 'report' | 'report-done' | 'block'; person: BlockedPerson; place: ReportPlace; message?: string; messageId?: number; photo?: string }

export type SocialPanel =
  | { kind: 'people'; tab: 'online' | 'chat'; chatScope?: 'global' | 'lesson'; chatLesson?: number; visit?: Person }
  | { kind: 'challenge'; tab: 'online' | 'rooms' }
  | { kind: 'partyChat' }
  | { kind: 'partyMention' }
  | null;

export interface SocialState {
  showOnline: boolean;
  setShowOnline: (show: boolean) => void;
  /** Whether classmates who visit see your cover and stats (otherwise only your name and photo). */
  showProfile: boolean;
  setShowProfile: (show: boolean) => void;
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
  /** Visit cards by account id; `null` = that classmate doesn't share theirs. */
  socialCards: Record<string, ProfileCard | null>;
  /** A classmate to @mention when the chat composer next opens. */
  socialMentionDraft: Person | null;
  socialCheer: { from: Person; phrase: number; at: number } | null;
  /** Lesson key (`bookId * 100 + lessonId`) of the open lesson window, for presence. */
  socialViewingLesson: number | null;
  /** Reading or grammar window open, with its lesson key: they are windows, not activities, so presence learns of them here. */
  socialStudying: { a: 'reading' | 'grammar' | 'test'; lesson: number } | null;
  /** The lesson this device reports while visible (null when hidden or outside a lesson); the server counts it. */
  socialHere: number | null;
  socialPanel: SocialPanel;
  race: RaceSnapshot | null;
  /** True while the race quiz is on screen (the room window steps aside). */
  racePlaying: boolean;
  raceStatus: SocialStatus;
  racePending: boolean;
  /** People this account blocked (from the database; null until loaded). The Lobby hides each pair from each other. */
  socialBlocks: BlockedPerson[] | null;
  socialSafety: SafetyPrompt | null;
  setSocial: (patch: Partial<Omit<SocialState, 'setSocial' | 'setShowOnline' | 'setShowProfile' | 'setSocialMuted'>>) => void;
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
  socialCards: {},
  socialMentionDraft: null,
  socialCheer: null,
  socialViewingLesson: null,
  socialStudying: null,
  socialHere: null,
  socialPanel: null,
  race: null,
  racePlaying: false,
  raceStatus: 'off' as SocialStatus,
  racePending: false,
  socialBlocks: null,
  socialSafety: null,
} satisfies Partial<SocialState>;

export function createSocialSlice(set: SetState): SocialState {
  return {
    showOnline: true,
    setShowOnline: (showOnline) => set({ showOnline }),
    showProfile: true,
    setShowProfile: (showProfile) => set({ showProfile }),
    socialMuted: false,
    setSocialMuted: (socialMuted) => set({ socialMuted, ...(socialMuted ? { socialUnread: false, socialCheer: null, socialInvite: null, socialMentionToast: null } : {}) }),
    ...LIVE_DEFAULTS,
    setSocial: (patch) => set(patch),
  };
}

export const SOCIAL_PERSISTED_KEYS = ['showOnline', 'showProfile', 'socialMuted'] as const;
/** Live state belongs to the signed-in account. */
export const SOCIAL_ACCOUNT_SWITCH_DEFAULTS = { ...LIVE_DEFAULTS };

/**
 * Whether the Lobby's current counts include me in `lesson`: I report it while visible, and its list for that
 * lesson has arrived (the counts in the same flush include me). Lists are capped, so I may not be in them.
 */
export function countedIn(state: Pick<SocialState, 'socialHere' | 'socialPeople' | 'socialMe'>, lesson: number | null): boolean {
  if (lesson === null) return false;
  return state.socialPeople.some(person => person.u === state.socialMe && person.l === lesson)
    || (state.socialHere === lesson && state.socialPeople.some(person => person.l === lesson));
}

/** The lesson key the Lobby uses: book 1 lesson 4 → 104. */
export const lessonKey = (bookId: number, lessonId: number) => bookId * 100 + lessonId;
