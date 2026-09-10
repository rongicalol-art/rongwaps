export interface UserSnapshot {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthState {
  currentUser: UserSnapshot | null;
  setCurrentUser: (user: UserSnapshot | null) => void;
  /**
   * Persisted owner of the locally cached progress. Used by the sync layer to
   * detect account switches that survive page reloads (e.g. OAuth redirects),
   * so one user's cached SRS data is never merged into or uploaded to
   * another user's account.
   */
  lastActiveUserId: string | null;
  setLastActiveUserId: (userId: string | null) => void;
}

/** Slice factory — `set` covers the whole AppState (single-store composition). */
type SetState = (partial: Partial<UserSnapshotHolder> | ((state: UserSnapshotHolder) => Partial<UserSnapshotHolder>)) => void;
interface UserSnapshotHolder {
  currentUser: UserSnapshot | null;
  setCurrentUser: (user: UserSnapshot | null) => void;
  lastActiveUserId: string | null;
  setLastActiveUserId: (userId: string | null) => void;
}

export function createAuthSlice(set: SetState): AuthState {
  return {
    currentUser: null,
    setCurrentUser: (user) => set({ currentUser: user }),
    lastActiveUserId: null,
    setLastActiveUserId: (userId) => set({ lastActiveUserId: userId }),
  };
}

/** Persisted slices owned by this domain. */
export const AUTH_PERSISTED_KEYS = ['lastActiveUserId'] as const;

/** Keys this domain clears when the signed-in account changes. */
export const AUTH_ACCOUNT_SWITCH_DEFAULTS = {};
