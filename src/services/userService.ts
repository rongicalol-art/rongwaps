import { validReviewEvent, type ReviewEvent } from '../utils/srs/reviewEvents';
import { debugLogger } from '../utils/debug/debugLogger';
import { supabase } from './supabaseClient';
import { SRSData } from '../utils/srs/srsEngine';
import { rowsToProgress, srsDataToUpsert, type CardProgressRow } from '../utils/srs/srsRowMapping';
import type { CloudMetadataPayload } from '../utils/sync/cloudSyncTransforms';
import type { Json } from '../types/database';

export interface UserFolderRow {
  id: string;
  name: string;
  color: string;
}

/** Wire shape of the `get_sync_state` RPC (see 20261005 migration). */
interface SyncStateWire {
  cards: CardProgressRow[] | null;
  review_events?: ReviewEvent[] | null;
  cursor: string | null;
  profile: {
    updated_at: string | null;
    settings: Record<string, unknown> | null;
    /** Absent until the 20261007 migration is applied. */
    progress_reset_at?: string | null;
  } | null;
  folders: UserFolderRow[] | null;
}

export interface UserSyncState {
  reviewEvents: ReviewEvent[];
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  /** Synced preferences from `user_profiles.settings`; empty for a new account. */
  settings: Record<string, unknown>;
  folders: UserFolderRow[];
  /** Profile `updated_at`: last time settings were written from any device. */
  lastUpdated?: string;
  /** Epoch of the last server-side progress reset; undefined if never reset. */
  progressResetAt?: string;
  /**
   * True when the pull returned card rows. Lets the caller merge even when
   * the profile's updated_at is older — card updates don't touch it.
   */
  hasDelta: boolean;
  /**
   * Newest `last_updated` among the returned cards — a server-derived
   * watermark for incremental pulls. Undefined when no rows were returned.
   */
  cursor?: string;
}

/**
 * Incremental pulls restart slightly before the cursor. A row stamped before
 * the cursor can still become visible after a pull (its transaction committed
 * late), and re-sending the last couple of seconds is cheap and idempotent for the
 * merge.
 */
const PULL_OVERLAP_MS = 2_000;

/** Largest array the card RPC accepts per call (enforced server-side). */
const RPC_BATCH_SIZE = 500;

/** A `since` past every row, so a pull returns only the profile. */
const PROFILE_ONLY_SINCE = '9999-01-01T00:00:00.000Z';

function overlapWindowStart(cursorIso: string): string {
  const cursorMs = new Date(cursorIso).getTime();
  return Number.isNaN(cursorMs) ? cursorIso : new Date(cursorMs - PULL_OVERLAP_MS).toISOString();
}

