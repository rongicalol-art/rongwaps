import assert from 'node:assert/strict';
import test from 'node:test';

import {
  alignmentDuration,
  lineIndexForTime,
  wordRangeForTime,
} from '../src/utils/dialogueSync';
import type { DialogueAlignment } from '../src/data/dialogueAlignment';

const alignment: DialogueAlignment = {
  audioFile: 'B1-01-1-1.mp3',
  lessonId: 1,
  dialogueNumber: 1,
  trimSec: 18.2,
  lines: [
    {
      index: 0,
      speaker: '中明',
      text: '宜文，她是誰？',
      start: 1.04,
      end: 3.2,
      words: [
        { w: '宜文', start: 1.04, end: 1.8, charStart: 0, charEnd: 2 },
        { w: '她是誰', start: 2.0, end: 3.2, charStart: 3, charEnd: 6 },
      ],
    },
    {
      index: 1,
      speaker: '宜文',
      text: '她是新同學，叫友美。她很可愛。',
      start: 3.5,
      end: 8.1,
      words: [
        { w: '她是新同學', start: 3.5, end: 5.0, charStart: 0, charEnd: 5 },
        { w: '叫友美', start: 5.3, end: 6.6, charStart: 6, charEnd: 9 },
        { w: '她很可愛', start: 6.9, end: 8.1, charStart: 10, charEnd: 14 },
      ],
    },
  ],
};

test('lineIndexForTime maps time to the speaking line', () => {
  assert.equal(lineIndexForTime(alignment, 0.5), null); // before first line
  assert.equal(lineIndexForTime(alignment, 1.04), 0);
  assert.equal(lineIndexForTime(alignment, 2.5), 0);
  assert.equal(lineIndexForTime(alignment, 3.2), 0); // at boundary
  assert.equal(lineIndexForTime(alignment, 3.5), 1);
  assert.equal(lineIndexForTime(alignment, 7.0), 1);
  assert.equal(lineIndexForTime(alignment, 99), 1); // past end clamps to last
});

test('wordRangeForTime returns the char range of the spoken word', () => {
  const rendered = '宜文，她是誰？';
  assert.deepEqual(wordRangeForTime(alignment, 0, 1.5, rendered), { start: 0, end: 2 });
  assert.deepEqual(wordRangeForTime(alignment, 0, 2.5, rendered), { start: 3, end: 6 });
});

test('wordRangeForTime returns null between words or outside the line', () => {
  const rendered = '宜文，她是誰？';
  assert.equal(wordRangeForTime(alignment, 0, 1.9, rendered), null); // between words
  assert.equal(wordRangeForTime(alignment, 0, 0.5, rendered), null); // before line
  assert.equal(wordRangeForTime(alignment, 0, 3.3, rendered), null); // past line end
});

test('wordRangeForTime degrades to null when rendered length differs', () => {
  assert.equal(wordRangeForTime(alignment, 0, 2.5, 'short'), null);
});

test('wordRangeForTime returns null when the word lacks char offsets', () => {
  const noOffsets: DialogueAlignment = {
    ...alignment,
    lines: [{
      ...alignment.lines[0],
      words: [{ w: '宜文', start: 1.04, end: 1.8 }],
    }],
  };
  assert.equal(wordRangeForTime(noOffsets, 0, 1.5, '宜文，她是誰？'), null);
});

test('wordRangeForTime locates words sequentially in longer lines', () => {
  const rendered = '她是新同學，叫友美。她很可愛。';
  assert.deepEqual(wordRangeForTime(alignment, 1, 4.0, rendered), { start: 0, end: 5 });
  assert.deepEqual(wordRangeForTime(alignment, 1, 5.5, rendered), { start: 6, end: 9 });
  assert.deepEqual(wordRangeForTime(alignment, 1, 7.5, rendered), { start: 10, end: 14 });
});

test('alignmentDuration is the end of the last line', () => {
  assert.equal(alignmentDuration(alignment), 8.1);
});
