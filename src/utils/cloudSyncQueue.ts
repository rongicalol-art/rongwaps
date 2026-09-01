import type { SRSData } from './srsEngine';

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

export interface SyncedFolderSnapshot {
  id: string;
  name: string;
  color: string;
}

/** True when the array is element-wise identical (order matters). */
export function isSameStringArray(
  synced: string[] | null,
  current: string[],
): boolean {
  if (!synced) return false;
  if (synced.length !== current.length) return false;
  return synced.every((value, index) => value === current[index]);
}

/** True when the folder list is identical (id + name + color, order matters). */
export function isSameFolderList(
  synced: SyncedFolderSnapshot[] | null,
  current: SyncedFolderSnapshot[],
): boolean {
  if (!synced) return false;
  if (synced.length !== current.length) return false;
  return synced.every((folder, index) => {
    const other = current[index];
    return (
      other !== undefined
      && folder.id === other.id
      && folder.name === other.name
      && folder.color === other.color
    );
  });
}

export interface FolderSyncPlan {
  /** Local folders to upsert — never a tombstoned (deleted) folder. */
  toUpsert: SyncedFolderSnapshot[];
  /** Remote ids to delete: deleted locally, or explicitly tombstoned. */
  toDelete: string[];
}

/**
 * Plan a folder set-sync from the local list, the sticky delete tombstones,
 * and the server's current ids.
 *
 * Tombstones make deletes durable: a folder the user deleted stays deleted
 * even when a stale local copy (persisted IndexedDB state on another tab or
 * device, or a reload between the delete and the debounced save) still lists
 * it — the upsert must never re-create a tombstoned row, and the server row
 * keeps getting deleted until it is gone.
 */
export function planFolderSync(
  localFolders: SyncedFolderSnapshot[],
  tombstoneIds: string[],
  remoteIds: string[],
): FolderSyncPlan {
  const tombstones = new Set(tombstoneIds);
  const localIds = new Set(localFolders.map((folder) => folder.id));
  return {
    toUpsert: localFolders.filter((folder) => !tombstones.has(folder.id)),
    toDelete: remoteIds.filter(
      (id) => !localIds.has(id) || tombstones.has(id),
    ),
  };
}

/**
 * Drop tombstones the server has acknowledged (the folder id no longer
 * exists remotely). Ids still present on the server are kept — their delete
 * is still pending and must be retried.
 */
export function pruneAcknowledgedTombstones(
  tombstoneIds: string[],
  serverFolderIds: string[],
): string[] {
  const serverIds = new Set(serverFolderIds);
  return tombstoneIds.filter((id) => serverIds.has(id));
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

export const AUTO_SAVE_DEBOUNCE_MS = 10_000;
export const AUTO_SAVE_MAX_WAIT_MS = 45_000;
/** Floor so a burst of changes right at the deadline still coalesces a beat. */
const AUTO_SAVE_MIN_DELAY_MS = 250;

export interface AutoSaveDelayInput {
  /** Timestamp of the oldest change not yet acknowledged by a save; null when clean. */
  dirtySinceMs: number | null;
  nowMs: number;
  backoffMs?: number;
}

/**
 * Delay for the next debounced auto-save. Normally the trailing debounce
 * window (plus any error backoff), but continuous activity resets a plain
 * debounce forever — a learner answering a card every few seconds would never
 * persist until tab-hide, which mobile browsers can skip. Once the oldest
 * unsaved change reaches max-wait age, fire at that deadline. Error backoff
 * is always respected so a failing endpoint is never hammered early.
 */
export function getNextAutoSaveDelay(input: AutoSaveDelayInput): number {
  const backoffMs = Math.max(0, input.backoffMs ?? 0);
  if (input.dirtySinceMs == null) return AUTO_SAVE_DEBOUNCE_MS + backoffMs;

  const unsavedForMs = Math.max(0, input.nowMs - input.dirtySinceMs);
  const remainingUntilMaxWaitMs = Math.max(0, AUTO_SAVE_MAX_WAIT_MS - unsavedForMs);
  const eagerDelayMs = Math.min(
    AUTO_SAVE_DEBOUNCE_MS,
    Math.max(AUTO_SAVE_MIN_DELAY_MS, remainingUntilMaxWaitMs),
  );
  // Error backoff always wins so a failing endpoint is never hammered early.
  return Math.max(backoffMs, eagerDelayMs);
}

function sameSrsData(
  a: SRSData | undefined,
  b: SRSData | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.efactor === b.efactor
    && a.interval === b.interval
    && a.repetition === b.repetition
    && a.nextReviewDate === b.nextReviewDate
  );
}

export interface PulledSrsMergeInput {
  /**
   * Last SRS state known to be persisted on the server (the delta baseline)
   * before this pull. Null on the first-ever sync.
   */
  priorBaseline: Record<string, SRSData> | null;
  /** Store snapshot captured when the pull request started. */
  atPullStart: Record<string, SRSData>;
  /** Store snapshot at merge time — may include reviews made during the pull. */
  current: Record<string, SRSData>;
  /** Rows returned by the pull (server truth for those cards). */
  cloud: Record<string, SRSData>;
}

export interface PulledSrsMergeResult {
  /** What the store should hold after merging the pull. */
  merged: Record<string, SRSData>;
  /** New server-truth baseline for computing the next upload delta. */
  baseline: Record<string, SRSData>;
}

/**
 * Merge an incremental cloud pull into the local SRS map without losing
 * reviews made while the pull was in flight.
 *
 * The old merge (`{...local, ...cloud}`) let stale server rows overwrite
 * locally newer reviews AND folded those stale values into the delta baseline,
 * so the lost review was never re-uploaded either. Now:
 * - merged: keys the user changed during the pull window keep their local value;
 *   everything else follows the server.
 * - baseline: prior known-synced state overlaid with pulled rows only — never
 *   with unsent local values — so locally-changed keys stay "dirty" and the
 *   next save uploads them.
 */
export function mergePulledSrsData(
  input: PulledSrsMergeInput,
): PulledSrsMergeResult {
  const { priorBaseline, atPullStart, current, cloud } = input;

  // Server truth: what we already knew was synced, plus everything just pulled.
  const baseline: Record<string, SRSData> = { ...(priorBaseline ?? {}), ...cloud };

  // Locally changed during the pull window (new reviews count as changes).
  const locallyChangedKeys = new Set<string>();
  for (const [key, value] of Object.entries(current)) {
    if (!sameSrsData(atPullStart[key], value)) locallyChangedKeys.add(key);
  }

  // Start from local state (keeps brand-new local cards), overlay server rows,
  // then restore locally-changed keys so stale cloud rows cannot clobber them.
  const merged: Record<string, SRSData> = { ...current, ...cloud };
  for (const key of locallyChangedKeys) {
    const value = current[key];
    if (value) merged[key] = value;
  }

  return { merged, baseline };
}
