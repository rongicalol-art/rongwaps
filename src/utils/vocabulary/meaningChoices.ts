export function normalizeMeaning(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
}

export function getCardMeaning(
  card: { back: string; simple?: string },
  simpleDefinitions = false,
): string {
  if (simpleDefinitions && card.simple) return card.simple;
  return card.back;
}

export type ChoiceAttribute = 'meaning' | 'hanzi' | 'pinyin';

export interface MultiAttributeChoiceSource {
  id: string;
  front: string;
  back: string;
  simple?: string;
  pinyin?: string;
}

export function normalizeChoiceValue(value: string, attribute: ChoiceAttribute): string {
  const trimmed = value.normalize('NFKC').trim();
  if (attribute === 'meaning') {
    return trimmed.replace(/\s+/g, ' ').toLocaleLowerCase('en');
  }
  if (attribute === 'pinyin') {
    return trimmed.replace(/\s+/g, '').toLocaleLowerCase('en');
  }
  return trimmed;
}

export function getCardChoiceTarget<T extends MultiAttributeChoiceSource>(
  card: T,
  attribute: ChoiceAttribute,
  simpleDefinitions = false,
): string {
  if (attribute === 'hanzi') return card.front;
  if (attribute === 'pinyin') return card.pinyin ?? '';
  return getCardMeaning(card, simpleDefinitions);
}

export function buildAttributeChoices<T extends MultiAttributeChoiceSource>(
  currentCard: T,
  candidates: readonly T[],
  attribute: ChoiceAttribute = 'meaning',
  maximumChoiceCount = 3,
  simpleDefinitions = false,
): T[] {
  if (maximumChoiceCount <= 0) return [];

  const choices = [currentCard];
  const seenValues = new Set([
    normalizeChoiceValue(getCardChoiceTarget(currentCard, attribute, simpleDefinitions), attribute),
  ]);

  for (const candidate of candidates) {
    if (candidate.id === currentCard.id) continue;

    const val = getCardChoiceTarget(candidate, attribute, simpleDefinitions);
    const normalized = normalizeChoiceValue(val, attribute);
    if (!normalized || seenValues.has(normalized)) continue;

    choices.push(candidate);
    seenValues.add(normalized);

    if (choices.length >= maximumChoiceCount) break;
  }

  return choices;
}
