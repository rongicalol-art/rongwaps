import { useAppStore } from '../../store/useAppStore';
import { friendsService, type DirectMessage, type FriendPerson, type SavedProfile, type StoredCard } from '../../services/friendsService';
import type { MentionNotice, Person, ProfileCard } from '../../../shared/lobby';
import { DIRECT_KEY, isDirectNotice, lobby } from './lobbyController';
import { updateOpen } from './socialUpdate';

const RECENT = 30;
/** The Lobby's account id is the same as the signed-in user's (the DEV simulator has only the Lobby's). */
const me = () => useAppStore.getState().currentUser?.id ?? useAppStore.getState().socialMe;
const errorText = (error: unknown) => (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Something went wrong. Try again.');
const ready = () => updateOpen() && !!me();

/** The conversation on screen right now (Chats → a friend, app visible). */
function threadOnScreen(u: string) {
  const panel = useAppStore.getState().socialPanel;
  return panel?.kind === 'people' && panel.tab === 'chat' && panel.thread === u && document.visibilityState === 'visible';
}

export async function loadFriends() {
  if (!ready()) return;
  try { useAppStore.getState().setSocial({ socialFriends: await friendsService.people() }); } catch { /* Keeps the last list. */ }
}

/** The Chats list. New lines from a friend whose conversation isn't open get one card (like an @mention). */
export async function loadInbox(notify = false) {
  if (!ready()) return;
  let inbox;
  try { inbox = await friendsService.inbox(); } catch { return; }
  const store = useAppStore.getState();
  const before = new Map(store.socialInbox.map(row => [row.u, row]));
  store.setSocial({ socialInbox: inbox });
  if (!notify || store.socialMuted) return;
  const fresh = inbox.find(row => row.unread > 0 && row.lastFrom === row.u && row.lastId > (before.get(row.u)?.lastId ?? 0) && !threadOnScreen(row.u));
  const friend = fresh && store.socialFriends?.find(person => person.u === fresh.u);
  if (!fresh || !friend) return;
  const notice: MentionNotice = { key: `${DIRECT_KEY}${fresh.lastId}`, channel: -1, read: false, message: { id: fresh.lastId, l: -1, u: friend.u, n: friend.n, c: friend.c, t: fresh.last, ts: fresh.at } };
  store.setSocial({ socialMentionToast: notice });
}

const pinged = new Set<string>();
let reloading = false;
/** Pings that arrive while one reload runs share the next one, at most one a second. */
const PING_GAP_MS = 1000;

/** Someone changed something between us (a message, a request, an answer): reload what it could touch. */
export async function onPing(from: string) {
  pinged.add(from);
  if (reloading) return;
  reloading = true;
  try {
    while (pinged.size) {
      const froms = [...pinged];
      pinged.clear();
      await Promise.all([loadFriends(), loadInbox(true)]);
      for (const u of froms) if (threadOnScreen(u)) await loadThread(u);
      await new Promise(resolve => setTimeout(resolve, PING_GAP_MS));
    }
  } finally { reloading = false; }
}

/** The newest 50 lines of a conversation (or the 50 before the loaded ones), then marks them read if on screen. */
export async function loadThread(u: string, older = false) {
  const self = me();
  if (!ready() || !self) return;
  const current = useAppStore.getState().socialThreads[u];
  const before = older ? current?.messages[0]?.id : undefined;
  let page: DirectMessage[];
  try { page = await friendsService.thread(u, self, before); } catch { return; }
  const store = useAppStore.getState();
  const known = store.socialThreads[u]?.messages ?? [];
  const merged = older ? [...page, ...known] : [...known.filter(line => line.id < (page[0]?.id ?? Infinity)), ...page];
  store.setSocial({ socialThreads: { ...store.socialThreads, [u]: { messages: merged, more: older ? page.length === 50 : (current?.more ?? page.length === 50) } } });
}

export async function markThreadRead(u: string) {
  const store = useAppStore.getState();
  const last = store.socialThreads[u]?.messages.at(-1);
  const row = store.socialInbox.find(item => item.u === u);
  if (!last || !ready()) return;
  if (row?.unread) store.setSocial({ socialInbox: store.socialInbox.map(item => item.u === u ? { ...item, unread: 0 } : item) });
  const toast = store.socialMentionToast;
  if (toast && isDirectNotice(toast) && toast.message.u === u) store.setSocial({ socialMentionToast: null });
  if (row?.unread || (row && row.lastId > 0)) await friendsService.read(u, last.id).catch(() => {});
}

export async function sendDirect(u: string, text: string): Promise<boolean> {
  if (!ready()) return false;
  try {
    const sent = await friendsService.send(u, text);
    const store = useAppStore.getState();
    const thread = store.socialThreads[u] ?? { messages: [], more: false };
    const row = { u, lastId: sent.id, lastFrom: sent.from, last: sent.t, at: sent.ts, unread: 0 };
    store.setSocial({
      socialThreads: { ...store.socialThreads, [u]: { ...thread, messages: [...thread.messages.filter(line => line.id !== sent.id), sent] } },
      socialInbox: [row, ...store.socialInbox.filter(item => item.u !== u)],
    });
    lobby.dm(u);
    return true;
  } catch (error) {
    useAppStore.getState().showFeedbackToast(errorText(error));
    return false;
  }
}

/** Add friend, or accept their request (then you're friends). */
export async function addFriend(person: Pick<Person, 'u' | 'n' | 'c'>) {
  if (!ready()) return;
  try {
    const result = await friendsService.add(person.u);
    const store = useAppStore.getState();
    const others = (store.socialFriends ?? []).filter(item => item.u !== person.u);
    const entry: FriendPerson = { u: person.u, n: person.n, c: person.c, iAdded: true, addedMe: result === 'friends' };
    store.setSocial({ socialFriends: [...others, entry] });
    lobby.dm(person.u);
  } catch (error) {
    useAppStore.getState().showFeedbackToast(errorText(error));
  }
}

/** Unfriend, cancel my request, or say "Not now" to theirs. */
export async function removeFriend(u: string) {
  if (!ready()) return;
  const store = useAppStore.getState();
  store.setSocial({ socialFriends: (store.socialFriends ?? []).filter(item => item.u !== u) });
  try { await friendsService.remove(u); lobby.dm(u); } catch (error) { store.showFeedbackToast(errorText(error)); void loadFriends(); }
}

/** When each saved profile was fetched: it is asked for again after a while, since they may have been online since. */
const savedAt = new Map<string, number>();
const SAVED_FRESH_MS = 2 * 60_000;

/** Saved profiles for people who may be offline (their visit card and when they were last online). */
export async function loadSaved(us: string[]) {
  const now = Date.now();
  const known = useAppStore.getState().socialSaved;
  const stale = [...new Set(us)].filter(u => !(u in known) || now - (savedAt.get(u) ?? 0) >= SAVED_FRESH_MS);
  if (!ready() || !stale.length) return;
  for (const u of stale) savedAt.set(u, now);
  let rows: SavedProfile[] | null = null;
  try { rows = await friendsService.profiles(stale); } catch { for (const u of stale) savedAt.delete(u); }
  const saved = { ...useAppStore.getState().socialSaved };
  // If the request failed, someone never fetched shows without a card instead of loading forever; the next visit asks again.
  for (const u of stale) if (rows) saved[u] = rows.find(row => row.u === u) ?? null; else if (!(u in saved)) saved[u] = null;
  useAppStore.getState().setSocial({ socialSaved: saved });
}

const SEARCH_LIMIT = 20;
/**
 * Classmates whose name contains `text`, online or not: anyone who has opened Study together with Show me online or
 * Show my profile on (their saved card). null when the search failed. The cards found also fill the profile cache.
 */
export async function searchPeople(text: string): Promise<SavedProfile[] | null> {
  const self = me();
  if (!ready() || !self) return [];
  let rows: SavedProfile[];
  try { rows = await friendsService.search(text, SEARCH_LIMIT + 1); } catch { return null; }
  rows = rows.filter(row => row.u !== self && row.card?.n).slice(0, SEARCH_LIMIT);
  const now = Date.now();
  for (const row of rows) savedAt.set(row.u, now);
  const store = useAppStore.getState();
  store.setSocial({ socialSaved: { ...store.socialSaved, ...Object.fromEntries(rows.map(row => [row.u, row])) } });
  return rows;
}

export async function loadRecent() {
  if (!ready()) return;
  try {
    const rows = await friendsService.recent(RECENT);
    const store = useAppStore.getState();
    const now = Date.now();
    for (const row of rows) savedAt.set(row.u, now);
    store.setSocial({ socialRecent: rows, socialSaved: { ...store.socialSaved, ...Object.fromEntries(rows.map(row => [row.u, row])) } });
  } catch { /* Keeps the last list. */ }
}

let savedKey = '';
let mineSavedAt = 0;
const SAVE_EVERY_MS = 10 * 60_000;
/** Only a Google photo is a lasting address; profile photo links are signed (a password that expires). */
const GOOGLE_PHOTO = /^https:\/\/lh3\.googleusercontent\.com\//;
/**
 * Keeps this learner's saved profile current: who they are and their card while "Show my profile" is on, "last
 * seen" while "Show me online" is on; both off removes it. At most every 10 minutes unless something changed.
 */
export async function saveMyProfile(identity: Pick<Person, 'n' | 'c' | 'i'>, buildCard: () => Promise<ProfileCard | null>) {
  const store = useAppStore.getState();
  if (!ready() || document.visibilityState !== 'visible') return;
  const key = `${me()}|${store.showProfile}|${store.showOnline}|${identity.n}|${identity.c}|${identity.i ?? ''}`;
  const now = Date.now();
  if (key === savedKey && now - mineSavedAt < SAVE_EVERY_MS) return;
  savedKey = key; mineSavedAt = now;
  const who: StoredCard = { n: identity.n, c: identity.c, ...(identity.i && GOOGLE_PHOTO.test(identity.i) ? { i: identity.i } : {}) };
  try {
    const card = store.showProfile ? await buildCard() : null;
    const { ci: _cover, ...shared } = card ?? {};
    void _cover;
    const stored: StoredCard | null = card ? { ...shared, ...who } : store.showOnline ? who : null;
    await friendsService.saveCard(stored, store.showOnline);
  } catch { savedKey = ''; }
}
