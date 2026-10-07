import { getWordChunks } from '../pinyin/rubyPinyin';
import { matchAllTokenEvidence, type TokenEvidenceMatch } from './tokenEvidence';
import type { ReadingRecord } from '../../types/models';
import { GRAMMAR_USAGE_RULES } from '../../data/grammarUsageRules';

/**
 * Detects which grammar pages a reading actually uses.
 *
 * `target` is authoritative: the reading's mapped course part (dialogue 1/2/3)
 * is the part the book teaches the text with. `detected` is advisory and comes
 * from the authored rule table; a page without a matching rule stays `none`
 * rather than guessing. Matching runs on the reader's own word segmentation of
 * the traditional text, so a badge never fires on a substring of a longer word.
 *
 * Matches report the clause(s) that carry the pattern — the reader paints those
 * on hover, not the whole `。`-sentence, so neighbouring clauses stay clean.
 */

export type GrammarUsageStatus = 'target' | 'detected' | 'none';

/** A character range inside one reading paragraph. */
export interface GrammarCharRange {
  charStart: number;
  charEnd: number;
}

/** Where a matched sentence lives in the reading, for the reader's locate highlight. */
export interface GrammarSentenceMatch {
  paragraphIndex: number;
  /** Sentence number inside its paragraph (0-based). */
  sentenceIndex: number;
  /** Clause-level highlight ranges inside that sentence, merged in order. */
  ranges: GrammarCharRange[];
}

export interface GrammarUsageEntry {
  status: GrammarUsageStatus;
  /** The rule's authored citation when detected (e.g. `太 + X + 了`). */
  evidence?: string;
  /** Sentences whose token stream satisfies the page's rule; empty when none do. */
  matchedSentences: GrammarSentenceMatch[];
}

/** A sentence is the token list between 。！？ boundaries (commas stay inside). */
export type ReadingSentence = string[];

/** A segmented sentence with its position, token spans and comma-level clauses. */
export interface ReadingSentenceLocation {
  paragraphIndex: number;
  sentenceIndex: number;
  tokens: ReadingSentence;
  /** Character range of the whole sentence, punctuation included. */
  charStart: number;
  charEnd: number;
  /** Character range of each token, parallel to `tokens`. */
  tokenSpans: GrammarCharRange[];
  /** Contiguous comma/pause-delimited clauses inside the sentence, punctuation included. */
  clauseRanges: GrammarCharRange[];
  /** Token indexes that begin a clause; reduplication never crosses one. */
  clauseStartTokens: number[];
}

const SENTENCE_END = /[。！？!?]/;
/** Pause marks that close a clause but not a sentence (mirrors `dialogueSync`). */
const CLAUSE_BOUNDARY = /[，、；：…—,]/;

/**
 * Splits every paragraph (traditional text + its pinyin) into sentences of word
 * tokens, keeping each sentence's paragraph, index, character range, token
 * spans and clause ranges. The sentence range covers its punctuation up to the
 * closing boundary so the reader can paint a background without gaps.
 */
export function segmentReadingSentenceLocations(
  reading: ReadingRecord,
): ReadingSentenceLocation[] {
  const sentences: ReadingSentenceLocation[] = [];

  reading.paragraphs.forEach((paragraph, paragraphIndex) => {
    const chunks = getWordChunks(paragraph.traditional, paragraph.pinyin);
    let tokens: string[] = [];
    let tokenSpans: GrammarCharRange[] = [];
    let clauseRanges: GrammarCharRange[] = [];
    let charStart = 0;
    let clauseStart = 0;
    let offset = 0;
    let sentenceIndex = 0;

    const pushSentence = (charEnd: number) => {
      const clauseStartTokens: number[] = [];
      let tokenIndex = 0;
      for (const clause of clauseRanges) {
        while (
          tokenIndex < tokenSpans.length &&
          tokenSpans[tokenIndex].charStart < clause.charStart
        ) {
          tokenIndex += 1;
        }
        if (tokenIndex < tokenSpans.length && tokenSpans[tokenIndex].charStart < clause.charEnd) {
          clauseStartTokens.push(tokenIndex);
        }
      }
      if (clauseStartTokens.length === 0) clauseStartTokens.push(0);

      sentences.push({
        paragraphIndex,
        sentenceIndex,
        tokens,
        charStart,
        charEnd,
        tokenSpans,
        clauseRanges,
        clauseStartTokens,
      });
      sentenceIndex += 1;
      tokens = [];
      tokenSpans = [];
      clauseRanges = [];
    };

    for (const chunk of chunks) {
      const chunkStart = offset;
      offset += chunk.text.length;

      if (chunk.isPunctuation) {
        if (tokens.length > 0 && (SENTENCE_END.test(chunk.text) || CLAUSE_BOUNDARY.test(chunk.text))) {
          clauseRanges.push({ charStart: clauseStart, charEnd: offset });
          clauseStart = offset;
        }
        if (SENTENCE_END.test(chunk.text) && tokens.length > 0) {
          pushSentence(offset);
        }
        continue;
      }

      if (tokens.length === 0) {
        charStart = chunkStart;
        if (clauseRanges.length === 0) clauseStart = chunkStart;
      }
      tokenSpans.push({ charStart: chunkStart, charEnd: offset });
      tokens.push(chunk.text);
    }

    if (tokens.length > 0) {
      clauseRanges.push({ charStart: clauseStart, charEnd: offset });
      pushSentence(offset);
    }
  });

  return sentences;
}

