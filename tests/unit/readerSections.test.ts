import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReaderSection } from '../../src/screens/reader/components/ReaderSection';
import type { ReadingRecord } from '../../src/types/models';

const reading: ReadingRecord = {
  id: 'B1L01-R02', bookId: 1, lessonId: 1, dialogueNumber: 2,
  title: '對話二', setting: '', printedPages: [], audioReference: '', paragraphs: [],
};

function section(grouped: boolean, first: boolean) {
  return renderToStaticMarkup(createElement(ReaderSection, {
    reading, index: 1, grouped, first, characterPreference: 'traditional',
    showPinyin: false, showMeaning: false, showHoverDefinitions: true, textSize: 'normal',
    activeLineIndex: null, currentTime: 0, hasFinished: false,
    followAudioRef: { current: false }, onPlay: () => {},
  }));
}

test('combined reading sections label each part and divide only between parts', () => {
  assert.match(section(true, true), /<h2[^>]*>Part 2<\/h2>/);
  assert.doesNotMatch(section(true, true), /<hr/);
  assert.match(section(true, false), /<hr[^>]*border-ui-border/);
  assert.match(section(true, false), /aria-label="Play Part 2"/);
  assert.doesNotMatch(section(false, true), /<hr|<h2/);
});
