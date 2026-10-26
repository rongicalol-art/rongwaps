import { supabase } from './supabaseClient';
import type { Database } from '../types/database';

type Functions = Database['public']['Functions'];
export type FolderInvite = Functions['get_folder_invite']['Returns'][number];
export type FolderMember = Functions['list_folder_members']['Returns'][number];

/** RLS handles table access; each privileged RPC also checks the school-beta gate. */
export const folderCollabService = {
  async createInvite(folderId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_folder_invite', { p_folder_id: folderId });
    if (error) throw error;
    return data;
  },
  async setRole(folderId: string, userId: string, role: 'viewer' | 'editor'): Promise<void> {
    const { error } = await supabase.rpc('set_folder_member_role', { p_folder_id: folderId, p_user_id: userId, p_role: role });
    if (error) throw error;
  },
  async getInvite(code: string): Promise<FolderInvite | null> {
    const { data, error } = await supabase.rpc('get_folder_invite', { p_code: code });
    if (error) throw error;
    return data?.[0] ?? null;
  },
  async join(code: string): Promise<string> {
    const { data, error } = await supabase.rpc('join_folder', { p_code: code });
    if (error) throw error;
    return data;
  },
  async leave(folderId: string): Promise<void> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error('Sign in required');
    const { error } = await supabase.from('folder_members').delete().match({ folder_id: folderId, user_id: auth.user.id });
    if (error) throw error;
  },
  async removeMember(folderId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_folder_member', { p_folder_id: folderId, p_user_id: userId });
    if (error) throw error;
  },
  async listMembers(folderId: string): Promise<FolderMember[]> {
    const { data, error } = await supabase.rpc('list_folder_members', { p_folder_id: folderId });
    if (error) throw error;
    return data ?? [];
  },
};
