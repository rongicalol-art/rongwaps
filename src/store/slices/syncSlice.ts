import type { SRSData } from '../../utils/srs/srsEngine';

/**
 * Where the last successful pull for one user left off: the server cursor and
 * the SRS state known to be on the server (the upload delta baseline). Both
 * are persisted — a cursor without its baseline would make the first save
 * after a cold load re-upload every card that was not part of the incremental
 * pull. Scoped to a user so another account never inherits it.
 */
export interface SyncCheckpoint {
  userId: string;
  cursor: string | null;
  srs: Record<string, SRSData>;
}

export interface SyncState {
  lastCloudUpdate: string | null;
  setLastCloudUpdate: (ts: string | null) => void;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  setSyncStatus: (status: SyncState['syncStatus']) => void;
  syncError: string | null;
  setSyncError: (error: string | null) => void;
  syncCheckpoint: SyncCheckpoint | null;
  setSyncCheckpoint: (checkpoint: SyncCheckpoint | null) => void;
}

/** Cloud-sync status values, for consumers that render the sync surface. */
export type SyncStatus = SyncState['syncStatus'];

type SetState = (partial: Partial<SyncState> | ((state: SyncState) => Partial<SyncState>)) => void;

export function createSyncSlice(set: SetState): SyncState {
  return {
    lastCloudUpdate: null,
    setLastCloudUpdate: (ts) => set({ lastCloudUpdate: ts }),
    syncStatus: 'idle',
    setSyncStatus: (status) => set({ syncStatus: status }),
    syncError: null,
    setSyncError: (error) => set({ syncError: error }),
    syncCheckpoint: null,
    setSyncCheckpoint: (checkpoint) => set({ syncCheckpoint: checkpoint }),
  };
}

/** Persisted slices owned by this domain. */
export const SYNC_PERSISTED_KEYS = ['syncCheckpoint'] as const;

/** Keys this domain clears when the signed-in account changes. */
export const SYNC_ACCOUNT_SWITCH_DEFAULTS = {
  lastCloudUpdate: null,
  // Sync status and its user-facing message describe the previous account's
  // last attempt; the new account must not inherit its error banner.
  syncStatus: 'idle',
  syncError: null,
  // The pull cursor and upload baseline belong to the previous account.
  syncCheckpoint: null,
};
