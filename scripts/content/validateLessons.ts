import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateInteractiveLessons, type LessonValidationIssue } from '../../src/utils/grammar/validateInteractiveLessons';
import type { InteractiveGrammarPart, ReadingRecord } from '../../src/types/models';

const ROOT = process.cwd();
const books = [1, 2, 3];
const allIssues: LessonValidationIssue[] = [];

for (const bookId of books) {
  const grammarPath = resolve(ROOT, `public/data/grammar/book-${bookId}.json`);
  const readingsPath = resolve(ROOT, `public/data/readings/book-${bookId}.json`);
  if (!existsSync(grammarPath) || !existsSync(readingsPath)) continue;

  const grammarPack = JSON.parse(readFileSync(grammarPath, 'utf8')) as { items: InteractiveGrammarPart[] };
  const readingsPack = JSON.parse(readFileSync(readingsPath, 'utf8')) as { items: ReadingRecord[] };

  const issues = validateInteractiveLessons(grammarPack.items, readingsPack.items);
  allIssues.push(...issues);
}

if (allIssues.length > 0) {
  allIssues.forEach((issue) => console.error(`${issue.location}: ${issue.message}`));
  process.exitCode = 1;
} else {
  console.log('Interactive lesson content valid.');
}
