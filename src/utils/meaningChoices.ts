export interface MeaningChoiceSource {
  id: string;
  back: string;
}

export function normalizeMeaning(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
}

export type ChoiceAttribute = 'meaning' | 'hanzi' | 'pinyin';

export interface MultiAttributeChoiceSource {
  id: string;
  front: string;
  back: string;
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
): string {
  if (attribute === 'hanzi') return card.front;
  if (attribute === 'pinyin') return card.pinyin ?? '';
  return card.back;
}

export function buildAttributeChoices<T extends MultiAttributeChoiceSource>(
  currentCard: T,
  candidates: readonly T[],
  attribute: ChoiceAttribute = 'meaning',
  maximumChoiceCount = 3,
): T[] {
  if (maximumChoiceCount <= 0) return [];

  const getAttrValue = (item: T): string => {
    if (attribute === 'hanzi') return item.front;
    if (attribute === 'pinyin') return item.pinyin;
    return item.back;
  };

  const choices = [currentCard];
  const seenValues = new Set([normalizeChoiceValue(getAttrValue(currentCard), attribute)]);

  for (const candidate of candidates) {
    if (candidate.id === currentCard.id) continue;

    const val = getAttrValue(candidate);
    const normalized = normalizeChoiceValue(val, attribute);
    if (!normalized || seenValues.has(normalized)) continue;

    choices.push(candidate);
    seenValues.add(normalized);

    if (choices.length >= maximumChoiceCount) break;
  }

  return choices;
}

export function buildMeaningChoices<T extends MeaningChoiceSource>(
  currentCard: T,
  candidates: readonly T[],
  maximumChoiceCount = 3,
): T[] {
  if (maximumChoiceCount <= 0) return [];

  const choices = [currentCard];
  const seenMeanings = new Set([normalizeMeaning(currentCard.back)]);

  for (const candidate of candidates) {
    if (candidate.id === currentCard.id) continue;

    const normalizedMeaning = normalizeMeaning(candidate.back);
    if (!normalizedMeaning || seenMeanings.has(normalizedMeaning)) continue;

    choices.push(candidate);
    seenMeanings.add(normalizedMeaning);

    if (choices.length >= maximumChoiceCount) break;
  }

  return choices;
}
