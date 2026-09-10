import type { SRSData } from './srsEngine';

/**
 * The single canonical mapping between client SRSData and
 * `user_card_progress` database rows. Every service and sync path converts
 * through this module — adding an SRS field means changing this file (plus
 * its migration), not several services.
 */

/** Card-level columns of `user_card_progress` as Supabase returns them. */
export interface CardProgressRow {
  card_id: string;
  ease: number | null;
  interval: number | null;
  repetitions: number | null;
  next_review_date: string | null;
  learning_step: number | null;
}

/** Per-card payload for the `upsert_card_progress` RPC and direct upserts. */
export interface CardProgressUpsert {
  card_id: string;
  ease: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  learning_step: number | null;
}

export function srsDataToUpsert(data: SRSData, cardId: string): CardProgressUpsert {
  return {
    card_id: cardId,
    ease: data.efactor,
    interval: data.interval,
    repetitions: data.repetition,
    next_review_date: new Date(data.nextReviewDate).toISOString(),
    learning_step: data.learningStep ?? null,
  };
}

export function rowToSrsData(row: CardProgressRowLike): SRSData {
  const nextReviewMs = row.next_review_date
    ? new Date(row.next_review_date).getTime()
    : Date.now();
  return {
    cardId: row.card_id,
    efactor: Number(row.ease),
    interval: row.interval ?? 0,
    repetition: row.repetitions ?? 0,
    nextReviewDate: nextReviewMs,
    ...(row.learning_step != null ? { learningStep: row.learning_step } : {}),
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
}

/**
 * Equality across every persisted SRS field — the delta comparison used by
 * the cloud sync layer. Keep in lockstep with `srsDataToUpsert`/
 * `rowToSrsData`: a new persisted field must be added to all three.
 */
export function isSameSrsData(a: SRSData, b: SRSData): boolean {
  return (
    a.efactor === b.efactor
    && a.interval === b.interval
    && a.repetition === b.repetition
    && a.nextReviewDate === b.nextReviewDate
    && (a.learningStep ?? null) === (b.learningStep ?? null)
  );
}
