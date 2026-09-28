import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Pure helper mirroring WritingScreen's tap navigation boundary detection.
 */
function resolveTapNavigation(
  clientX: number,
  bounds: { left: number; width: number },
  currentIndex: number,
  totalCards: number,
): 'prev' | 'next' | 'none' {
  const horizontalPosition = (clientX - bounds.left) / bounds.width;
  if (horizontalPosition <= 0.4) {
    return currentIndex > 0 ? 'prev' : 'none';
  }
  if (horizontalPosition >= 0.6) {
    return currentIndex < totalCards - 1 ? 'next' : 'none';
  }
  return 'none';
}

/**
 * Pure helper mirroring keyboard navigation in WritingScreen.
 */
function resolveKeyNavigation(
  key: string,
  currentIndex: number,
  totalCards: number,
): 'prev' | 'next' | 'none' {
  if (key === 'ArrowLeft') {
    return currentIndex > 0 ? 'prev' : 'none';
  }
  if (key === 'ArrowRight') {
    return currentIndex < totalCards - 1 ? 'next' : 'none';
  }
  return 'none';
}

/**
 * Pure helper mirroring useWriting's single-character restart logic.
 */
function restartCurrentCharacter(
  completedChars: Set<number>,
  activeCharIndex: number,
): Set<number> {
  const next = new Set(completedChars);
  next.delete(activeCharIndex);
  return next;
}

test('resolves tap on left 40% of screen to previous card', () => {
  const bounds = { left: 0, width: 400 };
  assert.equal(resolveTapNavigation(100, bounds, 1, 5), 'prev');
  assert.equal(resolveTapNavigation(0, bounds, 1, 5), 'prev');
  assert.equal(resolveTapNavigation(160, bounds, 1, 5), 'prev');
});

test('left tap on first card does not navigate before index 0', () => {
  const bounds = { left: 0, width: 400 };
  assert.equal(resolveTapNavigation(50, bounds, 0, 5), 'none');
});

test('resolves tap on right 40% of screen to next card', () => {
  const bounds = { left: 0, width: 400 };
  assert.equal(resolveTapNavigation(240, bounds, 1, 5), 'next');
  assert.equal(resolveTapNavigation(350, bounds, 1, 5), 'next');
  assert.equal(resolveTapNavigation(400, bounds, 1, 5), 'next');
});

test('right tap on last card does not navigate past end', () => {
  const bounds = { left: 0, width: 400 };
  assert.equal(resolveTapNavigation(350, bounds, 4, 5), 'none');
});

test('taps in the center 20% canvas deadzone do not trigger card navigation', () => {
  const bounds = { left: 0, width: 400 };
  assert.equal(resolveTapNavigation(180, bounds, 1, 5), 'none');
  assert.equal(resolveTapNavigation(200, bounds, 1, 5), 'none');
  assert.equal(resolveTapNavigation(220, bounds, 1, 5), 'none');
});

test('resolves ArrowLeft and ArrowRight keyboard navigation', () => {
  assert.equal(resolveKeyNavigation('ArrowLeft', 2, 5), 'prev');
  assert.equal(resolveKeyNavigation('ArrowLeft', 0, 5), 'none');
  assert.equal(resolveKeyNavigation('ArrowRight', 2, 5), 'next');
  assert.equal(resolveKeyNavigation('ArrowRight', 4, 5), 'none');
  assert.equal(resolveKeyNavigation('Space', 2, 5), 'none');
});

test('single-character restart preserves earlier completed characters in multi-character words', () => {
  const initialCompleted = new Set([0, 1]);
  const activeCharIndex = 1;
  const afterRestart = restartCurrentCharacter(initialCompleted, activeCharIndex);

  assert.equal(afterRestart.has(0), true, 'First character remains completed');
  assert.equal(afterRestart.has(1), false, 'Second character is cleared for re-quizzing');
  assert.equal(afterRestart.size, 1);
});