/** Splits every paragraph (traditional text + its pinyin) into sentences of word tokens. */
export function segmentReadingSentences(reading: ReadingRecord): ReadingSentence[] {
  return segmentReadingSentenceLocations(reading).map((sentence) => sentence.tokens);
}

/** The clause(s) a matched token span touches, merged into one highlight range. */
export function clauseRangeForTokenSpan(
  sentence: ReadingSentenceLocation,
  match: TokenEvidenceMatch,
): GrammarCharRange | null {
  const first = sentence.tokenSpans[match.start];
  const last = sentence.tokenSpans[match.end - 1];
  if (!first || !last) return null;

  const startClause = sentence.clauseRanges.find(
    (clause) => clause.charStart <= first.charStart && clause.charEnd > first.charStart,
  );
  const endClause = sentence.clauseRanges.find(
    (clause) => clause.charStart < last.charEnd && clause.charEnd >= last.charEnd,
  );
  return {
    charStart: startClause?.charStart ?? first.charStart,
    charEnd: endClause?.charEnd ?? last.charEnd,
  };
}

function mergeRanges(ranges: GrammarCharRange[]): GrammarCharRange[] {
  const sorted = [...ranges].sort((a, b) => a.charStart - b.charStart);
  const merged: GrammarCharRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.charStart <= last.charEnd) {
      last.charEnd = Math.max(last.charEnd, range.charEnd);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/**
 * Resolves one usage status per grammar page id.
 *
 * Callers pass the pages of the reading's own lesson plus the page ids of the
 * reading's mapped part; any page without a rule entry stays `none`. Rules run
 * for target pages too, so the reader can locate the sentences that show the
 * pattern even though the badge is already authoritative.
 */
export function detectGrammarUsage(
  reading: ReadingRecord,
  pageIds: readonly string[],
  targetPageIds: ReadonlySet<string>,
): Map<string, GrammarUsageEntry> {
  const sentences = segmentReadingSentenceLocations(reading);
  const result = new Map<string, GrammarUsageEntry>();

  for (const pageId of pageIds) {
    const rule = GRAMMAR_USAGE_RULES[pageId];
    const matchedSentences: GrammarSentenceMatch[] = [];

    if (rule?.detected) {
      for (const sentence of sentences) {
        const options = { clauseStartTokens: new Set(sentence.clauseStartTokens) };
        const ranges: GrammarCharRange[] = [];
        for (const evidence of rule.detected.anyOf) {
          for (const match of matchAllTokenEvidence(sentence.tokens, evidence, options)) {
            const range = clauseRangeForTokenSpan(sentence, match);
            if (range) ranges.push(range);
          }
        }
        if (ranges.length === 0) continue;
        matchedSentences.push({
          paragraphIndex: sentence.paragraphIndex,
          sentenceIndex: sentence.sentenceIndex,
          ranges: mergeRanges(ranges),
        });
      }
    }

    if (targetPageIds.has(pageId)) {
      result.set(pageId, { status: 'target', matchedSentences });
      continue;
    }

    if (!rule?.detected) {
      result.set(pageId, { status: 'none', matchedSentences: [] });
      continue;
    }

    result.set(
      pageId,
      matchedSentences.length > 0
        ? { status: 'detected', evidence: rule.detected.citation, matchedSentences }
        : { status: 'none', matchedSentences: [] },
    );
  }

  return result;
}
