import { INTERACTIVE_GRAMMAR_PARTS } from '../data/interactiveGrammarPages';
import { ALL_READINGS, READING_LESSON_MAX, READING_LESSON_MIN } from '../data/readings';
import type { ReadingRecord } from '../types/models';

export interface LessonValidationIssue {
  location: string;
  message: string;
}

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

export function validateInteractiveLessons(): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = [];
  const topLevelIds = new Map<string, string>();

  INTERACTIVE_GRAMMAR_PARTS.forEach((part) => {
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
      if (page.examples.length === 0 || page.questions.length === 0) {
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
        [...row.subject, ...row.grammar, ...row.complement].forEach((token) => {
          registerId(token.id, `${pageLocation} pattern token`, pageIds, issues);
        });
      });
      page.examples.forEach((example) => {
        registerId(example.id, `${pageLocation} example`, pageIds, issues);
        if (!example.text.traditional.trim() || !example.text.pinyin.trim() || !example.text.english.trim()) {
          issues.push({ location: `${pageLocation} example ${example.number}`, message: 'Traditional, pinyin, and English are required.' });
        }
        if (example.text.words.length === 0) {
          issues.push({ location: `${pageLocation} example ${example.number}`, message: 'Dictionary word tokens are required.' });
        }
        example.text.words.forEach((word) => {
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
          if (!item.right.traditional.trim() || !item.right.pinyin.trim() || !item.right.english.trim()) {
            issues.push({ location: `${pageLocation} confusion item ${item.id}`, message: 'The right form needs traditional text, pinyin, and English.' });
          }
          if (item.right.words.length === 0) {
            issues.push({ location: `${pageLocation} confusion item ${item.id}`, message: 'Dictionary word tokens are required for the right form.' });
          }
          item.right.words.forEach((word) => {
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
  INTERACTIVE_GRAMMAR_PARTS.forEach((part) => {
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
  ALL_READINGS.forEach((reading) => {
    registerId(reading.id, `reading ${reading.id}`, topLevelIds, issues);
    const lessonReadings = readingsByLesson.get(reading.lessonId) ?? [];
    lessonReadings.push(reading);
    readingsByLesson.set(reading.lessonId, lessonReadings);

    if (reading.dialogueNumber !== 1 && reading.dialogueNumber !== 2) {
      issues.push({ location: reading.id, message: 'Dialogue number must be 1 or 2.' });
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
    if (lessonReadings.length !== 2) {
      issues.push({ location: `lesson ${lessonId}`, message: `Expected 2 readings; found ${lessonReadings.length}.` });
    }
  }

  return issues;
}
