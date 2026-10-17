import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReviewHubCard } from '../../src/screens/library/components/ReviewHubCard';

test('daily review offers due failed words even before the first word is learned', () => {
  const html = renderToStaticMarkup(createElement(ReviewHubCard, {
    overview: { dueCount: 1, knownTotal: 0, stages: { learning: 0, solid: 0, started: 1 } },
    onStartReview() {},
    onNavigateToPath() {},
  }));
  assert.match(html, /Start review/);
  assert.doesNotMatch(html, /Explore lessons/);
});
