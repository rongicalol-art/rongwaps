import assert from 'node:assert/strict';
import test from 'node:test';
import { COMPONENT_LEXICON_BY_KEY } from '../src/data/memoryHooks/componentLexicon';
import type {
  BookCharacterInventoryEntry,
  CharacterHookPlanV2,
  GeneratedMemoryHookCandidate,
} from '../src/features/character-memory-hooks/model';
import {
  BOOK_ONE_PILOT_SELECTION,
  buildCharacterPlan,
  chooseCanonicalMeaning,
  flagPossibleMetadataCollisions,
  isCharacterEntryVariant,
  parseClassifierAnnotation,
  validateGeneratedCandidate,
} from '../scripts/memory-hooks/pipeline';
import {
  buildPilotQualityPlan,
  validateHookQualityDeterministically,
} from '../scripts/memory-hooks/qualityPlanner';
import { evaluateHookStylePreflight } from '../scripts/memory-hooks/stylePreflight';
import { renderDeterministicCandidate } from '../scripts/memory-hooks/deterministicRenderer';

test('canonical meaning aligns repeated lesson senses with character metadata', () => {
  const decision = chooseCanonicalMeaning([
    { vocabularyId: 'B1L01-2-08', word: '好', pinyin: 'hǎo', meaning: 'fine; good; well; nice; ok', standalone: true },
    { vocabularyId: 'B1L04-1-04', word: '好', pinyin: 'hǎo', meaning: 'very', standalone: true },
  ], {
    character: '好',
    definition: 'good; excellent; well',
    pinyin: ['hǎo'],
  });

  assert.equal(decision.selectedMeaning, 'good');
  assert.equal(decision.method, 'lesson-dictionary-alignment');
  assert.equal(decision.lessonSpecificMeanings.length, 2);
  assert.ok(decision.reviewReasons.includes('multiple-standalone-lesson-senses'));
});

test('canonical meaning checks every dictionary gloss before using its first gloss', () => {
  const result = chooseCanonicalMeaning([
    { vocabularyId: 'transport', word: '坐', pinyin: 'zuò', meaning: 'to take (transportations)', standalone: true },
    { vocabularyId: 'sit', word: '坐', pinyin: 'zuò', meaning: 'to sit', standalone: true },
  ], { character: '坐', definition: 'seat; to sit; to ride, to travel by', pinyin: ['zuò'] });

  assert.equal(result.selectedMeaning, 'sit');
  assert.equal(result.method, 'lesson-dictionary-alignment');
});

test('canonical learner meaning separates classifier notes from the target label', () => {
  const result = chooseCanonicalMeaning([
    {
      vocabularyId: 'B1L07-2-08',
      word: '信',
      pinyin: 'xìn',
      meaning: 'letter (M: 封fēng)',
      standalone: true,
    },
  ], {
    character: '信',
    definition: 'to trust, to believe; letter, sign',
    pinyin: ['xìn'],
  });

  assert.equal(result.selectedMeaning, 'letter');
  assert.deepEqual(result.selectedClassifier, {
    raw: '(M: 封fēng)',
    entries: [{ character: '封', pinyin: 'fēng' }],
    source: 'lesson-vocabulary',
  });
  assert.equal(parseClassifierAnnotation('room (M: 個,間jiān)')?.entries.length, 2);
});

test('optional course notation identifies a character-level entry', () => {
  assert.equal(isCharacterEntryVariant('裡（面）', '裡'), true);
  assert.equal(isCharacterEntryVariant('哪裡/哪兒', '裡'), false);
  assert.equal(isCharacterEntryVariant('（一）點（兒）', '點'), true);
});

test('duplicate variant metadata is flagged instead of silently trusted', () => {
  const makeEntry = (character: string): BookCharacterInventoryEntry => ({
    character,
    bookId: 1,
    firstVocabularyId: character,
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'unit of distance',
      selectedPinyin: 'lǐ',
      method: 'dictionary-core-gloss',
      confidence: 'low',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'unit of distance',
      reviewReasons: [],
    },
  });
  const flagged = flagPossibleMetadataCollisions([makeEntry('裡'), makeEntry('里')]);
  assert.ok(flagged.every((entry) => entry.meaningDecision.reviewReasons.includes('possible-variant-metadata-collision')));
});

