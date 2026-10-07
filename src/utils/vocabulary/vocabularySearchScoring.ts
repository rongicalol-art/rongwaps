/**
 * Pure smart scoring and ranking for vocabulary search.
 */

import type { Flashcard } from '../../data/flashcards';
import { expandSlashAndOptionalVariants, stripPinyinTones } from '../pinyin/pinyinNormalize';
import { escapeRegExp } from '../escapeRegExp';

export function getSmartScore(
  card: Flashcard,
  rawQuery: string,
  lowerQuery: string,
  normQuery: string,
): number {
  let maxScore = 0;

  const frontVariations = expandSlashAndOptionalVariants(card.front || '');
  const pinyinVariations = expandSlashAndOptionalVariants(card.pinyin || '');
  const definitions = (card.back || '').toLowerCase();

  for (const front of frontVariations) {
    const pinyinsToTest = pinyinVariations.length > 0 ? pinyinVariations : [''];

    for (const pinyinRaw of pinyinsToTest) {
      let score = 0;
      const joinedPinyin = stripPinyinTones(pinyinRaw);

      // 1. Exact Matches (Highest Priority)
      if (front === rawQuery) score += 10000;
      if (joinedPinyin === normQuery && joinedPinyin.length > 0) score += 8000;

      // Exact English meaning word match.
      const escapedQuery = escapeRegExp(lowerQuery.trim());
      const wordsRegex = escapedQuery ? new RegExp(`(?:^|[^A-Za-z])${escapedQuery}(?=$|[^A-Za-z])`, 'i') : null;
      if (wordsRegex && wordsRegex.test(definitions)) {
        score += 4000;
        if (definitions.startsWith(lowerQuery)) score += 1000;
      }

      // 2. Starts With (High Priority)
      if (front.startsWith(rawQuery)) score += 500;
      if (normQuery && joinedPinyin.startsWith(normQuery)) score += 400;

      // 3. Partial or Substring matches
      if (front.includes(rawQuery)) score += 100;
      if (normQuery && joinedPinyin.includes(normQuery)) score += 50;
      if (definitions.includes(lowerQuery)) score += 10;

      // 4. Penalty for length so shorter, more exact matches float higher
      score -= front.length * 2;
      if (joinedPinyin) {
        score -= joinedPinyin.length;
      }

      if (score > maxScore) {
        maxScore = score;
      }
    }
  }

  return maxScore;
}
