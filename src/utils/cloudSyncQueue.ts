export interface SyncProgressCounters {
  xpEarned: number;
  cardsReviewed: number;
  cardsLearned: number;
}

export interface AggregateProgressCounters {
  totalXp: number;
  totalCardsReviewed: number;
  totalCardsLearned: number;
}

export interface CloudSyncFingerprintState {
  srsData: unknown;
  learnedCards: string[];
  favorites: string[];
  activeBookId: number;
  characterPreference: string;
  sessionProgressIndex: Record<string, number>;
  activeTab: string;
  activeActivity: unknown;
  selectedLessons: number[];
  selectedBooks: number[];
  customFolders: unknown[];
  sessionProgress: SyncProgressCounters;
  lastActivity: string | null;
}

interface FingerprintedSnapshot<T> {
  fingerprint: string;
  value: T;
}

interface SingleFlightSaveCoordinator {
  request: () => Promise<void>;
}

export function createCloudSyncFingerprint(
  userId: string,
  state: CloudSyncFingerprintState,
): string {
  return JSON.stringify([
    userId,
    state.srsData,
    state.learnedCards,
    state.favorites,
    state.activeBookId,
    state.characterPreference,
    state.sessionProgressIndex,
    state.activeTab,
    state.activeActivity,
    state.selectedLessons,
    state.selectedBooks,
    state.customFolders,
    [
      state.sessionProgress.xpEarned,
      state.sessionProgress.cardsReviewed,
      state.sessionProgress.cardsLearned,
    ],
    state.lastActivity,
  ]);
}

export function createSingleFlightSaveCoordinator<T>(
  getSnapshot: () => FingerprintedSnapshot<T> | null,
  save: (snapshot: T) => Promise<void>,
): SingleFlightSaveCoordinator {
  let activeSave: Promise<void> | null = null;
  let lastSavedFingerprint: string | null = null;

  const drain = async () => {
    while (true) {
      const snapshot = getSnapshot();
      if (!snapshot || snapshot.fingerprint === lastSavedFingerprint) return;

      await save(snapshot.value);
      lastSavedFingerprint = snapshot.fingerprint;
    }
  };

  return {
    request: () => {
      if (activeSave) return activeSave;

      const pendingSave = drain();
      const trackedSave = pendingSave.finally(() => {
        if (activeSave === trackedSave) activeSave = null;
      });
      activeSave = trackedSave;
      return trackedSave;
    },
  };
}

function normalizedCounter(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getSessionProgressDelta(
  current: SyncProgressCounters,
  lastSynced: SyncProgressCounters,
): SyncProgressCounters {
  const delta = (currentValue: number, syncedValue: number) => {
    const normalizedCurrent = normalizedCounter(currentValue);
    const normalizedSynced = normalizedCounter(syncedValue);
    return normalizedCurrent >= normalizedSynced
      ? normalizedCurrent - normalizedSynced
      : normalizedCurrent;
  };

  return {
    xpEarned: delta(current.xpEarned, lastSynced.xpEarned),
    cardsReviewed: delta(current.cardsReviewed, lastSynced.cardsReviewed),
    cardsLearned: delta(current.cardsLearned, lastSynced.cardsLearned),
  };
}

export function hasSessionProgressDelta(delta: SyncProgressCounters): boolean {
  return delta.xpEarned > 0 || delta.cardsReviewed > 0 || delta.cardsLearned > 0;
}

export function reconcileAggregateProgress(
  cloud: AggregateProgressCounters,
  local: AggregateProgressCounters,
  savedSession: SyncProgressCounters,
  currentSession: SyncProgressCounters,
): AggregateProgressCounters {
  const pending = getSessionProgressDelta(currentSession, savedSession);

  return {
    totalXp: Math.max(local.totalXp, cloud.totalXp + pending.xpEarned),
    totalCardsReviewed: Math.max(
      local.totalCardsReviewed,
      cloud.totalCardsReviewed + pending.cardsReviewed,
    ),
    totalCardsLearned: Math.max(
      local.totalCardsLearned,
      cloud.totalCardsLearned + pending.cardsLearned,
    ),
  };
}

export function getNextCloudSyncBackoff(
  currentBackoffMs: number,
  error: unknown,
): number {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const minimumBackoff = status === 429 || message.includes('rate limit')
    ? 15_000
    : 5_000;

  if (currentBackoffMs <= 0) return minimumBackoff;
  return Math.min(60_000, Math.max(minimumBackoff, currentBackoffMs * 2));
}
