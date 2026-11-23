import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DailyReviewRow } from '../../src/screens/curriculum/components/DailyReviewRow';
import { HeaderStreak } from '../../src/screens/curriculum/components/HeaderStreak';
import type { ReviewOverview } from '../../src/utils/srs/reviewOverview';

const base: ReviewOverview = { dueCount: 12, knownTotal: 12, stages: { learning: 12, solid: 0, started: 0 } };
const row = (overview: Partial<ReviewOverview>) =>
  renderToStaticMarkup(createElement(DailyReviewRow, { overview: { ...base, ...overview }, onStart() {} }));

test('Learn shows the daily review with its size while words are due', () => {
  const html = row({ dailyCount: 12, dailyAnswered: 0 });
  assert.match(html, /Daily review/);
  assert.match(html, /12 words · 5 min/);
});

test('a review stopped halfway says how many words are left', () => {
  assert.match(row({ dailyCount: 5, dailyAnswered: 7 }), /5 words left/);
  assert.match(row({ dailyCount: 1, dailyAnswered: 11 }), /1 word left/);
});

test('the review row is gone once today is done or nothing is due', () => {
  assert.equal(row({ dailyCount: 4, dailyCompleted: true }), '');
  assert.equal(row({ dailyCount: 0, dueCount: 0 }), '');
});

test('the streak line greys out until today counts', () => {
  const cold = renderToStaticMarkup(createElement(HeaderStreak, { streak: 6, studiedToday: false }));
  const lit = renderToStaticMarkup(createElement(HeaderStreak, { streak: 7, studiedToday: true }));
  assert.match(cold, /6 day streak/);
  assert.match(cold, /study today to keep it/);
  assert.match(cold, /text-ui-muted-strong/);
  assert.match(lit, /7 day streak/);
  assert.match(lit, /text-streak-text/);
  assert.doesNotMatch(lit, /art-rest/);
});
