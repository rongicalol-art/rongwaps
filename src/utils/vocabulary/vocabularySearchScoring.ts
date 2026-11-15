/**
 * Pure smart scoring and ranking for vocabulary search.
 */

import type { Flashcard } from '../../data/flashcards';
import { expandSlashAndOptionalVariants, stripPinyinTones } from '../pinyin/pinyinNormalize';
import { escapeRegExp } from '../escapeRegExp';
import { getSemanticSynonymStems, stemEnglishPhrase, stemEnglishWord } from './englishStem';

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
  const cleanQuery = lowerQuery.trim().replace(/^(?:to |an? |the )/, '');
  const queryStem = stemEnglishPhrase(cleanQuery);
  const singleStem = !cleanQuery.includes(' ') ? stemEnglishWord(cleanQuery) : '';
  const synonymStems = getSemanticSynonymStems(cleanQuery);
  const defWords = definitions
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .split(/[^a-z]+/)
    .filter(Boolean);
  const defStems = defWords.map(stemEnglishWord);
  const defStemSet = new Set(defStems);
  const escapedQuery = escapeRegExp(cleanQuery);
  const wordsRegex = escapedQuery ? new RegExp(`(?:^|[^A-Za-z])${escapedQuery}(?=$|[^A-Za-z])`, 'i') : null;

  // Definition matching does not depend on front/pinyin variations, so compute it once.
  let defScore = 0;
  if (wordsRegex && wordsRegex.test(definitions)) {
    defScore += 4000;
    if (definitions.startsWith(cleanQuery) || definitions.startsWith(`to ${cleanQuery}`)) defScore += 1000;
  } else if (singleStem.length >= 3 && defStemSet.has(singleStem)) {
    defScore += 3200;
  } else if (queryStem.length >= 3 && defStems.join(' ').includes(queryStem)) {
    defScore += 2800;
  } else if (synonymStems.length > 0 && synonymStems.some((syn) => defStemSet.has(syn))) {
    defScore += 2400;
  }
  if (cleanQuery.length >= 3 && definitions.includes(cleanQuery)) defScore += 10;

  for (const front of frontVariations) {
    const pinyinsToTest = pinyinVariations.length > 0 ? pinyinVariations : [''];

    for (const pinyinRaw of pinyinsToTest) {
      let score = defScore;
      const joinedPinyin = stripPinyinTones(pinyinRaw);

      // 1. Exact Matches (Highest Priority)
      if (front === rawQuery) score += 10000;
      if (joinedPinyin === normQuery && joinedPinyin.length > 0) score += 8000;

      // 2. Starts With (High Priority)
      if (front.startsWith(rawQuery)) score += 500;
      if (normQuery && joinedPinyin.startsWith(normQuery)) score += 400;

      // 3. Partial or Substring matches
      if (front.includes(rawQuery)) score += 100;
      if (normQuery && joinedPinyin.includes(normQuery)) score += 50;

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
