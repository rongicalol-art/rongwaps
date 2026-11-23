/**
 * Study together: presence, the class chat, invites, the quiz race and challenge links. Everything live is ephemeral (rebuilt from the
 * games Worker on connect); only the learner's own choices (`showOnline`, `showProfile`, `socialMuted`) are persisted locally.
 */
import type { ChatMessage, LessonCount, Person, MentionNotice, ProfileCard } from '../../../shared/lobby';
import type { RaceRoomSummary, RaceSnapshot } from '../../../shared/quizRace';
import type { ChallengeLink } from '../../../shared/challenge';
import type { SocialStatus } from '../../services/socialService';
import type { BlockedPerson, ReportPlace } from '../../services/safetyService';
import type { Conversation, DirectMessage, FriendPerson, MyUsername, SavedProfile } from '../../services/friendsService';

/** The open report or block sheet; `report-done` offers to block after a report. */
export interface SafetyPrompt { kind: 'report' | 'report-done' | 'block'; person: BlockedPerson; place: ReportPlace; message?: string; messageId?: number; photo?: string }

export type SocialPanel =
  /** `thread`: an open conversation in Chats, 'class' or a friend's account id (after the privacy update). */
  | { kind: 'people'; tab: 'online' | 'chat'; thread?: string; visit?: Person }
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
  /** No cheer, invite or mention pop-ups and no new-message count (people and chat still update). */
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
  /** `more`: the Lobby has older class chat lines than these (after the privacy update). */
  socialChat: { lesson: number; messages: ChatMessage[]; more?: boolean } | null;
  /** Ephemeral private room messages and unread count; cleared when leaving or switching accounts. */
  socialPartyChat: { code: string; messages: ChatMessage[]; read: number; unread: number } | null;
  /** The last class chat line this account has seen (the Lobby keeps it per account; 0 = none). */
  socialChatRead: number;
  /** Class chat lines from others after the read spot, including ones not loaded yet. */
  socialChatUnread: number;
  /** Friends and friend requests (null until loaded; after the privacy update only). */
  socialFriends: FriendPerson[] | null;
  /** One row per private conversation, newest first. */
  socialInbox: Conversation[];
  /** Loaded private conversations by friend, oldest first; `more`: older lines exist. */
  socialThreads: Record<string, { messages: DirectMessage[]; more: boolean }>;
  /** Profiles classmates last shared, for visits while they're offline (null = none saved). */
  socialSaved: Record<string, SavedProfile | null>;
  /** Classmates seen recently, newest first (Online → Recently here). */
  socialRecent: SavedProfile[];
  /** This learner's @username and "Let classmates find me" (null until loaded). */
  socialUsername: MyUsername | null;
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
  /** A challenge link being played: the sender's run the ghost replays. Null when no challenge is open. */
  challenge: ChallengeLink | null;
  /** True while the challenge quiz is on screen. */
  challengePlaying: boolean;
  /** When the challenge's first question appeared: the ghost's clock starts here. */
  challengeStartedAt: number | null;
  /** The quiz session of this play: each opened challenge starts fresh, never resuming an earlier play. */
  challengeKey: string | null;
  /** Milliseconds this play's first pass took, once it is over (the ghost then steps aside). */
  challengeDoneMs: number | null;
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
  socialChatRead: 0,
  socialChatUnread: 0,
  socialFriends: null,
  socialInbox: [],
  socialThreads: {},
  socialSaved: {},
  socialRecent: [],
  socialUsername: null,
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
  challenge: null,
  challengePlaying: false,
  challengeStartedAt: null,
  challengeKey: null,
  challengeDoneMs: null,
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
    setSocialMuted: (socialMuted) => set({ socialMuted, ...(socialMuted ? { socialCheer: null, socialInvite: null, socialMentionToast: null } : {}) }),
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

/** Friend requests waiting for my answer. */
export const friendRequests = (state: Pick<SocialState, 'socialFriends'>) => (state.socialFriends ?? []).filter(person => person.addedMe && !person.iAdded);
/** New private messages across mutual-friend conversations shown in Chats. */
export function directUnread(state: Pick<SocialState, 'socialInbox' | 'socialFriends'>): number {
  if (!state.socialFriends) return 0;
  const mutual = new Set(state.socialFriends.filter(person => person.iAdded && person.addedMe).map(person => person.u));
  return state.socialInbox.reduce((sum, row) => sum + (mutual.has(row.u) ? row.unread : 0), 0);
}

/**
 * The number on the faces' chat bubble: new class chat lines, new private messages and friend requests —
 * strictly what appears inside Chats (party chat has its own badge in the room); none while muted.
 */
export function unreadTotal(state: Pick<SocialState, 'socialMuted' | 'socialChatUnread' | 'socialInbox' | 'socialFriends'>): number {
  if (state.socialMuted) return 0;
  return state.socialChatUnread + directUnread(state) + friendRequests(state).length;
}

/** Unread party chat lines in the current room; none while muted. */
export function partyUnread(state: Pick<SocialState, 'socialMuted' | 'race' | 'socialPartyChat'>): number {
  if (state.socialMuted || !state.race || state.socialPartyChat?.code !== state.race.code) return 0;
  return state.socialPartyChat.unread;
}

/** The lesson key the Lobby uses: book 1 lesson 4 → 104. */
export const lessonKey = (bookId: number, lessonId: number) => bookId * 100 + lessonId;
