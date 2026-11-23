import { supabase } from './supabaseClient';
import { parseChallengeLink, type ChallengeLink } from '../../shared/challenge';
import type { RaceSelection } from '../../shared/quizRace';
import type { Json } from '../types/database';

/** Challenge links (supabase/migrations/20261123130000_challenges.sql). */

/** Stores a finished run under `code`; the link is already on its way, so this only reports failure. */
export async function saveChallenge(code: string, selection: RaceSelection, correct: number, total: number, run: number[]): Promise<void> {
  const { error } = await supabase.rpc('create_challenge', {
    p_code: code, p_selection: selection as unknown as Json, p_correct: correct, p_total: total, p_run: run,
  });
  if (error) throw error;
}

/** The challenge behind a link, or null when it ended, never existed, or its sender can't be shown. */
export async function loadChallenge(code: string): Promise<ChallengeLink | null> {
  const { data, error } = await supabase.rpc('challenge_card', { p_code: code });
  if (error) throw error;
  return parseChallengeLink(code, data);
}

/** One tap: 'friends', or 'requested' when this link already made its friends (the sender then accepts). */
export async function befriendChallenger(code: string): Promise<'friends' | 'requested'> {
  const { data, error } = await supabase.rpc('accept_challenge_friend', { p_code: code });
  if (error) throw error;
  return data === 'requested' ? 'requested' : 'friends';
}