test('component role hints never become target-character relationship roles', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '媽',
    bookId: 1,
    firstVocabularyId: 'B1L01-1-01',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'mother',
      selectedPinyin: 'mā',
      method: 'dictionary-core-gloss',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'mother',
      reviewReasons: [],
    },
  };
  const plan = buildCharacterPlan({
    inventory,
    runtimeRecord: {
      recordId: 'U+5ABD',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '女'], ['g', '馬']]],
    },
    decompositionVersion: 'fixture-v1',
    lexicon: COMPONENT_LEXICON_BY_KEY,
  });

  assert.equal(plan.status, 'eligible');
  assert.equal(plan.proposedKind, 'memory-aid');
  assert.deepEqual(plan.components.map((component) => component.role), ['unclassified', 'unclassified']);
});

test('unencoded direct components block automatic generation', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '不',
    bookId: 1,
    firstVocabularyId: 'B1L01-1-01',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'not',
      selectedPinyin: 'bù',
      method: 'dictionary-core-gloss',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'not',
      reviewReasons: [],
    },
  };
  const plan = buildCharacterPlan({
    inventory,
    runtimeRecord: {
      recordId: 'U+4E0D',
      sourceId: 'fixture',
      tree: ['s', '⿱', [['g', '一'], ['u', 'fixture:three-stroke', 3]]],
    },
    decompositionVersion: 'fixture-v1',
    lexicon: COMPONENT_LEXICON_BY_KEY,
  });

  assert.equal(plan.status, 'needs-review');
  assert.ok(plan.blockers.includes('unresolved-direct-component'));
});

test('validator rejects historical claims in an unsourced memory aid', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '休',
    bookId: 1,
    firstVocabularyId: 'B1L01-1-01',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'rest',
      selectedPinyin: 'xiū',
      method: 'dictionary-core-gloss',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'rest',
      reviewReasons: [],
    },
  };
  const plan = buildCharacterPlan({
    inventory,
    runtimeRecord: {
      recordId: 'U+4F11',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '亻'], ['g', '木']]],
    },
    decompositionVersion: 'fixture-v1',
    lexicon: COMPONENT_LEXICON_BY_KEY,
  });
  const candidate: GeneratedMemoryHookCandidate = {
    character: '休',
    kind: 'memory-aid',
    canonicalMeaning: 'rest',
    hook: 'Ancient people used 亻(person) beside 木(tree), so 休 means rest.',
    componentRefs: ['g:亻', 'g:木'],
    evidenceRefs: [],
    model: 'fixture',
    promptVersion: 'fixture',
  };

  const result = validateGeneratedCandidate(plan, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'unsupported-origin-language'));
});

test('validator rejects components that were not supplied by the plan', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '休',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'rest',
      selectedPinyin: 'xiū',
      method: 'dictionary-core-gloss',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'rest',
      reviewReasons: [],
    },
  };
  const plan = buildCharacterPlan({
    inventory,
    runtimeRecord: {
      recordId: 'U+4F11',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '亻'], ['g', '木']]],
    },
    decompositionVersion: 'fixture-v1',
    lexicon: COMPONENT_LEXICON_BY_KEY,
  });
  const result = validateGeneratedCandidate(plan, {
    character: '休',
    kind: 'memory-aid',
    canonicalMeaning: 'rest',
    hook: '亻(person) rests by 木(tree) and drinks 水(water), making rest easy.',
    componentRefs: ['g:亻', 'g:木'],
    evidenceRefs: [],
    model: 'fixture',
    promptVersion: 'fixture',
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'unexpected-han-glyph'));
  assert.ok(result.issues.some((issue) => issue.code === 'unexpected-component-token'));
});

test('atomic origin hooks require exact cleared target evidence', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '人',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'person',
      selectedPinyin: 'rén',
      method: 'dictionary-core-gloss',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'person',
      reviewReasons: [],
    },
  };
  const plan = buildCharacterPlan({
    inventory,
    runtimeRecord: { recordId: 'U+4EBA', sourceId: 'fixture', tree: ['g', '人'] },
    decompositionVersion: 'fixture-v1',
    lexicon: COMPONENT_LEXICON_BY_KEY,
    originEvidence: [{
      targetCharacter: '人',
      canonicalMeaning: 'person',
      componentKeys: [],
      claim: 'A sourced historical-shape explanation for the fixture.',
      sourceRefs: ['licensed-fixture'],
      confidence: 'high',
      licenseStatus: 'cleared',
    }],
  });

  assert.equal(plan.status, 'eligible');
  assert.equal(plan.proposedKind, 'origin');
  assert.deepEqual(plan.evidenceRefs, ['licensed-fixture']);
});

