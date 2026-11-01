/**
 * Check lesson-test drafts against the content rules before they are placed in content/lesson-tests.
 *
 *   npx tsx scripts/content/checkLessonTest.ts output/lesson-test-drafts/b1l01.json [more.json …] [--no-pictures]
 *
 * Prints every problem (untaught characters, shape, picture files, grammar coverage and review share in
 * every possible run) and exits 1 if there are any. `--no-pictures` skips missing picture files, for drafts
 * whose pictures are not drawn yet. Rules: scripts/content/lessonTestRules.ts.
 */
import { readFileSync } from 'node:fs';
import type { LessonTestLesson } from '../../src/types/lessonTest';
import { checkLessonTest, loadLessonTestContext } from './lessonTestRules';

const args = process.argv.slice(2);
const files = args.filter((arg) => !arg.startsWith('--'));
if (files.length === 0) {
  console.error('Usage: checkLessonTest.ts <lesson.json> [...] [--no-pictures]');
  process.exit(2);
}
const ctx = loadLessonTestContext();
let failed = false;
for (const file of files) {
  let lesson: LessonTestLesson;
  try {
    lesson = JSON.parse(readFileSync(file, 'utf-8')) as LessonTestLesson;
  } catch (error) {
    console.log(`${file}: not valid JSON (${(error as Error).message})`);
    failed = true;
    continue;
  }
  const problems = checkLessonTest(lesson, ctx, { pictures: !args.includes('--no-pictures') });
  const questions = lesson.slots?.reduce((sum, slot) => sum + (slot.versions[0]?.questions.length ?? 0), 0) ?? 0;
  if (problems.length === 0) {
    console.log(`${file}: OK (${lesson.slots.length} slots, ${questions} questions per run)`);
  } else {
    failed = true;
    console.log(`${file}: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    for (const problem of problems) console.log(`  - ${problem}`);
  }
}
process.exit(failed ? 1 : 0);
