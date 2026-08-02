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