test('pilot selection contains 30 unique Book 1 targets', () => {
  assert.equal(BOOK_ONE_PILOT_SELECTION.length, 30);
  assert.equal(new Set(BOOK_ONE_PILOT_SELECTION.map((entry) => entry.character)).size, 30);
});

test('V2 坐 plan uses only target-scoped visual labels and remains a candidate', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '坐',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'sit',
      selectedPinyin: 'zuò',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'seat; to sit',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿻', [['g', '土'], ['g', '从']]],
    },
    decompositionVersion: 'fixture-v2',
  });

  assert.equal(plan.status, 'candidate');
  assert.equal(plan.frame.kind, 'formation');
  if (plan.frame.kind !== 'formation') return;
  assert.deepEqual(plan.frame.components.map((component) => component.displayLabel), ['ground', 'two people']);
  assert.deepEqual(plan.frame.renderSpec, {
    kind: 'visual-relation',
    subjectOccurrenceId: '坐:1',
    relation: 'sit-on',
    objectOccurrenceId: '坐:0',
  });
  assert.ok(plan.reviewReasons.some((reason) => reason.startsWith('evidence-license-not-cleared')));
});

test('hybrid renderer creates deterministic formation hooks without model prose', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '情',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'emotion',
      selectedPinyin: 'qíng',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'emotion, feeling',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '忄'], ['g', '青']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const rendered = renderDeterministicCandidate(plan);

  assert.equal(rendered.error, null);
  assert.equal(rendered.candidate?.hook, '忄(heart) connects to 情(emotion) because feelings and emotions are associated with the heart, while 青(qīng) hints at the pronunciation—qíng.');
  if (!rendered.candidate) return;
  assert.equal(validateHookQualityDeterministically(plan, rendered.candidate).valid, true);
});

test('hybrid renderer connects 請 meaning and pronunciation deterministically', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '請',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'invite',
      selectedPinyin: 'qǐng',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'to invite; to ask',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '言'], ['g', '青']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const rendered = renderDeterministicCandidate(plan);

  assert.equal(rendered.error, null);
  assert.equal(rendered.candidate?.hook, '言(speech) connects to 請(invite) because inviting or asking someone is done through speech, while 青(qīng) hints at the pronunciation—qǐng.');
  if (!rendered.candidate) return;
  assert.equal(validateHookQualityDeterministically(plan, rendered.candidate).valid, true);
});

test('missing semantic bridge stays reviewable instead of becoming NoHook', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '媽',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'mother',
      selectedPinyin: 'mā',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'mother',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '女'], ['g', '馬']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const rendered = renderDeterministicCandidate(plan);

  assert.equal(plan.status, 'candidate');
  assert.equal(plan.frame.kind, 'formation');
  assert.ok(plan.reviewReasons.includes('missing-semantic-bridge:formation'));
  assert.equal(rendered.candidate, null);
  assert.match(rendered.error ?? '', /missing-semantic-bridge/);
});

test('formation validator rejects missing, mismatched, and unsupported semantic bridges', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '情',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'emotion',
      selectedPinyin: 'qíng',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'emotion, feeling',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '忄'], ['g', '青']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const rendered = renderDeterministicCandidate(plan).candidate;
  if (!rendered || plan.frame.kind !== 'formation') return;

  const missingPlan: CharacterHookPlanV2 = {
    ...plan,
    frame: { ...plan.frame, semanticBridge: undefined },
  };
  const missing = validateHookQualityDeterministically(missingPlan, rendered);
  assert.ok(missing.issues.some((issue) => issue.code === 'missing-semantic-bridge'));

  const mismatchedPlan: CharacterHookPlanV2 = {
    ...plan,
    frame: {
      ...plan.frame,
      semanticBridge: { ...plan.frame.semanticBridge!, targetCharacter: '請' },
    },
  };
  const mismatched = validateHookQualityDeterministically(mismatchedPlan, rendered);
  assert.ok(mismatched.issues.some((issue) => issue.code === 'semantic-bridge-target-mismatch'));

  const unsupportedPlan: CharacterHookPlanV2 = {
    ...plan,
    frame: {
      ...plan.frame,
      semanticBridge: {
        ...plan.frame.semanticBridge!,
        phrase: '忄(heart) connects to 情(emotion).',
      },
    },
  };
  const unsupported = validateHookQualityDeterministically(unsupportedPlan, rendered);
  assert.ok(unsupported.issues.some((issue) => issue.code === 'unsupported-semantic-bridge'));
});

