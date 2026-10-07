import type { SRSData } from './srsEngine';

/**
 * The single canonical mapping between client progress (SRSData +
 * `learnedCards`) and `user_card_progress` database rows. Every service and
 * sync path converts through this module — adding an SRS field means changing
 * this file (plus its migration), not several services.
 *
 * Learned is a column (`learned_at`): `rowsToProgress` folds it into the store's
 * `learnedCards`, `srsDataToUpsert` sends it with the card's record. A row with
 * no `next_review_date` carries no SRS state (learned, never scheduled).
 */

/** Card-level columns of `user_card_progress` as Supabase returns them. */
export interface CardProgressRow {
  card_id: string;
  ease: number | null;
  interval: number | null;
  repetitions: number | null;
  next_review_date: string | null;
  learning_step: number | null;
  /** Review time (last-write-wins key); null on rows that predate the column. */
  reviewed_at?: string | null;
  /** When the card was first learned; null/absent while it is not. */
  learned_at?: string | null;
}

/**
 * Per-card payload for the `upsert_card_progress` RPC.
 *
 * A type alias rather than an interface on purpose: the RPC argument is jsonb
 * (`Json`), and only object *type aliases* receive TypeScript's implicit index
 * signature, which is what lets this payload be passed as `p_records` without
 * a cast.
 */
export type CardProgressUpsert = {
  card_id: string;
  ease: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  learning_step: number | null;
  /** Omitted when the card has no recorded review time; the server then stamps now(). */
  reviewed_at?: string;
  /** Present when the card is learned; the server keeps the earliest value and never clears it. */
  learned_at?: string;
};

export function srsDataToUpsert(
  data: SRSData,
  cardId: string,
  learned = false,
): CardProgressUpsert {
  return {
    card_id: cardId,
    ease: data.efactor,
    interval: data.interval,
    repetitions: data.repetition,
    next_review_date: new Date(data.nextReviewDate).toISOString(),
    learning_step: data.learningStep ?? null,
    ...(data.lastReviewedAt != null
      ? { reviewed_at: new Date(data.lastReviewedAt).toISOString() }
      : {}),
    ...(learned
      ? { learned_at: new Date(data.lastReviewedAt ?? Date.now()).toISOString() }
      : {}),
  };
}

/** Split pulled rows into SRS state and the learned id list. */
export function rowsToProgress(rows: CardProgressRow[]): {
  srsData: Record<string, SRSData>;
  learnedCards: string[];
} {
  const srsData: Record<string, SRSData> = {};
  const learnedCards: string[] = [];
  for (const row of rows) {
    if (row.next_review_date) srsData[row.card_id] = rowToSrsData(row);
    if (row.learned_at) learnedCards.push(row.card_id);
  }
  return { srsData, learnedCards };
}

export function rowToSrsData(row: CardProgressRowLike): SRSData {
  const nextReviewMs = row.next_review_date
    ? new Date(row.next_review_date).getTime()
    : Date.now();
  const parsedReviewedAt = row.reviewed_at ? new Date(row.reviewed_at).getTime() : NaN;
  const reviewedAtMs = Number.isFinite(parsedReviewedAt) ? parsedReviewedAt : null;
  return {
    cardId: row.card_id,
    efactor: Number(row.ease),
    interval: row.interval ?? 0,
    repetition: row.repetitions ?? 0,
    nextReviewDate: nextReviewMs,
    ...(row.learning_step != null ? { learningStep: row.learning_step } : {}),
    ...(reviewedAtMs != null ? { lastReviewedAt: reviewedAtMs } : {}),
  };
}

/** Structural subset accepted by {@link rowToSrsData}. */
interface CardProgressRowLike {
  card_id: string;
  ease: number | string | null;
  interval: number | null;
  repetitions: number | null;
  next_review_date: string | null;
  learning_step: number | null;
  reviewed_at?: string | null;
}

/**
 * Equality across every persisted SRS field — the delta comparison used by
 * the cloud sync layer. Accepts `undefined` so a missing baseline record
 * (never synced) counts as different from any present record. Keep in
 * lockstep with `srsDataToUpsert`/`rowToSrsData`: a new persisted field must
 * be added to all three.
 *
 * `lastReviewedAt` is deliberately NOT compared: it is metadata for conflict
 * resolution, and a card whose scheduling fields match the baseline has
 * nothing to upload (comparing it would re-push cards the server clamped or
 * restamped, forever).
 */
export function isSameSrsData(a: SRSData | undefined, b: SRSData | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.efactor === b.efactor
    && a.interval === b.interval
    && a.repetition === b.repetition
    && a.nextReviewDate === b.nextReviewDate
    && (a.learningStep ?? null) === (b.learningStep ?? null)
  );
}
