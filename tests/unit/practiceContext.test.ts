import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppNavigation } from '../../src/hooks/useAppNavigation';
import { PERSISTED_KEYS, useAppStore } from '../../src/store/useAppStore';
import type { ActivityType } from '../../src/types/models';

function navigation() {
  let actions!: ReturnType<typeof useAppNavigation>;
  function Harness() {
    actions = useAppNavigation();
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  return actions;
}

const modes: ActivityType[] = ['pinyin', 'writing', 'sentences', 'tones', 'listening', 'flashcards', 'quiz'];

test('lesson launch context survives reload and mode switches without a lesson window', () => {
  for (const mode of modes) {
    useAppStore.setState({ ...useAppStore.getInitialState(), activeBookId: 1 });
    navigation().startPartPractice(2, 1, mode);
    assert.equal(useAppStore.getState().practiceContext, 'lesson');
    const saved = Object.fromEntries(PERSISTED_KEYS.map(key => [key, useAppStore.getState()[key]]));
    useAppStore.setState({ ...useAppStore.getInitialState(), ...saved });
    assert.equal(useAppStore.getState().isLessonWindowOpen, false);
    assert.equal(useAppStore.getState().activeActivity, mode);
    assert.equal(useAppStore.getState().practiceContext, 'lesson');
    assert.deepEqual(useAppStore.getState().selectedLessonParts, { '1:2': [1] });
    // Restarting/reselecting a mode and switching modes must retain the launch origin.
    useAppStore.getState().setActiveActivity(mode);
    assert.equal(useAppStore.getState().practiceContext, 'lesson');
    useAppStore.getState().setActiveActivity('writing');
    assert.equal(useAppStore.getState().practiceContext, 'lesson');
    useAppStore.getState().setActiveActivity(null);
    assert.equal(useAppStore.getState().practiceContext, null);
  }
});

test('independent launch stays independent even with one selected lesson and an open lesson window', () => {
  useAppStore.setState({ ...useAppStore.getInitialState(), activeBookId: 1, isLessonWindowOpen: true,
    selectedLessonParts: { '1:2': [1] }, lastActivity: 'pinyin' });
  navigation().startPathPractice();
  assert.equal(useAppStore.getState().practiceContext, 'independent');
  useAppStore.getState().setActiveActivity('writing');
  assert.equal(useAppStore.getState().practiceContext, 'independent');
});

test('review, library, close and account switch cannot retain lesson context', () => {
  for (const destination of ['flashcards-library', 'flashcards-review', 'create-card', null] as const) {
    useAppStore.getState().setActiveActivity('pinyin', 'lesson');
    useAppStore.getState().setActiveActivity(destination);
    assert.notEqual(useAppStore.getState().practiceContext, 'lesson');
  }
  useAppStore.getState().setActiveActivity('pinyin', 'lesson');
  useAppStore.getState().resetAccountScopedState();
  assert.equal(useAppStore.getState().practiceContext, null);
});
