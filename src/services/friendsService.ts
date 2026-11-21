import { supabase } from './supabaseClient';
import { socialColor, type SocialColor } from '../../shared/quizRace';
import type { ProfileCard } from '../../shared/lobby';
import type { Json } from '../types/database';

/** Someone in my friends list or requests: friends have both flags; a request to me only `addedMe`. */
export interface FriendPerson { u: string; n: string; c: SocialColor; iAdded: boolean; addedMe: boolean }
export interface DirectMessage { id: number; from: string; to: string; t: string; ts: number }
/** One conversation in the Chats list: its newest line and how many from the friend came after my read spot. */
export interface Conversation { u: string; lastId: number; lastFrom: string; last: string; at: number; unread: number }
/** The card a classmate last shared, for their profile while they're offline; `n`/`c`/`i` say who it is. */
export type StoredCard = Partial<ProfileCard> & { n?: string; c?: SocialColor; i?: string };
export interface SavedProfile { u: string; card: StoredCard | null; seen: number | null }

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
  /** Saved profiles whose name contains `text`, most recently online first. */
  search(text: string, limit: number): Promise<SavedProfile[]>;
}

const PAGE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const time = (value: string | null | undefined) => (value ? Date.parse(value) : null);
const toMessage = (row: { id: number; sender: string; recipient: string; body: string; created_at: string }): DirectMessage =>
  ({ id: Number(row.id), from: row.sender, to: row.recipient, t: row.body, ts: Date.parse(row.created_at) });
const toProfile = (row: { user_id: string; card: unknown; last_seen: string | null }): SavedProfile =>
  ({ u: row.user_id, card: row.card && typeof row.card === 'object' ? row.card as StoredCard : null, seen: time(row.last_seen) });

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
    return (data ?? []).map(toProfile);
  },
  async recent(limit) {
    const { data, error } = await supabase.from('profile_cards').select('user_id, card, last_seen')
      .not('last_seen', 'is', null).order('last_seen', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map(toProfile);
  },
  async search(text, limit) {
    // A name search over the saved cards (the same rows as offline profiles, so blocked pairs stay hidden). A few
    // hundred small rows: a plain scan is fast, no index needed. `*` is a wildcard to the API, and % _ \ to LIKE.
    const pattern = text.replace(/\*/g, '').replace(/[\\%_]/g, char => `\\${char}`).trim();
    if (!pattern) return [];
    const { data, error } = await supabase.from('profile_cards').select('user_id, card, last_seen')
      .ilike('card->>n', `%${pattern}%`).order('last_seen', { ascending: false, nullsFirst: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map(toProfile);
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
  search: (text, limit) => backend.search(text, limit),
};
