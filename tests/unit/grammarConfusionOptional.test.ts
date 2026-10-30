import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTestGrammarParts,
  getTestReadings,
  validateInteractiveLessons,
} from '../acceptance_helpers';

const grammarParts = getTestGrammarParts(2);
const readings = getTestReadings(2);
const lessonNinePart = grammarParts.find((part) => part.id === 'B2L09-P01-D01');
assert.ok(lessonNinePart, 'Book 2 Lesson 9 Part 1 is exported');

test('confusion blocks are optional, but malformed present blocks fail validation', () => {
  const withoutConfusion = structuredClone(grammarParts);
  const pageWithoutConfusion = withoutConfusion
    .find((part) => part.id === 'B2L09-P01-D01')!
    .grammarPages[0];
  delete pageWithoutConfusion.confusion;
  assert.deepEqual(validateInteractiveLessons(withoutConfusion, readings), []);

  const malformedConfusion = structuredClone(grammarParts);
  malformedConfusion
    .find((part) => part.id === 'B2L09-P01-D01')!
    .grammarPages[0].confusion = { title: '', items: [] };
  const issues = validateInteractiveLessons(malformedConfusion, readings);
  assert.ok(issues.some((issue) =>
    issue.location === `${lessonNinePart.id} grammar 1 confusion`
      && issue.message === 'A confusion block needs a title and at least one item.',
  ));
});

test('simplified 裡 remains valid when 阿里山 also appears in the sentence', () => {
  const parts = structuredClone(grammarParts);
  const text = parts.find((part) => part.id === 'B2L09-P01-D01')!.grammarPages[0].examples[0].text;
  text.traditional = '阿里山那裡的日出很美。';
  text.simplified = '阿里山那里的日出很美。';
  assert.ok(!validateInteractiveLessons(parts, readings).some((issue) => issue.message.includes('阿里山那里的日出')));

  text.simplified = '阿里山那里的日出很山。';
  assert.ok(validateInteractiveLessons(parts, readings).some((issue) => issue.message.includes('阿里山那里的日出')));

  text.simplified = '阿里山那里的日出很u。';
  assert.ok(validateInteractiveLessons(parts, readings).some((issue) => issue.message.includes('阿里山那里的日出')));
});