test('hybrid renderer uses the target-scoped visual relation for 坐', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '坐',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'sit',
      selectedPinyin: 'zuò',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'seat; to sit',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿻', [['g', '土'], ['g', '从']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const rendered = renderDeterministicCandidate(plan);

  assert.equal(rendered.error, null);
  assert.equal(rendered.candidate?.hook, 'Here, 从(two people) sit on 土(ground)—a clear picture of 坐(sit).');
  if (!rendered.candidate) return;
  assert.equal(validateHookQualityDeterministically(plan, rendered.candidate).valid, true);
});

test('hybrid renderer passes through only tokenized source-backed origin claims', () => {
  const plan: CharacterHookPlanV2 = {
    schemaVersion: 2,
    character: '明',
    bookId: 1,
    canonicalMeaning: 'bright',
    targetDisplayLabel: 'bright',
    canonicalPinyin: 'míng',
    meaningReviewReasons: [],
    decompositionVersion: 'fixture-v2',
    decompositionRecordId: 'fixture',
    distribution: 'development-only-candidate',
    publishable: false,
    status: 'ready',
    frame: {
      kind: 'origin',
      components: [
        { occurrenceIds: ['明:0'], profileKey: 'g:日', glyph: '日', treePaths: ['0'], displayLabel: 'sun', labelBasis: 'meaning', role: 'unclassified', evidenceRefs: ['origin-fixture'] },
        { occurrenceIds: ['明:1'], profileKey: 'g:月', glyph: '月', treePaths: ['1'], displayLabel: 'moon', labelBasis: 'meaning', role: 'unclassified', evidenceRefs: ['origin-fixture'] },
      ],
      claim: '日(sun) and 月(moon) were joined in the historical form of 明(bright)',
      sourceRefs: ['origin-fixture'],
      licenseStatus: 'cleared',
      modernVisibility: 'clear',
    },
    reviewReasons: [],
  };
  const rendered = renderDeterministicCandidate(plan);

  assert.equal(rendered.error, null);
  assert.equal(rendered.candidate?.hook, '日(sun) and 月(moon) were joined in the historical form of 明(bright).');
  if (!rendered.candidate) return;
  assert.equal(validateHookQualityDeterministically(plan, rendered.candidate).valid, true);
});

test('V2 點 plan may use a target-specific learner label without changing raw metadata', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '點',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'dot',
      selectedPinyin: 'diǎn',
      method: 'dictionary-core-gloss',
      confidence: 'low',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'dot, point, speck',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '黑'], ['g', '占']]],
    },
    decompositionVersion: 'fixture-v2',
  });

  assert.equal(plan.frame.kind, 'scene');
  if (plan.frame.kind !== 'scene') return;
  assert.equal(plan.frame.components[1].displayLabel, 'takes a spot');
  assert.equal(plan.frame.components[1].labelBasis, 'meaning');
});

test('V2 formation plans block when reviewed component occurrences do not match runtime data', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '坐',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'sit',
      selectedPinyin: 'zuò',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'to sit',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿻', [['g', '土'], ['g', '人']]],
    },
    decompositionVersion: 'fixture-v2',
  });

  assert.equal(plan.status, 'blocked');
  assert.ok(plan.reviewReasons.some((reason) => reason.startsWith('reviewed-component-not-in-runtime:从')));
});

test('V2 說 plan records no useful hook instead of forcing an opaque phonetic clue', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '說',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'to speak',
      selectedPinyin: 'shuō',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'to speak',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '言'], ['g', '兌']]],
    },
    decompositionVersion: 'fixture-v2',
  });

  assert.equal(plan.status, 'no-useful-hook');
  assert.equal(plan.frame.kind, 'none');
  if (plan.frame.kind === 'none') assert.equal(plan.frame.reason, 'weak-modern-phonetic-relationship');
});

