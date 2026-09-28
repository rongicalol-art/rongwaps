import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Replicates the activeFocusModeKey derivation from App.tsx
 * to verify focus mode priority and transition detection.
 */
function deriveActiveFocusModeKey({
  isReaderOpen,
  activeReadingIndex,
  isGrammarOpen,
  activeGrammarPartId,
  dictionaryWord,
  activeActivity,
}: {
  isReaderOpen: boolean;
  activeReadingIndex: number | null;
  isGrammarOpen: boolean;
  activeGrammarPartId: string | null;
  dictionaryWord: string | null;
  activeActivity: string | null;
}): string | null {
  return isReaderOpen
    ? `reader:${activeReadingIndex}`
    : isGrammarOpen
      ? `grammar:${activeGrammarPartId}`
      : dictionaryWord
        ? `dictionary:${dictionaryWord}`
        : activeActivity
          ? `activity:${activeActivity}`
          : null;
}

test('focus mode key transitions properly from null to practice activity', () => {
  const key = deriveActiveFocusModeKey({
    isReaderOpen: false,
    activeReadingIndex: null,
    isGrammarOpen: false,
    activeGrammarPartId: null,
    dictionaryWord: null,
    activeActivity: 'flashcards',
  });
  assert.equal(key, 'activity:flashcards');
});

test('opening grammar overlay while practice activity is active transitions focus mode key to grammar', () => {
  // Previously, activeActivity took precedence over isGrammarOpen, masking the transition.
  // With prioritized overlay order, opening grammar while in practice triggers a key change.
  const practiceKey = deriveActiveFocusModeKey({
    isReaderOpen: false,
    activeReadingIndex: null,
    isGrammarOpen: false,
    activeGrammarPartId: null,
    dictionaryWord: null,
    activeActivity: 'flashcards',
  });
  assert.equal(practiceKey, 'activity:flashcards');

  const grammarKey = deriveActiveFocusModeKey({
    isReaderOpen: false,
    activeReadingIndex: null,
    isGrammarOpen: true,
    activeGrammarPartId: 'b1_l1_p1',
    dictionaryWord: null,
    activeActivity: 'flashcards', // Still running in background underneath modal
  });
  assert.equal(grammarKey, 'grammar:b1_l1_p1');
  assert.notEqual(grammarKey, practiceKey, 'Key must change so reactive effect fires collapseNav()');
});

test('opening reading overlay while practice activity is active transitions focus mode key to reader', () => {
  const practiceKey = deriveActiveFocusModeKey({
    isReaderOpen: false,
    activeReadingIndex: null,
    isGrammarOpen: false,
    activeGrammarPartId: null,
    dictionaryWord: null,
    activeActivity: 'flashcards',
  });
  assert.equal(practiceKey, 'activity:flashcards');

  const readerKey = deriveActiveFocusModeKey({
    isReaderOpen: true,
    activeReadingIndex: 0,
    isGrammarOpen: false,
    activeGrammarPartId: null,
    dictionaryWord: null,
    activeActivity: 'flashcards',
  });
  assert.equal(readerKey, 'reader:0');
  assert.notEqual(readerKey, practiceKey, 'Key must change so reactive effect fires collapseNav()');
});

test('switching from grammar to reading transitions focus mode key', () => {
  const grammarKey = deriveActiveFocusModeKey({
    isReaderOpen: false,
    activeReadingIndex: null,
    isGrammarOpen: true,
    activeGrammarPartId: 'b1_l1_p1',
    dictionaryWord: null,
    activeActivity: null,
  });

  const readerKey = deriveActiveFocusModeKey({
    isReaderOpen: true,
    activeReadingIndex: 1,
    isGrammarOpen: false,
    activeGrammarPartId: null,
    dictionaryWord: null,
    activeActivity: null,
  });

  assert.equal(grammarKey, 'grammar:b1_l1_p1');
  assert.equal(readerKey, 'reader:1');
  assert.notEqual(grammarKey, readerKey);
});

test('closing all focus modes transitions key to null for desktop preference restore', () => {
  const key = deriveActiveFocusModeKey({
    isReaderOpen: false,
    activeReadingIndex: null,
    isGrammarOpen: false,
    activeGrammarPartId: null,
    dictionaryWord: null,
    activeActivity: null,
  });
  assert.equal(key, null);
});
