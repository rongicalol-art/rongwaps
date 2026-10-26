import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppShellActions } from '../../src/app/hooks/useAppShellActions';
import { GrammarContinueFooter } from '../../src/screens/grammar-lesson/components/GrammarContinueFooter';

function shellActions() {
  const events: unknown[] = [];
  let actions: ReturnType<typeof useAppShellActions> | undefined;
  // Render only the callbacks, with all navigation mocked: no progress writes.
  function Harness() {
    actions = useAppShellActions({
      activeBookId: 1,
      collapseNav: () => {},
      setActiveActivity: () => {},
      startPartPractice: () => {},
      startPathPractice: () => {},
      openReader: () => { events.push('open-reader'); },
      openReaderForPart: (...target) => { events.push(['open-part-reader', ...target]); },
      closeReader: () => {},
      setActiveGrammarPartId: (partId) => { events.push(['grammar', partId]); },
      setActiveGrammarPageId: (pageId) => { events.push(['page', pageId]); },
      setIsSettingsOpen: () => {},
      setIsNavOpen: () => {},
      isDesktop: () => true,
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  assert.ok(actions);
  return { actions, events };
}

test('finishing grammar closes its window and selects reading without opening the reader', () => {
  const { actions, events } = shellActions();
  actions.handleOpenGrammarPart('B1L01-P1', null, () => { events.push('select-reading'); });
  events.length = 0;
  actions.handleFinishGrammar();
  assert.deepEqual(events, [['grammar', null], ['page', null], 'select-reading']);
  events.length = 0;
  actions.handleFinishGrammar();
  assert.deepEqual(events, [['grammar', null], ['page', null]]);
});

test('closing or switching grammar does not run an earlier completion action', () => {
  for (const leave of ['close', 'switch'] as const) {
    const { actions, events } = shellActions();
    actions.handleOpenGrammarPart('B1L01-P1', null, () => { events.push('select-reading'); });
    if (leave === 'close') actions.handleCloseGrammar();
    else actions.handleOpenGrammarPart('B1L01-P2');
    events.length = 0;
    actions.handleFinishGrammar();
    assert.deepEqual(events, [['grammar', null], ['page', null]]);
  }
});

test('an explicit reading launch still opens the requested part', () => {
  const { actions, events } = shellActions();
  actions.handleProceedToReading({ bookId: 1, lessonId: 2, partId: 3 });
  assert.deepEqual(events, [['grammar', null], ['page', null], ['open-part-reader', 1, 2, 3]]);
});

test('the final grammar footer says Done and keeps Practice when an exercise follows', () => {
  for (const continueLabel of [undefined, 'Practice']) {
    const html = renderToStaticMarkup(createElement(GrammarContinueFooter, {
      isVisible: true, contentReady: true, previousPage: null, isLastPage: true,
      continueLabel, onBack: () => {}, onContinue: () => {},
    }));
    assert.match(html, continueLabel ? />Practice</ : />Done</);
    assert.doesNotMatch(html, /Proceed to Reading|>Read</);
  }
});

test('a multi-part grammar session finishes each selected part before returning to reading', () => {
  const { actions, events } = shellActions();
  actions.handleOpenGrammarPart(['B1L01-P1', 'B1L01-P2', 'B1L01-P2', 'B1L01-P3'], null, () => { events.push('select-reading'); });
  assert.deepEqual(events, [['page', null], ['grammar', 'B1L01-P1']]);
  events.length = 0;
  actions.handleFinishGrammar();
  assert.deepEqual(events, [['page', null], ['grammar', 'B1L01-P2']]);
  events.length = 0;
  actions.handleFinishGrammar();
  assert.deepEqual(events, [['page', null], ['grammar', 'B1L01-P3']]);
  events.length = 0;
  actions.handleFinishGrammar();
  assert.deepEqual(events, [['grammar', null], ['page', null], 'select-reading']);
});

test('closing a multi-part grammar session clears its pending parts and completion', () => {
  const { actions, events } = shellActions();
  actions.handleOpenGrammarPart(['B1L01-P1', 'B1L01-P2'], null, () => { events.push('select-reading'); });
  actions.handleCloseGrammar();
  events.length = 0;
  actions.handleFinishGrammar();
  assert.deepEqual(events, [['grammar', null], ['page', null]]);
});

test('a reading launch carries all selected parts', () => {
  const { actions, events } = shellActions();
  actions.handleProceedToReading({ bookId: 1, lessonId: 2, partId: [1, 2] });
  assert.deepEqual(events, [['grammar', null], ['page', null], ['open-part-reader', 1, 2, [1, 2]]]);
});