export const userService = {
  // Pin each sync operation to its starting account, even if Auth switches
  // sessions while a request or a multi-batch upload is in flight.
  getSyncAuthorization: async (userId: string): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.user.id !== userId) throw new Error('Account changed during sync.');
    return `Bearer ${data.session.access_token}`;
  },
  syncReviewEvents: async (events: ReviewEvent[], authorization: string) => {
    for (let i = 0; i < events.length; i += RPC_BATCH_SIZE) {
      const { error } = await supabase.rpc('append_review_events', { p_events: events.slice(i, i + RPC_BATCH_SIZE) as unknown as Json })
        .setHeader('Authorization', authorization);
      if (error) throw error;
    }
  },
  // Everything the sync layer needs in one round trip: card rows (learned
  // flags included), profile settings and folders. Pass { since } to fetch
  // only card rows at/after that ISO timestamp (bounded incremental pull);
  // omit for a full pull.
  getSyncState: async (options?: { since?: string; authorization?: string }): Promise<UserSyncState> => {
    const request = supabase.rpc('get_sync_state', {
      p_since: options?.since ? overlapWindowStart(options.since) : null,
    });
    if (options?.authorization) request.setHeader('Authorization', options.authorization);
    const { data, error } = await request;
    if (error) {
      debugLogger.error('Supabase', 'Error fetching sync state:', error);
      throw error;
    }

    const wire = data as unknown as SyncStateWire;
    const cards = wire.cards ?? [];
    const { srsData, learnedCards } = rowsToProgress(cards);

    return {
      srsData,
      learnedCards,
      reviewEvents: (wire.review_events ?? []).filter(validReviewEvent),
      settings: wire.profile?.settings ?? {},
      folders: wire.folders ?? [],
      lastUpdated: wire.profile?.updated_at ?? undefined,
      progressResetAt: wire.profile?.progress_reset_at ?? undefined,
      hasDelta: cards.length > 0 || (wire.review_events?.length ?? 0) > 0,
      cursor: wire.cursor ?? undefined,
    };
  },

  // Save granular card progress through the batch RPC (server fills user_id
  // and last_updated from the JWT; last write wins by review time). Cards in
  // `learnedCards` carry `learned_at`. Errors propagate: the caller keeps the
  // changes dirty and retries.
  syncCardProgress: async (srsData: Record<string, SRSData>, learnedCards: string[], authorization: string) => {
    const learned = new Set(learnedCards);
    const upserts = Object.entries(srsData).map(
      ([cardId, data]) => srsDataToUpsert(data, cardId, learned.has(cardId)),
    );
    for (let i = 0; i < upserts.length; i += RPC_BATCH_SIZE) {
      const { error } = await supabase.rpc('upsert_card_progress', {
        p_records: upserts.slice(i, i + RPC_BATCH_SIZE),
      }).setHeader('Authorization', authorization);
      if (error) {
        debugLogger.error('Supabase', 'upsert_card_progress failed:', error);
        throw error;
      }
    }
  },

  // Persist the synced preferences on the profile row (not auth user_metadata,
  // which is embedded in every access token). Returns the server-stamped
  // `updated_at` (a trigger overwrites the client value; the client one only
  // matters before that migration is applied).
  syncSettings: async (userId: string, settings: CloudMetadataPayload, authorization: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        { id: userId, settings, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
      .select('updated_at')
      .setHeader('Authorization', authorization)
      .maybeSingle();
    if (error) {
      debugLogger.error('Supabase', 'Error syncing settings:', error);
      throw error;
    }
    return data?.updated_at ?? null;
  },

  // Delete only learning progress. Saved words, custom folders, and custom cards
  // deliberately remain intact. Resolves to the reset epoch the server stamped
  // (null if it cannot be read back — the next pull then applies it instead).
  resetLearningProgress: async (userId: string): Promise<string | null> => {
    const authorization = await userService.getSyncAuthorization(userId);
    const { error } = await supabase.rpc('reset_user_learning_progress').setHeader('Authorization', authorization);
    if (error) {
      debugLogger.error('Supabase', 'Learning progress reset failed:', error);
      throw error;
    }
    try {
      return await userService.getProgressResetAt(authorization);
    } catch (readError) {
      debugLogger.warn('Supabase', 'Could not read back the progress reset epoch:', readError);
      return null;
    }
  },

  // The server's current reset epoch (profile-only pull). The resetting device
  // records it so it does not wipe its own fresh state on the next pull.
  getProgressResetAt: async (authorization?: string): Promise<string | null> => {
    const state = await userService.getSyncState({ since: PROFILE_ONLY_SINCE, authorization });
    return state.progressResetAt ?? null;
  },

  // The server's current folder list (profile-only pull; no card rows).
  getFolders: async (): Promise<UserFolderRow[]> =>
    (await userService.getSyncState({ since: PROFILE_ONLY_SINCE })).folders,

  // Everything stored about the signed-in user (profile, folders, custom
  // cards, SRS progress incl. learned flags) as one JSON object for download.
  exportMyData: async (): Promise<Json> => {
    const { data, error } = await supabase.rpc('export_my_data');
    if (error) {
      debugLogger.error('Supabase', 'exportMyData failed:', error);
      throw error;
    }
    return data;
  },

  // Permanently deletes the signed-in user's account and, by cascade, all
  // their rows. The caller must sign out locally afterwards.
  deleteMyAccount: async (): Promise<void> => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      debugLogger.error('Supabase', 'deleteMyAccount failed:', error);
      throw error;
    }
  },
};
