/**
 * Resolves which taught sense of a word the reading's text actually shows.
 *
 * Words whose surface is taught more than once with different meanings (好
 * "good" vs "very", 點 "o'clock" vs "to order", 過 aspect vs "to cross") get a
 * three-state answer from the authored rules in `vocabularySenseRules`:
 * `this` (this entry's sense is evidenced here), `other` (a sibling sense is
 * evidenced instead) or `unclear` (nothing is evidenced; the rule for one of
 * the senses is often deliberately `undetectable`). Surfaces taught only once
 * resolve to null — there is no ambiguity to report.
 */
import type { ReadingSentence } from '../grammar/grammarUsage';
import { matchesTokenEvidence } from '../grammar/tokenEvidence';
import { VOCABULARY_SENSE_RULES, type VocabularySenseRule } from '../../data/vocabularySenseRules';

export type VocabularySenseStatus = 'this' | 'other' | 'unclear';

export interface VocabularySenseAlternative {
  id: string;
  lessonId: number;
  meaning: string;
}

export interface VocabularySenseResolution {
  status: VocabularySenseStatus;
  /** Sibling senses, in authored order; used for the learner-facing note. */
  alternatives: VocabularySenseAlternative[];
}

function detectsIn(sentences: readonly ReadingSentence[], rule: VocabularySenseRule): boolean {
  if (!rule.detected) return false;
  return sentences.some((sentence) =>
    rule.detected!.anyOf.some((evidence) => matchesTokenEvidence(sentence, evidence)),
  );
}

export function resolveVocabularySense(
  sentences: readonly ReadingSentence[],
  entryId: string,
): VocabularySenseResolution | null {
  const rule = VOCABULARY_SENSE_RULES[entryId];
  if (!rule) return null;

  const siblings = Object.entries(VOCABULARY_SENSE_RULES).filter(
    ([id, sibling]) => sibling.surface === rule.surface && id !== entryId,
  );
  if (siblings.length === 0) return null;

  if (detectsIn(sentences, rule)) return { status: 'this', alternatives: [] };

  const others = siblings
    .filter(([, sibling]) => detectsIn(sentences, sibling))
    .map(([id, sibling]) => ({ id, lessonId: sibling.lessonId, meaning: sibling.meaning }));
  if (others.length > 0) return { status: 'other', alternatives: others };

  return {
    status: 'unclear',
    alternatives: siblings.map(([id, sibling]) => ({
      id,
      lessonId: sibling.lessonId,
      meaning: sibling.meaning,
    })),
  };
}
