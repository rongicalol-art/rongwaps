import { GRAMMAR_USAGE_RULES } from '../../data/grammarUsageRules';
import { getPatternRowGroups, grammarHeaderWeight, grammarHeaderWordCount } from './grammarPatternLayout';
import type { ReadingRecord, InteractiveGrammarPart } from '../../types/models';

export interface LessonValidationIssue {
  location: string;
  message: string;
}

export const READING_LESSON_MIN = 1;
export const READING_LESSON_MAX = 16;

function registerId(
  id: string,
  location: string,
  seen: Map<string, string>,
  issues: LessonValidationIssue[],
) {
  const firstLocation = seen.get(id);
  if (firstLocation) {
    issues.push({ location, message: `Duplicate ID "${id}" first used at ${firstLocation}.` });
    return;
  }
  seen.set(id, location);
}

export function validateInteractiveLessons(
  parts: InteractiveGrammarPart[],
  readings: ReadingRecord[],
): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = [];
  const topLevelIds = new Map<string, string>();

  parts.forEach((part) => {
    registerId(part.id, `grammar part ${part.id}`, topLevelIds, issues);
    registerId(part.dialogue.id, `dialogue ${part.dialogue.id}`, topLevelIds, issues);

    const dialogueIds = new Map<string, string>();
    part.dialogue.lines.forEach((line) => {
      registerId(line.id, `${part.id} dialogue line`, dialogueIds, issues);
    });

    part.grammarPages.forEach((page) => {
      const pageLocation = `${part.id} grammar ${page.grammarNumber}`;
      registerId(page.id, pageLocation, topLevelIds, issues);
      const pageIds = new Map<string, string>();

      if (page.bookId !== part.bookId || page.lessonId !== part.lessonId || page.partId !== part.partId) {
        issues.push({ location: pageLocation, message: 'Page identity does not match its parent part.' });
      }
      if (!page.titleTraditional.trim() || !page.titleEnglish.trim() || !page.learnerPromise.trim()) {
        issues.push({ location: pageLocation, message: 'Title and learner promise are required.' });
      }
      if ((page.bookPageAvailable ?? true) && page.printedPages.length === 0) {
        issues.push({ location: pageLocation, message: 'Printed page references are required when a book page is available.' });
      }
      if (!page.audioReference.trim()) {
        issues.push({ location: pageLocation, message: 'Audio reference is required.' });
      }
      // The number-system reference page teaches with a complete place-value
      // table plus the number lab; the printed book prints no numbered
      // examples there, so example cards would only duplicate the table.
      const teachesWithReferenceTable = Boolean(page.numberLab);
      if ((page.examples.length === 0 && !teachesWithReferenceTable) || page.questions.length === 0) {
        issues.push({ location: pageLocation, message: 'Examples and practice questions are required.' });
      }
      if (page.exerciseType === 'unscramble' && !page.unscrambleExercise) {
        issues.push({ location: pageLocation, message: 'Unscramble exercise data is required.' });
      }

      page.teachingGlossary?.forEach((token) => {
        registerId(token.id, `${pageLocation} glossary`, pageIds, issues);
      });
      page.patternRows.forEach((row) => {
        registerId(row.id, `${pageLocation} pattern row`, pageIds, issues);
        getPatternRowGroups(row).flat().forEach((token) => {
          registerId(token.id, `${pageLocation} pattern token`, pageIds, issues);
        });
      });
      page.examples.forEach((example) => {
        registerId(example.id, `${pageLocation} example`, pageIds, issues);
        // The authored text fields are optional in the model: a missing one must
        // be reported as a content issue, not crash the validator on `.trim()`.
        const { pinyin = '', english = '', words = [] } = example.text;
        if (!example.text.traditional.trim() || !pinyin.trim() || !english.trim()) {
          issues.push({ location: `${pageLocation} example ${example.number}`, message: 'Traditional, pinyin, and English are required.' });
        }
        if (words.length === 0) {
          issues.push({ location: `${pageLocation} example ${example.number}`, message: 'Dictionary word tokens are required.' });
        }
        words.forEach((word) => {
          registerId(word.id, `${pageLocation} example word`, pageIds, issues);
        });
        example.text.translationSegments?.forEach((segment) => {
          registerId(segment.id, `${pageLocation} translation segment`, pageIds, issues);
        });
      });

      if (page.unscrambleExercise) {
        const exercise = page.unscrambleExercise;
        registerId(exercise.id, `${pageLocation} unscramble exercise`, pageIds, issues);
        const tileIds = new Set(exercise.tiles.map((tile) => tile.id));
        exercise.tiles.forEach((tile) => registerId(tile.id, `${pageLocation} unscramble tile`, pageIds, issues));
        if (
          exercise.correctOrder.length !== exercise.tiles.length
          || exercise.correctOrder.some((tileId) => !tileIds.has(tileId))
          || new Set(exercise.correctOrder).size !== exercise.tiles.length
        ) {
          issues.push({ location: `${pageLocation} unscramble exercise`, message: 'Correct order must use every tile exactly once.' });
        }
      }

      if (!page.confusion) {
        issues.push({ location: pageLocation, message: 'A confusion block is required on every grammar page.' });
      } else if (!page.confusion.title.trim() || page.confusion.items.length === 0) {
        issues.push({ location: `${pageLocation} confusion`, message: 'A confusion block needs a title and at least one item.' });
      }
      if (page.confusion) {
        if (page.confusion.items.length > 4 || page.confusion.items.length < 2) {
          issues.push({ location: `${pageLocation} confusion`, message: 'A confusion block needs two to four items.' });
        }
        page.confusion.items.forEach((item) => {
          registerId(item.id, `${pageLocation} confusion item`, pageIds, issues);
          if (!item.question.trim() || !item.answer.trim()) {
            issues.push({ location: `${pageLocation} confusion item ${item.id}`, message: 'Question and answer are required.' });
          }
          if (!item.wrongTraditional.trim()) {
            issues.push({ location: `${pageLocation} confusion item ${item.id}`, message: 'The wrong form is required.' });
          }
          // Same optional-field rule as examples above: report, don't throw.
          const { pinyin = '', english = '', words = [] } = item.right;
          if (!item.right.traditional.trim() || !pinyin.trim() || !english.trim()) {
            issues.push({ location: `${pageLocation} confusion item ${item.id}`, message: 'The right form needs traditional text, pinyin, and English.' });
          }
          if (words.length === 0) {
            issues.push({ location: `${pageLocation} confusion item ${item.id}`, message: 'Dictionary word tokens are required for the right form.' });
          }
          words.forEach((word) => {
            registerId(word.id, `${pageLocation} confusion word`, pageIds, issues);
          });
        });
      }

      page.questions.forEach((question) => {
        registerId(question.id, `${pageLocation} question`, pageIds, issues);
        const availableAnswers = new Set(
          question.tiles.flatMap((tile) => [tile.traditional, tile.simplified].filter(Boolean)),
        );
        question.tiles.forEach((tile) => {
          registerId(tile.id, `${pageLocation} answer tile`, pageIds, issues);
        });
        question.segments.forEach((segment) => {
          if (segment.type !== 'blank') return;
          registerId(segment.id, `${pageLocation} blank`, pageIds, issues);
          const acceptedAnswers = [
            segment.answer,
            segment.answerSimplified,
            ...(segment.acceptedAnswers ?? []),
            ...(segment.acceptedAnswersSimplified ?? []),
          ].filter(Boolean);
          acceptedAnswers.forEach((answer) => {
            if (!availableAnswers.has(answer)) {
              issues.push({ location: `${pageLocation} blank ${segment.id}`, message: `No tile supplies accepted answer "${answer}".` });
            }
          });
        });
      });
    });
  });

  const lessonGrammarNumbers = new Map<string, number[]>();
  parts.forEach((part) => {
    const key = `${part.bookId}-${part.lessonId}`;
    lessonGrammarNumbers.set(key, [
      ...(lessonGrammarNumbers.get(key) ?? []),
      ...part.grammarPages.map((page) => page.grammarNumber),
    ]);
  });
  lessonGrammarNumbers.forEach((numbers, key) => {
    const ordered = [...numbers].sort((a, b) => a - b);
    if (ordered.some((number, index) => number !== index + 1)) {
      issues.push({ location: `lesson ${key}`, message: `Grammar numbering must be contiguous; found ${ordered.join(', ')}.` });
    }
  });

  // Readings: every in-scope lesson must have exactly two complete dialogues.
  const readingsByLesson = new Map<number, ReadingRecord[]>();
  readings.forEach((reading) => {
    registerId(reading.id, `reading ${reading.id}`, topLevelIds, issues);
    const lessonReadings = readingsByLesson.get(reading.lessonId) ?? [];
    lessonReadings.push(reading);
    readingsByLesson.set(reading.lessonId, lessonReadings);

    if (reading.dialogueNumber < 1 || reading.dialogueNumber > 3) {
      issues.push({ location: reading.id, message: 'Dialogue number must be 1, 2, or 3.' });
    }
    if (reading.paragraphs.length === 0) {
      issues.push({ location: reading.id, message: 'A reading needs at least one paragraph.' });
    }
    reading.paragraphs.forEach((paragraph, index) => {
      if (
        !paragraph.speaker.trim()
        || !paragraph.traditional.trim()
        || !paragraph.simplified.trim()
        || !paragraph.pinyin.trim()
        || !paragraph.english.trim()
      ) {
        issues.push({ location: `${reading.id} paragraph ${index + 1}`, message: 'Speaker, traditional, simplified, pinyin, and English are required.' });
      }
    });
  });
  for (let lessonId = READING_LESSON_MIN; lessonId <= READING_LESSON_MAX; lessonId += 1) {
    const lessonReadings = readingsByLesson.get(lessonId) ?? [];
    if (lessonReadings.length < 2 || lessonReadings.length > 3) {
      issues.push({ location: `lesson ${lessonId}`, message: `Expected 2 or 3 readings; found ${lessonReadings.length}.` });
    }
  }

  // Grammar pages and readings: every part's source dialogue must resolve to
  // exactly one reading, and that reading must sit on the same dialogue number.
  // This is the mapping the reader's Study Guide relies on to call a grammar
  // point "taught with this text" instead of guessing from numbering.
  const readingsByAudio = new Map<string, ReadingRecord[]>();
  readings.forEach((reading) => {
    if (!reading.audioReference) return;
    readingsByAudio.set(reading.audioReference, [
      ...(readingsByAudio.get(reading.audioReference) ?? []),
      reading,
    ]);
  });
  parts.forEach((part) => {
    const location = `${part.id} dialogue`;
    const audioReference = part.dialogue?.audioReference;
    if (!audioReference) {
      issues.push({ location, message: 'A grammar part needs its source dialogue audio reference.' });
      return;
    }
    const matches = readingsByAudio.get(audioReference) ?? [];
    if (matches.length !== 1) {
      issues.push({
        location,
        message: `Audio reference "${audioReference}" must match exactly one reading; found ${matches.length}.`,
      });
      return;
    }
    if (matches[0].dialogueNumber !== part.partId) {
      issues.push({
        location,
        message: `Reading ${matches[0].id} is dialogue ${matches[0].dialogueNumber} but sits on part ${part.partId}.`,
      });
    }
  });

  // Grammar usage rules: each page needs a reviewed rule or a declared reason,
  // so "used in this reading" can never silently come from a guess.
  parts.forEach((part) => {
    part.grammarPages.forEach((page) => {
      const location = `${part.id} grammar ${page.grammarNumber}`;
      const entry = GRAMMAR_USAGE_RULES[page.id];
      if (!entry) {
        issues.push({ location, message: 'Missing a grammar usage rule or an undetectable note.' });
        return;
      }
      if (entry.detected && entry.detected.anyOf.length === 0) {
        issues.push({ location, message: 'A detected rule needs at least one evidence pattern.' });
      }
      if (entry.undetectable !== undefined && !entry.undetectable.trim()) {
        issues.push({ location, message: 'An undetectable note needs a reason.' });
      }
    });
  });
  Object.keys(GRAMMAR_USAGE_RULES).forEach((pageId) => {
    const known = parts.some((part) =>
      part.grammarPages.some((page) => page.id === pageId),
    );
    if (!known) {
      issues.push({ location: pageId, message: 'Grammar usage rule points at an unknown page.' });
    }
  });

  // Pattern-table headers: labels are authored to stay on one line inside the
  // narrowest mobile column and to read as a short 1-3 word title, so a long
  // compound, parenthetical, or abbreviated label is a bug, not a style.
  const HEADER_LABEL_MAX = 6;
  const HEADER_LABEL_WORDS = 3;
  const HEADER_DETAIL_MAX = 8;
  parts.forEach((part) => {
    part.grammarPages.forEach((page) => {
      const tables = [
        { location: `${part.id} grammar ${page.grammarNumber} pattern table`, page },
        ...(page.subsections ?? []).map((subsection) => ({
          location: `${part.id} grammar ${page.grammarNumber} subsection ${subsection.id}`,
          page: subsection,
        })),
      ];
      tables.forEach(({ location, page: table }) => {
        if ((table.patternRows ?? []).length === 0) return;
        (table.patternColumns ?? []).forEach((label, index) => {
          if (!label.trim()) {
            issues.push({ location, message: `Column ${index + 1} needs a header label.` });
            return;
          }
          if (grammarHeaderWeight(label) > HEADER_LABEL_MAX) {
            issues.push({
              location,
              message: `Column header "${label}" is too wide to stay on one line; keep it to ${HEADER_LABEL_MAX} units (e.g. "Who", "Action", "Amount").`,
            });
          }
          if (grammarHeaderWordCount(label) > HEADER_LABEL_WORDS) {
            issues.push({
              location,
              message: `Column header "${label}" is ${grammarHeaderWordCount(label)} words; write a ${HEADER_LABEL_WORDS}-word-or-shorter title (e.g. "Who / Thing", "New topic").`,
            });
          }
          if (label.startsWith('(') || label.endsWith(')')) {
            issues.push({
              location,
              message: `Column header "${label}" reads as a parenthetical note; write a plain title (e.g. "No noun" instead of "(no noun)").`,
            });
          }
        });
        (table.patternColumnDetails ?? []).forEach((detail) => {
          if (grammarHeaderWeight(detail) > HEADER_DETAIL_MAX) {
            issues.push({
              location,
              message: `Column detail "${detail}" is too long; keep it to ${HEADER_DETAIL_MAX} units and move the nuance into the explanation.`,
            });
          }
        });
      });
    });
  });

  // Grammar page order: printed pages must not go backwards within a part.
  parts.forEach((part) => {
    let previousPage = -1;
    [...part.grammarPages]
      .sort((a, b) => a.grammarNumber - b.grammarNumber)
      .forEach((page) => {
        const firstPage = Math.min(...page.printedPages, Number.POSITIVE_INFINITY);
        if (Number.isFinite(firstPage) && firstPage < previousPage) {
          issues.push({
            location: `${part.id} grammar ${page.grammarNumber}`,
            message: 'Printed pages must not run backwards within a part.',
          });
        }
        if (Number.isFinite(firstPage)) previousPage = Math.max(previousPage, firstPage);
      });
  });

  return issues;
}
