import type { SRSData } from './srsEngine';
import { isSameSrsData } from './srsRowMapping';

export interface CloudSyncFingerprintState {
  srsData: unknown;
  learnedCards: string[];
  favorites: string[];
  activeBookId: number;
  characterPreference: string;
  selectedLessons: number[];
  selectedBooks: number[];
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
    state.selectedLessons,
    state.selectedBooks,
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

export interface SyncedFolderSnapshot {
  id: string;
  name: string;
  color: string;
}

export interface LearnedCardsDelta {
  /** Ids present in the current list but not in the synced baseline, in
   * current-list order. */
  appended: string[];
  /** True when the current list lost baseline ids (progress reset) — the
   * caller must fall back to a full replace instead of an append. */
  shrank: boolean;
}

/**
 * Compute the append-only delta between the last synced learned-cards list
 * and the current one. A first-ever sync (null baseline) is a full replace.
 */
export function computeLearnedDelta(
  baseline: string[] | null,
  current: string[],
): LearnedCardsDelta {
  if (!baseline) return { appended: [], shrank: false };

  const baselineSet = new Set(baseline);
  const currentSet = new Set(current);
  const appended = current.filter((id) => !baselineSet.has(id));
  const shrank = current.length < baseline.length
    || baseline.some((id) => !currentSet.has(id));
  return { appended, shrank };
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

/** Review time that orders two versions of a card; 0 when unknown. */
function reviewTime(card: SRSData): number {
  return card.lastReviewedAt ?? 0;
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
 * - merged: per card, the newest review wins (`lastReviewedAt`; ties and
 *   unknown times follow the server). Keys the user changed during the pull
 *   window keep their local value regardless.
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
    if (!isSameSrsData(atPullStart[key], value)) locallyChangedKeys.add(key);
  }

  // Start from local state (keeps brand-new local cards), overlay server rows
  // unless the local review is strictly newer, then restore locally-changed
  // keys so stale cloud rows cannot clobber them. A kept-local card differs
  // from the baseline (which holds the cloud row), so the next save re-pushes it.
  const merged: Record<string, SRSData> = { ...current };
  for (const [key, cloudCard] of Object.entries(cloud)) {
    const local = current[key];
    merged[key] = local && reviewTime(local) > reviewTime(cloudCard) ? local : cloudCard;
  }
  for (const key of locallyChangedKeys) {
    const value = current[key];
    if (value) merged[key] = value;
  }

  return { merged, baseline };
}

export interface ProgressResetInput {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  /** `user_profiles.progress_reset_at` from the pull; null when never reset. */
  cloudResetAt: string | null | undefined;
  /** Last reset epoch this device applied for the signed-in user. */
  seenResetAt: string | undefined;
}

export interface ProgressResetResult {
  /** True when local progress was cleared because a newer reset exists. */
  wiped: boolean;
  srsData: Record<string, SRSData>;
  learnedCards: string[];
  /** Epoch to remember for this user (unchanged when no newer reset). */
  seenResetAt: string | undefined;
}

/**
 * Decide whether a reset performed elsewhere must wipe this device's progress.
 *
 * Deleting server rows does not propagate through the incremental pull, so a
 * device that never saw the reset would re-upload its stale progress. The
 * server stamps a reset epoch; when it is newer than the one this device last
 * applied, local progress from before it is dropped BEFORE merging or pushing.
 * Cards reviewed after the epoch (by their own timestamp) are new progress, not
 * stale, and stay along with their learned flag.
 */
export function applyProgressResetEpoch(input: ProgressResetInput): ProgressResetResult {
  const { srsData, learnedCards, cloudResetAt, seenResetAt } = input;
  const cloudMs = cloudResetAt ? new Date(cloudResetAt).getTime() : NaN;
  const seenMs = seenResetAt ? new Date(seenResetAt).getTime() : NaN;
  const unchanged: ProgressResetResult = { wiped: false, srsData, learnedCards, seenResetAt };

  if (!cloudResetAt || !Number.isFinite(cloudMs)) return unchanged;
  if (Number.isFinite(seenMs) && cloudMs <= seenMs) return unchanged;

  const keptSrs: Record<string, SRSData> = {};
  for (const [key, card] of Object.entries(srsData)) {
    if (reviewTime(card) > cloudMs) keptSrs[key] = card;
  }
  const keptLearned = learnedCards.filter((id) => id in keptSrs);
  return { wiped: true, srsData: keptSrs, learnedCards: keptLearned, seenResetAt: cloudResetAt };
}
