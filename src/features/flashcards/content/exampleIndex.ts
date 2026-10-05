import type { Flashcard } from '../../../data/flashcards';
import type { CourseExampleRecord } from '../../../types/models';
import { findSmartExamplesForWord, type RankedExample } from '../../../utils/courseExamples';
import { recordsToExampleCards } from '../../../utils/packValidators';
import { extractSearchVariants, sentenceMatchesForms } from '../../../utils/wordForms';

type Postings = Map<string, number[]>;

function addToPostings(postings: Postings, id: number, ...texts: Array<string | undefined>) {
  const seen = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const char of text) seen.add(char);
  }
  for (const char of seen) {
    const list = postings.get(char);
    if (list) list.push(id);
    else postings.set(char, [id]);
  }
}

/**
 * Ids of every item that could contain one of `terms`. A match contains every
 * character of its term, so the rarest character's postings are a complete
 * (and tiny) candidate set; callers still verify with `sentenceMatchesForms`.
 */
function candidates(postings: Postings, terms: string[]): number[] {
  const ids = new Set<number>();
  for (const term of terms) {
    let rarest: number[] | undefined;
    for (const char of new Set(term)) {
      const list = postings.get(char);
      if (!list) {
        rarest = undefined;
        break;
      }
      if (!rarest || list.length < rarest.length) rarest = list;
    }
    if (rarest) for (const id of rarest) ids.add(id);
  }
  return [...ids].sort((a, b) => a - b);
}

export interface ExampleIndex {
  lookup: (card: Flashcard) => RankedExample[];
}

/**
 * Pure, synchronous example lookup built once from the course-example records
 * and the vocabulary cards. Same result as scanning everything per card, minus
 * the scan: records win when any match, vocabulary examples are the fallback.
 */
export function buildExampleIndex(records: CourseExampleRecord[], vocab: Flashcard[]): ExampleIndex {
  const recordPostings: Postings = new Map();
  records.forEach((record, i) => addToPostings(recordPostings, i, record.traditional, record.simplified));

  const vocabWithExamples = vocab.filter((card) => card.examples && card.examples.length > 0);
  const vocabPostings: Postings = new Map();
  vocabWithExamples.forEach((card, i) => {
    addToPostings(vocabPostings, i, ...card.examples!.map((example) => example.chinese));
  });

  // Cards authored without a `pos` borrow one from the vocabulary entry for the same word.
  const posByForm = new Map<string, string>();
  for (const entry of vocab) {
    const pos = entry.pos?.trim();
    if (!pos) continue;
    for (const form of [entry.front, entry.traditional, entry.simplified]) {
      if (form && !posByForm.has(form)) posByForm.set(form, pos);
    }
  }

  return {
    lookup(source) {
      const card = source.pos?.trim()
        ? source
        : { ...source, pos: [source.front, source.traditional, source.simplified]
            .map((form) => (form ? posByForm.get(form) : undefined)).find(Boolean) };
      const searchWords = [card.traditional, card.simplified, card.front].filter(
        (form): form is string => Boolean(form?.trim()),
      );
      if (searchWords.length === 0) return [];

      const variants = new Set<string>();
      for (const word of searchWords) for (const variant of extractSearchVariants(word.trim())) variants.add(variant);
      const terms = [...variants].sort((a, b) => b.length - a.length);
      if (terms.length === 0) return [];

      const rich = recordsToExampleCards(
        candidates(recordPostings, terms).map((i) => records[i]),
        terms,
        card.pos,
      );
      const matching = rich.length > 0
        ? rich
        : candidates(vocabPostings, terms)
            .map((i) => vocabWithExamples[i])
            .filter((c) => c.examples?.some((e) => sentenceMatchesForms(e.chinese, terms, card.pos)));

      return findSmartExamplesForWord(matching, searchWords, card.id, card.pos);
    },
  };
}