test('V2 deterministic quality validation accepts the 休 benchmark contract', () => {
  const plan: CharacterHookPlanV2 = {
    schemaVersion: 2,
    character: '休',
    bookId: 1,
    canonicalMeaning: 'rest',
    targetDisplayLabel: 'rest',
    canonicalPinyin: 'xiū',
    meaningReviewReasons: [],
    decompositionVersion: 'fixture',
    decompositionRecordId: 'fixture',
    distribution: 'development-only-candidate',
    publishable: false,
    status: 'ready',
    frame: {
      kind: 'scene',
      components: [
        { occurrenceIds: ['休:0'], profileKey: 'g:亻', glyph: '亻', treePaths: ['0'], displayLabel: 'person', labelBasis: 'meaning', role: 'unclassified', evidenceRefs: [] },
        { occurrenceIds: ['休:1'], profileKey: 'g:木', glyph: '木', treePaths: ['1'], displayLabel: 'tree', labelBasis: 'meaning', role: 'unclassified', evidenceRefs: [] },
      ],
      requiresHumanApproval: true,
      reviewStatus: 'approved',
      sceneGuidance: 'fixture',
    },
    reviewReasons: [],
  };
  const result = validateHookQualityDeterministically(plan, {
    character: '休',
    frameKind: 'scene',
    canonicalMeaning: 'rest',
    hook: '亻(person) rests against 木(tree)—that scene is 休(rest).',
    componentOccurrenceRefs: ['休:0', '休:1'],
    mnemonicProps: [],
    ahaConnection: 'A person physically rests against a tree.',
    evidenceRefs: [],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test('V2 scene validation requires reviewed props and the exact target token', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '喝',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'drink',
      selectedPinyin: 'hē',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'to drink',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '口'], ['g', '曷']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const result = validateHookQualityDeterministically(plan, {
    character: '喝',
    frameKind: 'scene',
    canonicalMeaning: 'drink',
    hook: '口(mouth) asks 曷(what) about a cup.',
    componentOccurrenceRefs: ['喝:0', '喝:1'],
    mnemonicProps: [],
    ahaConnection: 'The mouth asks what is in the cup.',
    evidenceRefs: [],
  });

  assert.ok(result.issues.some((issue) => issue.code === 'target-token-count'));
  assert.ok(result.issues.some((issue) => issue.code === 'missing-mnemonic-prop'));
});

test('V2 formation validation flags literal props for phonetic components', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '媽',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'mother',
      selectedPinyin: 'mā',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'mother',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '女'], ['g', '馬']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const result = validateHookQualityDeterministically(plan, {
    character: '媽',
    frameKind: 'formation',
    canonicalMeaning: 'mother',
    hook: '女(woman) gives the meaning while 馬(mǎ) neighs for 媽(mother).',
    componentOccurrenceRefs: ['媽:0', '媽:1'],
    mnemonicProps: [],
    ahaConnection: 'The woman meaning and horse sound connect the character.',
    evidenceRefs: ['https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AA%BD'],
  });

  assert.ok(result.issues.some((issue) => issue.code === 'phonetic-literal-prop'));
});

test('strict style preflight rejects template scene prose but accepts a causal revision', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '吃',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'eat',
      selectedPinyin: 'chī',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'to eat',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '口'], ['g', '乞']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const current = evaluateHookStylePreflight(plan, {
    character: '吃',
    frameKind: 'scene',
    canonicalMeaning: 'eat',
    hook: 'When you 吃(eat), your 口(mouth) opens to 乞(beg) for food.',
    componentOccurrenceRefs: ['吃:0', '吃:1'],
    mnemonicProps: ['food'],
    ahaConnection: 'The mouth begging for food is the act of eating.',
    evidenceRefs: [],
  });
  const proposed = evaluateHookStylePreflight(plan, {
    character: '吃',
    frameKind: 'scene',
    canonicalMeaning: 'eat',
    hook: '口(mouth) has to 乞(beg) for food before it can 吃(eat).',
    componentOccurrenceRefs: ['吃:0', '吃:1'],
    mnemonicProps: ['food'],
    ahaConnection: 'The mouth begging for food leads directly to eating.',
    evidenceRefs: [],
  });

  assert.ok(current.issues.includes('awkward'));
  assert.deepEqual(proposed.issues, []);
});

