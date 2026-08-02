import { INTERACTIVE_GRAMMAR_PARTS } from '../data/interactiveGrammarPages';
import { INTERACTIVE_READING_PARTS } from '../data/interactiveReadingLessonOnePartThree';

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
      if (page.printedPages.length === 0 || !page.audioReference.trim()) {
        issues.push({ location: pageLocation, message: 'Printed page and audio references are required.' });
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

  INTERACTIVE_READING_PARTS.forEach((part) => {
    registerId(part.id, `reading part ${part.id}`, topLevelIds, issues);
    const readingIds = new Map<string, string>();
    part.chunks.forEach((chunk) => {
      registerId(chunk.id, `${part.id} reading chunk`, readingIds, issues);
      if (!chunk.traditional.trim() || !chunk.simplified.trim() || !chunk.pinyin.trim() || !chunk.english.trim()) {
        issues.push({ location: `${part.id} chunk ${chunk.id}`, message: 'Complete bilingual reading text is required.' });
      }
    });
    part.teachingGlossary?.forEach((token) => {
      registerId(token.id, `${part.id} glossary`, readingIds, issues);
    });
    if (part.experience === 'timeline') {
      if (!part.timeline?.length || !part.timelineChecks?.length) {
        issues.push({ location: part.id, message: 'Timeline readings require events and comprehension checks.' });
      }
      part.timeline?.forEach((item) => registerId(item.id, `${part.id} timeline event`, readingIds, issues));
      part.timelineChecks?.forEach((check) => {
        registerId(check.id, `${part.id} timeline check`, readingIds, issues);
        check.options.forEach((option) => registerId(option.id, `${part.id} timeline option`, readingIds, issues));
        if (!check.options.some((option) => option.id === check.answerId)) {
          issues.push({ location: `${part.id} check ${check.id}`, message: 'Answer ID must match an option.' });
        }
      });
    }
  });

  return issues;
}
