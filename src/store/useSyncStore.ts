import { create } from 'zustand';

interface SyncState {
  lastCloudUpdate: string | null;
  setLastCloudUpdate: (ts: string | null) => void;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'success') => void;
  syncError: string | null;
  setSyncError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  lastCloudUpdate: null,
  setLastCloudUpdate: (ts) => set({ lastCloudUpdate: ts }),
  syncStatus: 'idle',
  setSyncStatus: (status) => set({ syncStatus: status }),
  syncError: null,
  setSyncError: (error) => set({ syncError: error }),
}));