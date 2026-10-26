import type { SharedFolderCard, UserFlashcard } from '../../types/models';

const SLUG_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';

export function generateSharedFolderSlug(cryptoSource: Pick<Crypto, 'getRandomValues'> = crypto): string {
  const bytes = cryptoSource.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join('');
}

function cardText(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 2000);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).slice(0, 2000);
  return '';
}

export function flashcardToSharedFolderCard(card: UserFlashcard): SharedFolderCard {
  return {
    simplified: cardText(card.simplified),
    traditional: cardText(card.traditional),
    pinyin: cardText(card.pinyin),
    translation: cardText(card.translation),
    notes: cardText(card.notes),
    measureWords: Array.isArray(card.measure_words) ? card.measure_words.slice(0, 100).map(cardText) : [],
  };
}

export function flashcardsToSharedFolderJson(cards: UserFlashcard[]): SharedFolderCard[] {
  return cards.map(flashcardToSharedFolderCard);
}

/** Shared snapshots are remote input. Keep only plain card records and bound every text value. */
export function sharedFolderCardsFromJson(value: unknown): SharedFolderCard[] {
  if (!Array.isArray(value)) return [];
  const cards: SharedFolderCard[] = [];
  for (const item of value.slice(0, 500)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (!('simplified' in record) || !('translation' in record)) continue;
    cards.push({
      simplified: cardText(record.simplified),
      traditional: cardText(record.traditional),
      pinyin: cardText(record.pinyin),
      translation: cardText(record.translation),
      notes: cardText(record.notes),
      measureWords: Array.isArray(record.measureWords)
        ? record.measureWords.slice(0, 100).map(cardText).filter(Boolean)
        : [],
    });
  }
  return cards;
}
