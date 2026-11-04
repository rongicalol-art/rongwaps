import { supabase } from './supabaseClient';

/** Someone this learner blocked, with the name and colour they had then (the Settings list shows them). */
export interface BlockedPerson { u: string; n: string; c: string }
export type ReportReason = 'spam' | 'rude' | 'unsafe' | 'other';
export type ReportPlace = 'profile' | 'chat' | 'party';

/** Blocks and reports for Study together (supabase/migrations/20261104130000_blocks_and_reports.sql). */
export const safetyService = {
  listBlocks: async (): Promise<BlockedPerson[]> => {
    const { data, error } = await supabase.from('user_blocks').select('blocked, blocked_name, blocked_color').order('created_at');
    if (error) throw error;
    return (data ?? []).map(row => ({ u: row.blocked, n: row.blocked_name, c: row.blocked_color }));
  },
  block: async (person: BlockedPerson): Promise<void> => {
    const { error } = await supabase.rpc('block_user', { p_user: person.u, p_name: person.n, p_color: person.c });
    if (error) throw error;
  },
  unblock: async (u: string): Promise<void> => {
    const { error } = await supabase.from('user_blocks').delete().eq('blocked', u);
    if (error) throw error;
  },
  report: async (target: string, reason: ReportReason, place: ReportPlace, message?: string): Promise<void> => {
    const { error } = await supabase.rpc('report_user', { p_target: target, p_reason: reason, p_place: place, p_message: message ?? null });
    if (error) throw error;
  },
};
