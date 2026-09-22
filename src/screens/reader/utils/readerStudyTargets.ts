import type { Flashcard } from '../../../data/flashcards';
import type {
  InteractiveGrammarPage,
  InteractiveGrammarPart,
  ReadingRecord,
} from '../../../types/models';
import {
  detectGrammarUsage,
  segmentReadingSentences,
  type GrammarUsageStatus,
} from '../../../utils/grammarUsage';
import { findGrammarPartForReading } from '../../../utils/readingContext';
import type { ReaderLocatedRange } from './readerLocate';
import {
  findVocabularyOccurrences,
  tokenizeReading,
  vocabularyTermVariants,
} from '../../../utils/vocabularyMatching';
import {
  resolveVocabularySense,
  type VocabularySenseResolution,
} from '../../../utils/vocabularySense';

/**
 * Resolves what the reader's Study Guide should call "this reading's" grammar
 * and vocabulary.
 *
 * Grammar: a reading belongs to the course part the book teaches it with
 * (dialogue 1 → part 1, dialogue 2 → part 2, the short essay → part 3 when the
 * book gives it grammar there). That mapping is exact — every Book 1 part's
 * embedded dialogue carries the reading's own `audioReference` and printed
 * pages — so it never depends on numbering guesses. Pages of the mapped part
 * are `target`; the lesson's other pages are marked `detected` only when the
 * authored usage rules find their pattern in this text. The card always lists
 * the whole lesson, grouped by part: the reading's own part (`group: 'part'`)
 * renders in normal ink, other parts (`group: 'also'`) and essays' pages
 * (`group: 'other'`) render dimmed — used or not — so the lesson structure
 * stays visible without claiming a part the reading does not belong to.
 *
 * Vocabulary: cards are tagged with their part id (`B1L01-2-03` → part 2), so
 * the part's own word list is the reading's target list. Words that actually
 * occur in the text are flagged first via the shared variant/span matcher
 * (`vocabularyMatching`), so a pack compound (`珍珠奶茶`) or an authored
 * alternate (`你好/妳好`, `想（要）`) still counts while 可愛 can never mark 愛.
 */

export interface ReaderStudyTargetWord {
  id: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  pos?: string;
  audio?: string;
  /** True when this reading's text actually contains the word. */
  inText: boolean;
  /** Every spelling the word may appear as; the reader's locate feature reuses it. */
  variants: string[];
  /**
   * Which taught sense the text shows, for words whose surface is taught more
   * than once. Absent when the surface has a single taught sense.
   */
  sense?: VocabularySenseResolution;
}

export interface ReaderGrammarPoint {
  id: string;
  /** Study part id the grammar lab opens with (`B1L01-P01-D01`). */
  partId: string;
  /** Numeric course part (1–3) this page belongs to. */
  partNumber: number;
  grammarNumber: number;
  titleTraditional: string;
  titleEnglish: string;
  pattern: string;
  explanation: string;
  usage: GrammarUsageStatus;
  /** The authored rule citation when `usage` is `detected`. */
  usageEvidence?: string;
  /** Clause ranges that show the pattern; the Study Guide highlights them on hover. */
  matches: ReaderLocatedRange[];
  /**
   * How the card groups this page: the reading's own part, another part's page
   * the text uses, or a lesson page listed for an essay with no part.
   */
  group: 'part' | 'also' | 'other';
}

export interface ReaderStudyTargets {
  grammarPoints: ReaderGrammarPoint[];
  /** The mapped part's words, in-text words first. Empty when the part is unknown. */
  targetWords: ReaderStudyTargetWord[];
  /** Every word of the lesson, used as a labelled fallback. */
  lessonWords: ReaderStudyTargetWord[];
  usingLessonFallback: boolean;
}

