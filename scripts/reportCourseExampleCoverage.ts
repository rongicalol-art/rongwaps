import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Flashcard } from '../src/data/flashcards';
import { recordsToExampleCards } from '../src/services/courseExamplePackService';
import type { CourseExamplePack } from '../src/types/models';
import { extractSearchVariants, findSmartExamplesForWord } from '../src/utils/courseExamples';
import { parseVocabularyId } from '../src/utils/vocabularyId';

interface VocabularyPackRow {
  id: string;
  traditional: string | null;
  meaning: string | null;
  examples: string | null;
}

interface VocabularyPack {
  items: VocabularyPackRow[];
}

type CoverageStatus = 'rich' | 'chinese-only' | 'none';

const BOOK_ID = 1;
const VOCABULARY_PATH = resolve(process.cwd(), 'public/data/vocabulary/book-1.json');
const EXAMPLES_PATH = resolve(process.cwd(), 'public/data/course-examples/book-1.json');
const REPORT_PATH = resolve(process.cwd(), 'output/course-examples/book-1-coverage.json');

function toFallbackCard(row: VocabularyPackRow): Flashcard | null {
  const location = parseVocabularyId(row.id);
  if (!location || !row.traditional) return null;
  return {
    id: row.id,
    front: row.traditional,
    back: row.meaning || '',
    bookId: location.bookId,
    lessonId: location.lessonId,
    partId: location.partId,
    examples: row.examples?.trim()
      ? [{ chinese: row.examples.trim(), pinyin: '', english: '' }]
      : [],
  };
}

async function main() {
  const [vocabularyContent, exampleContent] = await Promise.all([
    readFile(VOCABULARY_PATH, 'utf8'),
    readFile(EXAMPLES_PATH, 'utf8'),
  ]);
  const vocabularyPack = JSON.parse(vocabularyContent) as VocabularyPack;
  const examplePack = JSON.parse(exampleContent) as CourseExamplePack;
  const fallbackCards = vocabularyPack.items
    .map(toFallbackCard)
    .filter((card): card is Flashcard => card !== null);

  const cards = fallbackCards.map((card) => {
    const terms = [card.front, ...extractSearchVariants(card.front)];
    const richSources = recordsToExampleCards(examplePack.records, terms);
    const richExamples = findSmartExamplesForWord(richSources, card.front, card.id);
    const chineseOnlyExamples = richExamples.length === 0
      ? findSmartExamplesForWord(fallbackCards, card.front, card.id)
      : [];
    const status: CoverageStatus = richExamples.length > 0
      ? 'rich'
      : chineseOnlyExamples.length > 0
        ? 'chinese-only'
        : 'none';
    return {
      id: card.id,
      front: card.front,
      bookId: card.bookId,
      lessonId: card.lessonId,
      partId: card.partId,
      status,
      richExampleCount: richExamples.length,
      chineseOnlyExampleCount: chineseOnlyExamples.length,
    };
  });

  const lessons = Array.from(new Set(cards.map((card) => card.lessonId))).sort((a, b) => a - b)
    .map((lessonId) => {
      const lessonCards = cards.filter((card) => card.lessonId === lessonId);
      const count = (status: CoverageStatus) => lessonCards.filter((card) => card.status === status).length;
      return {
        lessonId,
        total: lessonCards.length,
        rich: count('rich'),
        chineseOnly: count('chinese-only'),
        none: count('none'),
        richPercent: Math.round((count('rich') / lessonCards.length) * 100),
      };
    });
  const count = (status: CoverageStatus) => cards.filter((card) => card.status === status).length;
  const report = {
    generatedAt: new Date().toISOString(),
    bookId: BOOK_ID,
    examplePackRecordCount: examplePack.count,
    totals: {
      cards: cards.length,
      rich: count('rich'),
      chineseOnly: count('chinese-only'),
      none: count('none'),
      richPercent: Math.round((count('rich') / cards.length) * 100),
    },
    lessons,
    cards,
  };

  await mkdir(resolve(REPORT_PATH, '..'), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Book 1 rich coverage: ${report.totals.rich}/${report.totals.cards} cards (${report.totals.richPercent}%).`);
  console.log(`Chinese-only fallback: ${report.totals.chineseOnly}; no usable example: ${report.totals.none}.`);
  console.log(`Coverage report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