test('strict formation preflight requires explicit meaning and sound clues', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '情',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'emotion',
      selectedPinyin: 'qíng',
      method: 'dictionary-core-gloss',
      confidence: 'low',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'emotion, feeling',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '忄'], ['g', '青']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const current = evaluateHookStylePreflight(plan, {
    character: '情',
    frameKind: 'formation',
    canonicalMeaning: 'emotion',
    hook: '忄(heart) feels 青(qīng) as 情(emotion).',
    componentOccurrenceRefs: ['情:0', '情:1'],
    mnemonicProps: [],
    ahaConnection: 'The heart resonates with the sound.',
    evidenceRefs: ['https://dict.variants.moe.edu.tw/dictView.jsp?ID=15163&la=0&powerMode=2'],
  });
  const proposed = evaluateHookStylePreflight(plan, {
    character: '情',
    frameKind: 'formation',
    canonicalMeaning: 'emotion',
    hook: '忄(heart) gives the meaning clue, while 青(qīng) hints at the sound of 情(emotion).',
    componentOccurrenceRefs: ['情:0', '情:1'],
    mnemonicProps: [],
    ahaConnection: 'The heart supplies meaning and 青 supplies the sound cue.',
    evidenceRefs: ['https://dict.variants.moe.edu.tw/dictView.jsp?ID=15163&la=0&powerMode=2'],
  });

  assert.ok(current.issues.includes('vague'));
  assert.deepEqual(proposed.issues, []);
});

test('strict formation preflight rejects formed-template prose', () => {
  const inventory: BookCharacterInventoryEntry = {
    character: '媽',
    bookId: 1,
    firstVocabularyId: 'fixture',
    occurrences: [],
    meaningDecision: {
      selectedMeaning: 'mother',
      selectedPinyin: 'mā',
      method: 'single-standalone-sense',
      confidence: 'medium',
      lessonSpecificMeanings: [],
      dictionaryDefinition: 'mother',
      reviewReasons: [],
    },
  };
  const plan = buildPilotQualityPlan({
    inventory,
    runtimeRecord: {
      recordId: 'fixture',
      sourceId: 'fixture',
      tree: ['s', '⿰', [['g', '女'], ['g', '馬']]],
    },
    decompositionVersion: 'fixture-v2',
  });
  const result = evaluateHookStylePreflight(plan, {
    character: '媽',
    frameKind: 'formation',
    canonicalMeaning: 'mother',
    hook: 'The 女(woman) gives the meaning, while 馬(mǎ) cues the sound, so 媽(mother) is formed.',
    componentOccurrenceRefs: ['媽:0', '媽:1'],
    mnemonicProps: [],
    ahaConnection: '女 gives the meaning and 馬 cues the sound.',
    evidenceRefs: ['https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AA%BD'],
  });

  assert.ok(result.issues.includes('component-list-only'));
});

test('V2 occurrence references preserve repeated components', () => {
  const plan: CharacterHookPlanV2 = {
    schemaVersion: 2,
    character: '朋',
    bookId: 1,
    canonicalMeaning: 'friend',
    targetDisplayLabel: 'friend',
    canonicalPinyin: 'péng',
    meaningReviewReasons: [],
    decompositionVersion: 'fixture',
    decompositionRecordId: 'fixture',
    distribution: 'development-only-candidate',
    publishable: false,
    status: 'candidate',
    frame: {
      kind: 'scene',
      components: [{
        occurrenceIds: ['朋:0', '朋:1'],
        profileKey: 'g:月',
        glyph: '月',
        treePaths: ['0', '1'],
        displayLabel: 'moon',
        labelBasis: 'meaning',
        role: 'unclassified',
        evidenceRefs: [],
      }],
      requiresHumanApproval: true,
      reviewStatus: 'review-required',
      sceneGuidance: 'fixture',
    },
    reviewReasons: [],
  };
  const result = validateHookQualityDeterministically(plan, {
    character: '朋',
    frameKind: 'scene',
    canonicalMeaning: 'friend',
    hook: 'Two 月(moon) shapes stay side by side like one 朋(friend).',
    componentOccurrenceRefs: ['朋:0', '朋:1'],
    mnemonicProps: [],
    ahaConnection: 'The repeated shapes stay side by side.',
    evidenceRefs: [],
  });

  assert.equal(result.valid, true);
});