function toTargetWord(
  card: Flashcard,
  inText: boolean,
  variants: string[],
  sense?: VocabularySenseResolution,
): ReaderStudyTargetWord {
  const traditional = card.traditional || card.front;
  return {
    id: card.id,
    traditional,
    simplified: card.simplified,
    pinyin: card.pinyin || '',
    english: card.back || '',
    pos: card.pos,
    audio: card.audio,
    inText,
    variants,
    sense,
  };
}

export function buildReaderStudyTargets({
  reading,
  parts,
  vocabulary,
}: {
  reading: ReadingRecord;
  parts: readonly InteractiveGrammarPart[];
  vocabulary: readonly Flashcard[];
}): ReaderStudyTargets {
  const lessonParts = parts.filter(
    (part) => part.bookId === reading.bookId && part.lessonId === reading.lessonId,
  );
  const targetPart = findGrammarPartForReading(reading, parts);
  const targetPageIds = new Set(
    (targetPart?.grammarPages ?? []).map((page: InteractiveGrammarPage) => page.id),
  );

  const lessonPages = lessonParts.flatMap((part) =>
    part.grammarPages.map((page) => ({ page, part })),
  );
  const usage = detectGrammarUsage(
    reading,
    lessonPages.map(({ page }) => page.id),
    targetPageIds,
  );

  const usageRank: Record<GrammarUsageStatus, number> = { target: 0, detected: 1, none: 2 };
  const groupRank: Record<ReaderGrammarPoint['group'], number> = { part: 0, also: 1, other: 2 };
  const grammarPoints: ReaderGrammarPoint[] = lessonPages
    .map(({ page, part }) => {
      const entry = usage.get(page.id);
      return {
        id: page.id,
        partId: part.id,
        partNumber: part.partId,
        grammarNumber: page.grammarNumber,
        titleTraditional: page.titleTraditional,
        titleEnglish: page.titleEnglish,
        pattern: page.pattern,
        explanation: page.explanation,
        usage: entry?.status ?? 'none',
        usageEvidence: entry?.evidence,
        matches:
          entry?.matchedSentences.flatMap((match) =>
            match.ranges.map((range) => ({
              paragraphIndex: match.paragraphIndex,
              charStart: range.charStart,
              charEnd: range.charEnd,
            })),
          ) ?? [],
        group: targetPart
          ? targetPageIds.has(page.id)
            ? ('part' as const)
            : ('also' as const)
          : ('other' as const),
      };
    })
    // The whole lesson stays listed: the card groups pages by part and dims
    // everything outside this reading's own part (or unused, for essays).
    .sort((a, b) => {
      if (targetPart) {
        const byGroup = groupRank[a.group] - groupRank[b.group];
        if (byGroup !== 0) return byGroup;
      } else {
        const byUsage = usageRank[a.usage] - usageRank[b.usage];
        if (byUsage !== 0) return byUsage;
      }
      const byPart = a.partNumber - b.partNumber;
      if (byPart !== 0) return byPart;
      return a.grammarNumber - b.grammarNumber;
    });

  const wordRuns = tokenizeReading(reading);
  const senseSentences = segmentReadingSentences(reading);
  const withInText = (card: Flashcard): ReaderStudyTargetWord => {
    const variants = vocabularyTermVariants(card);
    const inText = findVocabularyOccurrences(wordRuns, variants).length > 0;
    const sense = inText ? resolveVocabularySense(senseSentences, card.id) ?? undefined : undefined;
    return toTargetWord(card, inText, variants, sense);
  };
  const lessonWords = vocabulary
    .filter((card) => card.lessonId === reading.lessonId)
    .map(withInText);

  const partWords = vocabulary
    .filter(
      (card) => card.lessonId === reading.lessonId && card.partId === reading.dialogueNumber,
    )
    .map(withInText)
    .sort((a, b) => Number(b.inText) - Number(a.inText));

  const usingLessonFallback = partWords.length === 0;
  const targetWords = usingLessonFallback
    ? [...lessonWords].sort((a, b) => Number(b.inText) - Number(a.inText))
    : partWords;

  return { grammarPoints, targetWords, lessonWords, usingLessonFallback };
}
