export interface SyncState {
  lastCloudUpdate: string | null;
  setLastCloudUpdate: (ts: string | null) => void;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  setSyncStatus: (status: SyncState['syncStatus']) => void;
  syncError: string | null;
  setSyncError: (error: string | null) => void;
}

type SetState = (partial: Partial<SyncState> | ((state: SyncState) => Partial<SyncState>)) => void;

export function createSyncSlice(set: SetState): SyncState {
  return {
    lastCloudUpdate: null,
    setLastCloudUpdate: (ts) => set({ lastCloudUpdate: ts }),
    syncStatus: 'idle',
    setSyncStatus: (status) => set({ syncStatus: status }),
    syncError: null,
    setSyncError: (error) => set({ syncError: error }),
  };
}

/** Persisted slices owned by this domain. */
export const SYNC_PERSISTED_KEYS = [] as const;

/** Keys this domain clears when the signed-in account changes. */
export const SYNC_ACCOUNT_SWITCH_DEFAULTS = {
  lastCloudUpdate: null,
};
