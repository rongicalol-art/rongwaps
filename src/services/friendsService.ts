import { supabase } from './supabaseClient';
import { getProfileMediaUrls } from './profileMedia';
import { socialColor, type SocialColor } from '../../shared/quizRace';
import type { ProfileCard } from '../../shared/lobby';
import type { Json } from '../types/database';

/** Someone in my friends list or requests: friends have both flags; a request to me only `addedMe`. */
export interface FriendPerson { u: string; n: string; c: SocialColor; iAdded: boolean; addedMe: boolean }
export interface DirectMessage { id: number; from: string; to: string; t: string; ts: number }
/** One conversation in the Chats list: its newest line and how many from the friend came after my read spot. */
export interface Conversation { u: string; lastId: number; lastFrom: string; last: string; at: number; unread: number }
/** The card a classmate last shared, for their profile while they're offline; `n`/`c`/`i` say who it is. */
/** `ia`/`ca`: they uploaded a photo / cover, which others load by a fresh link (never stored, links expire). */
export type StoredCard = Partial<ProfileCard> & { n?: string; c?: SocialColor; i?: string; ia?: 1; ca?: 1 };
/** `h`: their @username, when they can be found ("Let classmates find me"). */
export interface SavedProfile { u: string; card: StoredCard | null; seen: number | null; h?: string }
/** This learner's own @username and "Let classmates find me"; `chosenAt` is null while it is the automatic one. */
export interface MyUsername { name: string; findable: boolean; chosenAt: number | null }

/** Where the calls go: Supabase, or the DEV classmate simulator's stand-in. */
export interface FriendsBackend {
  people(): Promise<FriendPerson[]>;
  add(u: string): Promise<'friends' | 'requested'>;
  remove(u: string): Promise<void>;
  inbox(): Promise<Conversation[]>;
  thread(u: string, me: string, before?: number): Promise<DirectMessage[]>;
  send(u: string, text: string): Promise<DirectMessage>;
  read(u: string, id: number): Promise<void>;
  saveCard(card: StoredCard | null, seen: boolean): Promise<void>;
  profiles(us: string[]): Promise<SavedProfile[]>;
  recent(limit: number): Promise<SavedProfile[]>;
  /** Saved profiles whose name or @username contains `text`: an exact @username first, then the most recently online. */
  search(text: string): Promise<SavedProfile[]>;
  myUsername(me: string): Promise<MyUsername | null>;
  /** Makes one from `base` (a slug of their name) if they have none; returns theirs. */
  claimUsername(base: string): Promise<string>;
  setUsername(name: string): Promise<string>;
  setFindable(on: boolean): Promise<void>;
}

const PAGE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const time = (value: string | null | undefined) => (value ? Date.parse(value) : null);
const toMessage = (row: { id: number; sender: string; recipient: string; body: string; created_at: string }): DirectMessage =>
  ({ id: Number(row.id), from: row.sender, to: row.recipient, t: row.body, ts: Date.parse(row.created_at) });
const toProfile = (row: { user_id: string; card: unknown; last_seen: string | null }): SavedProfile =>
  ({ u: row.user_id, card: row.card && typeof row.card === 'object' ? row.card as StoredCard : null, seen: time(row.last_seen) });

/** Adds each @username; row security leaves out anyone who can't be found, and a failed lookup just shows none. */
/**
 * Uploaded photos and covers of saved profiles, as one-hour links made in one request; the storage rule lets anyone
 * signed in read them while the profile is shared (20261121140000). A file that can't be read just stays initials.
 */
async function withMedia(rows: SavedProfile[]): Promise<SavedProfile[]> {
  const paths = rows.flatMap(row => [...(row.card?.ia ? [`${row.u}/avatar.webp`] : []), ...(row.card?.ca ? [`${row.u}/cover.webp`] : [])]);
  if (!paths.length) return rows;
  const links = await getProfileMediaUrls(paths);
  return rows.map(row => {
    const photo = links.get(`${row.u}/avatar.webp`);
    const cover = links.get(`${row.u}/cover.webp`);
    return photo || cover ? { ...row, card: { ...row.card, ...(photo ? { i: photo } : {}), ...(cover ? { ci: cover } : {}) } } : row;
  });
}

async function withHandles(rows: SavedProfile[]): Promise<SavedProfile[]> {
  if (!rows.length) return rows;
  rows = await withMedia(rows);
  const { data } = await supabase.from('usernames').select('user_id, username').in('user_id', rows.map(row => row.u));
  const handles = new Map((data ?? []).map(row => [row.user_id, row.username]));
  return rows.map(row => (handles.has(row.u) ? { ...row, h: handles.get(row.u) } : row));
}

