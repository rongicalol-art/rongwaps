import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCharacterPlan } from '../scripts/memory-hooks/pipeline';
import { mergePlanningLexicon } from '../scripts/memory-hooks/planningLexicon';
import type {
  BookCharacterInventoryEntry,
  ComponentLexiconEntry,
} from '../src/features/character-memory-hooks/model';

const base = new Map<string, ComponentLexiconEntry>([
  ['g:子', {
    key: 'g:子',
    glyph: '子',
    senses: [{ id: '子:core-v1', label: 'child', sourceRefs: ['pilot-lexicon'], safeForMemoryAid: true }],
  }],
]);

test('approved curated labels fill missing glyphs without overriding the pilot lexicon', () => {
  const lexicon = mergePlanningLexicon({
    base,
    curated: [
      { glyph: '𦥯', label: 'schoolhouse', status: 'approved', use: 'label' },
      { glyph: '子', label: 'kid', status: 'approved', use: 'label' },
    ],
    proposals: [],
  });
  assert.equal(lexicon.get('g:𦥯')?.senses[0].label, 'schoolhouse');
  assert.equal(lexicon.get('g:𦥯')?.senses[0].safeForMemoryAid, true);
  assert.equal(lexicon.get('g:𦥯')?.senses[0].sourceRefs[0], 'book-1-curated-component-labels-v1');
  assert.equal(lexicon.get('g:子')?.senses[0].label, 'child');
});

test('skip-marked and invalid curated labels never become senses', () => {
  const lexicon = mergePlanningLexicon({
    base,
    curated: [
      { glyph: '壬', label: 'pole', status: 'approved', use: 'skip' },
      { glyph: '咼', label: 'one two three four', status: 'approved', use: 'label' },
      { glyph: '⺊', label: 'crack', status: 'approved', use: 'skip' },
    ],
    proposals: [],
  });
  assert.equal(lexicon.has('g:壬'), false);
  assert.equal(lexicon.has('g:咼'), false);
  assert.equal(lexicon.has('g:⺊'), false);
});

test('only high-confidence proposal labels fill remaining glyphs', () => {
  const lexicon = mergePlanningLexicon({
    base,
    curated: [],
    proposals: [
      { glyph: '目', metadataStatus: 'candidate-review', existingCandidateLabels: [{ label: 'eye', confidence: 'high' }] },
      { glyph: '見', metadataStatus: 'review-required', existingCandidateLabels: [{ label: 'see', confidence: 'medium' }] },
      { glyph: '可', metadataStatus: 'candidate-review', existingCandidateLabels: [{ label: 'can', confidence: 'high' }] },
      { glyph: '吾', metadataStatus: 'candidate-review', existingCandidateLabels: [{ label: 'I', confidence: 'high' }] },
    ],
  });
  assert.equal(lexicon.get('g:目')?.senses[0].label, 'eye');
  assert.equal(lexicon.get('g:目')?.senses[0].sourceRefs[0], 'book-1-frozen-47-component-label-proposals-v1');
  assert.equal(lexicon.has('g:見'), false);
  assert.equal(lexicon.has('g:可'), false);
  assert.equal(lexicon.has('g:吾'), false);
});

test('curated labels unblock an otherwise sense-less plan (學)', () => {
  const lexicon = mergePlanningLexicon({
    base,
    curated: [{ glyph: '𦥯', label: 'schoolhouse', status: 'approved', use: 'label' }],
    proposals: [],
  });
  const inventory: BookCharacterInventoryEntry = {
    character: '學',
    bookId: 1,
    firstVocabularyId: 'B1L06-3-03',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'learn',
      selectedPinyin: 'xué',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: null,
      reviewReasons: [],
    },
  };
  const plan = buildCharacterPlan({
    inventory,
    runtimeRecord: {
      recordId: 'U+5B78',
      sourceId: 'fixture',
      tree: ['s', '⿱', [['g', '𦥯'], ['g', '子']]],
    },
    decompositionVersion: 'fixture-v1',
    lexicon,
  });

  assert.equal(plan.status, 'eligible');
  assert.deepEqual(plan.components.map((component) => component.label), ['schoolhouse', 'child']);
});
