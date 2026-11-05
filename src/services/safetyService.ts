import { authService } from './authService';
import { supabase } from './supabaseClient';

/** Someone this learner blocked, with the name and colour they had then (the Settings list shows them). */
export interface BlockedPerson { u: string; n: string; c: string }
export type ReportReason = 'spam' | 'rude' | 'unsafe' | 'other';
export type ReportPlace = 'profile' | 'chat' | 'party';
/** `message`/`messageId`: the reported line; `name`/`photo`: how the person looked when reported. */
export interface ReportInput { target: string; reason: ReportReason; place: ReportPlace; message?: string; messageId?: number; name?: string; photo?: string }

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
  /** Through the server (server/reports.ts), which emails "Not safe" reports to the owner at once. */
  report: async (report: ReportInput): Promise<void> => {
    const token = await authService.getAccessToken();
    if (!token) throw new Error('Sign in again.');
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      // Same shape as the database's own limit error, so callers show its message.
      throw Object.assign(new Error(body?.error ?? 'Report failed'), response.status === 429 && body?.error ? { code: '54000' } : {});
    }
  },
};
