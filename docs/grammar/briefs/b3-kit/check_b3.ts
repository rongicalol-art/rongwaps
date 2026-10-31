// Usage (repo root): npx tsx docs/grammar/briefs/b3-kit/check_b3.ts Six
import { validateInteractiveLessons } from '../../../../src/utils/grammar/validateInteractiveLessons';
import { readFileSync } from 'node:fs';
const word = process.argv[2];
const root = new URL('../../../../', import.meta.url).pathname;
const readings = JSON.parse(readFileSync(root + 'content/readings/book-3.json', 'utf8'));
const file = JSON.parse(readFileSync(`${root}content/grammar/b3Lesson${word}.json`, 'utf8'));
const parts = Object.entries(file).filter(([k]) => k.includes('_PART_')).map(([, v]) => v);
const ref = JSON.parse(readFileSync(root + 'content/grammar/b3LessonFive.json', 'utf8')).LESSON_FIVE_PART_ONE.grammarPages[0];
const issues: string[] = [];
for (const part of parts as any[]) for (const page of part.grammarPages) {
  for (const key of Object.keys(ref)) if (!(key in page)) issues.push(`${page.id}: missing field "${key}" (Lesson 5 has it)`);
  for (const ex of page.examples ?? []) if (!ex.text?.words?.length) issues.push(`${page.id} ${ex.id}: example needs word tokens (text.words)`);
}
try {
  for (const i of validateInteractiveLessons(parts as any, readings)) if (!i.message.includes('unknown page')) issues.push(`${i.location}: ${i.message}`);
} catch (e) { issues.push('validator crashed: ' + (e as Error).message); }
console.log(issues.length ? issues.join('\n') : `OK: Lesson ${word} passes the lesson validator`);
process.exit(issues.length ? 1 : 0);
