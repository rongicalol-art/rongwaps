import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateInteractiveLessons } from '../../src/utils/grammar/validateInteractiveLessons';
import type { InteractiveGrammarPart, ReadingRecord } from '../../src/types/models';

const ROOT = process.cwd();
const grammarPack = JSON.parse(readFileSync(resolve(ROOT, 'public/data/grammar/book-1.json'), 'utf8')) as { items: InteractiveGrammarPart[] };
const readingsPack = JSON.parse(readFileSync(resolve(ROOT, 'public/data/readings/book-1.json'), 'utf8')) as { items: ReadingRecord[] };

const issues = validateInteractiveLessons(grammarPack.items, readingsPack.items);

if (issues.length > 0) {
  issues.forEach((issue) => console.error(`${issue.location}: ${issue.message}`));
  process.exitCode = 1;
} else {
  console.log('Interactive lesson content valid.');
}
