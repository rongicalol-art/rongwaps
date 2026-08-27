import type { WordExample } from '../../dictionary/hooks/useWordExtras';
import { FORMULAIC_PHRASES } from '../../../data/formulaicPhrases';

// Tunable scoring weights. Occurrences doing independent work should clearly
// outweigh source-word and brevity bonuses; formulaic chunks must never beat
// a free occurrence.
const FREE_OCCURRENCE_SCORE = 30;
const CHUNKED_OCCURRENCE_SCORE = 5;
const SOURCE_WORD_MATCH_SCORE = 15;
const SHORT_SENTENCE_BONUS = 8;
const SHORT_SENTENCE_MAX_GLYPHS = 14;
const LONG_SENTENCE_PENALTY = 5;
const LONG_SENTENCE_MIN_GLYPHS = 25;

/** True when the occurrence at `occurrenceIndex` lies inside a memorized
 * courtesy phrase (e.g. 好 inside 大家好) rather than standing on its own. */
function isCoveredByFormulaicPhrase(sentenceText: string, occurrenceIndex: number, character: string): boolean {
  for (const phrase of FORMULAIC_PHRASES) {
    if (!phrase.includes(character)) continue;
    let at = sentenceText.indexOf(phrase);
    while (at >= 0) {
      if (occurrenceIndex >= at && occurrenceIndex < at + phrase.length) return true;
      at = sentenceText.indexOf(phrase, at + 1);
    }
  }
  return false;
}

function scoreSentence(sentence: WordExample, character: string): number {
  const text = sentence.chinese;
  let score = 0;

  let at = text.indexOf(character);
  while (at >= 0) {
    score += isCoveredByFormulaicPhrase(text, at, character)
      ? CHUNKED_OCCURRENCE_SCORE
      : FREE_OCCURRENCE_SCORE;
    at = text.indexOf(character, at + 1);
  }

  // Sentences sourced from a vocabulary word that contains the character were
  // authored to teach it — a gentle bonus even when the word itself is chunky.
  if (sentence.sourceFront.includes(character)) score += SOURCE_WORD_MATCH_SCORE;

  const glyphCount = Array.from(text).length;
  if (glyphCount <= SHORT_SENTENCE_MAX_GLYPHS) score += SHORT_SENTENCE_BONUS;
  else if (glyphCount >= LONG_SENTENCE_MIN_GLYPHS) score -= LONG_SENTENCE_PENALTY;

  return score;
}

/**
 * Rank example sentences for a single character so sentences where the
 * character does real work surface first, and occurrences buried inside
 * formulaic chunks (大家好 for 大, 不客氣 for 不) sink to the backup slots.
 * Reorders only — never drops candidates. Equal scores keep input order
 * (stable sort), preserving upstream relevance ordering as tie-break.
 */
export function rankExampleSentences(sentences: WordExample[], character: string): WordExample[] {
  if (!character || sentences.length <= 1) return [...sentences];
  return sentences
    .map((sentence) => ({ sentence, score: scoreSentence(sentence, character) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.sentence);
}