/** Friends, private messages and saved profiles (supabase/migrations/20261119170000_friends_and_messages.sql). */
const database: FriendsBackend = {
  async people() {
    const { data, error } = await supabase.rpc('friend_people');
    if (error) throw error;
    return ((data ?? []) as Array<{ user_id: string; name: string; color: string; i_added: boolean; added_me: boolean }>)
      .map(row => ({ u: row.user_id, n: row.name, c: socialColor(row.color), iAdded: row.i_added, addedMe: row.added_me }));
  },
  async add(u) {
    const { data, error } = await supabase.rpc('add_friend', { p_user: u });
    if (error) throw error;
    return data === 'friends' ? 'friends' : 'requested';
  },
  async remove(u) {
    const { error } = await supabase.rpc('remove_friend', { p_user: u });
    if (error) throw error;
  },
  async inbox() {
    const { data, error } = await supabase.rpc('direct_inbox');
    if (error) throw error;
    return ((data ?? []) as Array<{ other: string; last_id: number; last_sender: string; last_body: string; last_at: string; unread: number }>)
      .map(row => ({ u: row.other, lastId: Number(row.last_id), lastFrom: row.last_sender, last: row.last_body, at: Date.parse(row.last_at), unread: row.unread }));
  },
  async thread(u, me, before) {
    if (!UUID.test(u) || !UUID.test(me)) return [];
    let query = supabase.from('direct_messages').select('id, sender, recipient, body, created_at')
      .or(`and(sender.eq.${me},recipient.eq.${u}),and(sender.eq.${u},recipient.eq.${me})`)
      .order('id', { ascending: false }).limit(PAGE);
    if (before) query = query.lt('id', before);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toMessage).reverse();
  },
  async send(u, text) {
    const { data, error } = await supabase.rpc('send_direct_message', { p_to: u, p_body: text });
    if (error) throw error;
    return toMessage(data as Parameters<typeof toMessage>[0]);
  },
  async read(u, id) {
    const { error } = await supabase.rpc('mark_direct_read', { p_other: u, p_id: id });
    if (error) throw error;
  },
  async saveCard(card, seen) {
    const { error } = await supabase.rpc('save_profile_card', { p_card: card as Json | null, p_seen: seen });
    if (error) throw error;
  },
  async profiles(us) {
    const ids = us.filter(u => UUID.test(u)).slice(0, 100);
    if (!ids.length) return [];
    const { data, error } = await supabase.from('profile_cards').select('user_id, card, last_seen').in('user_id', ids);
    if (error) throw error;
    return withHandles((data ?? []).map(toProfile));
  },
  async recent(limit) {
    const { data, error } = await supabase.from('profile_cards').select('user_id, card, last_seen')
      .not('last_seen', 'is', null).order('last_seen', { ascending: false }).limit(limit);
    if (error) throw error;
    return withHandles((data ?? []).map(toProfile));
  },
  async search(text) {
    const { data, error } = await supabase.rpc('find_classmates', { p_text: text.slice(0, 40) });
    if (error) throw error;
    return withMedia((data ?? []).map(row => ({ ...toProfile(row), h: row.username })));
  },
  async myUsername(me) {
    if (!UUID.test(me)) return null;
    const { data, error } = await supabase.from('usernames').select('username, findable, chosen_at').eq('user_id', me).maybeSingle();
    if (error) throw error;
    return data ? { name: data.username, findable: data.findable, chosenAt: time(data.chosen_at) } : null;
  },
  async claimUsername(base) {
    const { data, error } = await supabase.rpc('claim_username', { p_base: base });
    if (error) throw error;
    return data;
  },
  async setUsername(name) {
    const { data, error } = await supabase.rpc('set_username', { p_name: name });
    if (error) throw error;
    return data;
  },
  async setFindable(on) {
    const { error } = await supabase.rpc('set_findable', { p_on: on });
    if (error) throw error;
  },
};

let backend: FriendsBackend = database;
/** DEV: the classmate simulator swaps in its own friends; null restores the database. */
export function setFriendsBackend(next: FriendsBackend | null) { backend = next ?? database; }

export const friendsService: FriendsBackend = {
  people: () => backend.people(),
  add: u => backend.add(u),
  remove: u => backend.remove(u),
  inbox: () => backend.inbox(),
  thread: (u, me, before) => backend.thread(u, me, before),
  send: (u, text) => backend.send(u, text),
  read: (u, id) => backend.read(u, id),
  saveCard: (card, seen) => backend.saveCard(card, seen),
  profiles: us => backend.profiles(us),
  recent: limit => backend.recent(limit),
  search: text => backend.search(text),
  myUsername: me => backend.myUsername(me),
  claimUsername: base => backend.claimUsername(base),
  setUsername: name => backend.setUsername(name),
  setFindable: on => backend.setFindable(on),
};
