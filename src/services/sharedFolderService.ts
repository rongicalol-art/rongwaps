import { debugLogger } from '../utils/debug/debugLogger';
import { supabase } from './supabaseClient';
import type { Json } from '../types/database';
import type { SharedFolderPreview, UserFlashcard } from '../types/models';
import { flashcardsToSharedFolderJson, generateSharedFolderSlug, sharedFolderCardsFromJson } from '../utils/vocabulary/sharedFolderCards';

export interface SharedFolderMine {
  id: string;
  sourceFolderId: string;
  saveCount: number;
}

export const sharedFolderService = {
  publish: async (userId: string, folder: { id: string; name: string; color: string }, cards: UserFlashcard[]): Promise<string> => {
    if (cards.length > 500) throw new Error('A shared folder can contain up to 500 cards. Remove some cards before sharing.');
    const snapshot = flashcardsToSharedFolderJson(cards);
    if (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > 262144) {
      throw new Error('This folder snapshot is larger than the 256 KB sharing limit.');
    }

    const { data: existing, error: lookupError } = await supabase
      .from('shared_folders')
      .select('id')
      .eq('owner_id', userId)
      .eq('source_folder_id', folder.id)
      .maybeSingle();
    if (lookupError) {
      debugLogger.error('Supabase', 'Error finding shared folder', lookupError);
      throw lookupError;
    }

    const snapshotPatch = {
      name: folder.name,
      color: folder.color,
      cards: snapshot as unknown as Json,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      const { data, error } = await supabase
        .from('shared_folders')
        .update(snapshotPatch)
        .match({ id: existing.id, owner_id: userId })
        .select('id')
        .single();
      if (error) {
        debugLogger.error('Supabase', 'Error updating shared folder', error);
        throw error;
      }
      return data.id;
    }

    const { data, error } = await supabase.from('shared_folders').upsert({
      id: generateSharedFolderSlug(),
      owner_id: userId,
      source_folder_id: folder.id,
      ...snapshotPatch,
    }, { onConflict: 'source_folder_id', ignoreDuplicates: true }).select('id').maybeSingle();
    if (error) {
      debugLogger.error('Supabase', 'Error publishing shared folder', error);
      throw error;
    }
    if (data) return data.id;

    // A concurrent first publish won the unique source_folder_id race. Keep
    // that link and update its snapshot instead of replacing its slug.
    const { data: raced, error: racedError } = await supabase
      .from('shared_folders')
      .select('id')
      .eq('owner_id', userId)
      .eq('source_folder_id', folder.id)
      .single();
    if (racedError) {
      debugLogger.error('Supabase', 'Error finding concurrently published folder', racedError);
      throw racedError;
    }
    const { error: updateError } = await supabase
      .from('shared_folders')
      .update(snapshotPatch)
      .match({ id: raced.id, owner_id: userId });
    if (updateError) {
      debugLogger.error('Supabase', 'Error updating concurrent shared folder', updateError);
      throw updateError;
    }
    return raced.id;
  },

  unpublish: async (userId: string, shareId: string): Promise<void> => {
    const { error } = await supabase.from('shared_folders').delete().match({ id: shareId, owner_id: userId });
    if (error) {
      debugLogger.error('Supabase', 'Error stopping shared folder', error);
      throw error;
    }
  },

  listMine: async (userId: string): Promise<SharedFolderMine[]> => {
    const { data, error } = await supabase
      .from('shared_folders')
      .select('id, source_folder_id, save_count')
      .eq('owner_id', userId)
      .not('source_folder_id', 'is', null);
    if (error) {
      debugLogger.error('Supabase', 'Error listing shared folders', error);
      throw error;
    }
    return (data ?? []).flatMap((row) => row.source_folder_id
      ? [{ id: row.id, sourceFolderId: row.source_folder_id, saveCount: row.save_count }]
      : []);
  },

  get: async (shareId: string): Promise<SharedFolderPreview | null> => {
    const { data, error } = await supabase.rpc('get_shared_folder', { p_id: shareId });
    if (error) {
      debugLogger.error('Supabase', 'Error fetching shared folder', error);
      throw error;
    }
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      cards: sharedFolderCardsFromJson(row.cards),
      saveCount: row.save_count,
      ownerDisplayName: row.owner_display_name,
      updatedAt: row.updated_at,
    };
  },

  save: async (shareId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('save_shared_folder', { p_id: shareId });
    if (error) {
      debugLogger.error('Supabase', 'Error saving shared folder', error);
      throw error;
    }
    return data;
  },
};
