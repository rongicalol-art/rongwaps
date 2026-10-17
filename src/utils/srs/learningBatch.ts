import type { Flashcard } from '../../data/flashcards';
import type { SRSData } from './srsEngine';

/** A lesson can contain many words; its flashcards and quiz share one small batch. */
export function selectLearningBatch(cards: Flashcard[], srs: Record<string, SRSData>, learned: string[], pinned?: string[]): Flashcard[] {
  if (pinned?.length) {
    const byId = new Map(cards.map(card => [card.id, card]));
    return pinned.flatMap(id => { const card = byId.get(id); return card ? [card] : []; });
  }
  const introduced = new Set(learned);
  const fresh = cards.filter(card => !srs[card.id] && !introduced.has(card.id));
  const unfinished = cards.filter(card => !introduced.has(card.id));
  const dueCount = Object.values(srs).filter(card => card.nextReviewDate <= Date.now()).length;
  const size = dueCount > 40 ? 3 : 5;
  return (fresh.length ? fresh : unfinished.length ? unfinished : cards).slice(0, size);
}
