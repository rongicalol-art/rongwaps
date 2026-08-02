import { validateInteractiveLessons } from '../src/utils/validateInteractiveLessons';

const issues = validateInteractiveLessons();

if (issues.length > 0) {
  issues.forEach((issue) => console.error(`${issue.location}: ${issue.message}`));
  process.exitCode = 1;
} else {
  console.log('Interactive lesson content valid.');
}
