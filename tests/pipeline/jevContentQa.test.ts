import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWordQuestions,
  buildWordState,
  DEFAULT_WORD_THRESHOLDS,
  selectWords,
  wordVerdict,
  type WordRecord,
} from '../../scripts/jev/reviewWordHooksTypesafe';
import {
  buildGrammarQuestions,
  buildGrammarState,
  collectGrammarCandidates,
  grammarVerdict,
  listGrammarFiles,
  selectGrammarCandidates,
  type GrammarCandidate,
} from '../../scripts/jev/reviewGrammarExamples';

const WORD: WordRecord = {
  word: '一半',
  pinyin: 'yíbàn',
  meaning: 'one half',
  characters: [
    { char: '一', meaning: 'one' },
    { char: '半', meaning: 'half' },
  ],
  hook: '一(one) + 半(half): a half of one.',
};

test('buildWordState maps the record into the judged state', () => {
  const state = buildWordState(WORD);
  assert.equal(state.word.text, '一半');
  assert.deepEqual(state.word.characters, [
    { glyph: '一', meaning: 'one' },
    { glyph: '半', meaning: 'half' },
  ]);
  assert.equal(state.hook, WORD.hook);
});

test('buildWordQuestions asks the four word-hook judgments', () => {
  assert.deepEqual(Object.keys(buildWordQuestions()), ['hook_grounded', 'meaning_match', 'hook_concrete', 'memorability']);
});

test('wordVerdict applies each threshold', () => {
  const good = wordVerdict({
    hook_grounded: { noul: 0.8 },
    meaning_match: { noul: 0.9 },
    hook_concrete: { noul: 0.7 },
    memorability: { score: 2.4 },
  });
  assert.equal(good.pass, true);

  const bad = wordVerdict({
    hook_grounded: { noul: 0.2 },
    meaning_match: { noul: 0.9 },
    hook_concrete: { noul: 0.7 },
    memorability: { score: 2.4 },
  });
  assert.equal(bad.pass, false);
  assert.deepEqual(bad.failed, [`grounded ${(0.2).toFixed(2)}`]);
  assert.equal(DEFAULT_WORD_THRESHOLDS.meaningMatch, 0.7);
});

test('selectWords supports --words, --all, and --limit, and rejects empty modes', () => {
  const records = [WORD, { ...WORD, word: '一共' }, { ...WORD, word: '一起' }];
  const base = { input: '', concurrency: 1, thresholdsPath: '', out: '', dry: false };
  assert.deepEqual(selectWords(records, { ...base, all: true, words: null, limit: null }).map((record) => record.word), ['一半', '一共', '一起']);
  assert.deepEqual(selectWords(records, { ...base, all: false, words: ['一共'], limit: null }).map((record) => record.word), ['一共']);
  assert.deepEqual(selectWords(records, { ...base, all: false, words: null, limit: 2 }).map((record) => record.word), ['一半', '一共']);
  assert.throws(() => selectWords(records, { ...base, all: false, words: null, limit: null }), /Choose a mode/);
});

test('collectGrammarCandidates keeps only pages with examples', () => {
  const content = {
    LESSON_ONE_PART_ONE: { id: 'part', questions: [] },
    LESSON_ONE_GRAMMAR_ONE: {
      titleEnglish: 'About to',
      pattern: 'Subject + 快要 + event + 了',
      examples: [{ id: 'e1', text: { traditional: '我們快要上課了。', english: 'Our class is about to start.' } }],
    },
  };
  const candidates = collectGrammarCandidates('lessonOne.json', content);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].key, 'lessonOne.json:e1');
});

test('grammar state and questions adapt to missing pinyin', () => {
  const candidate: GrammarCandidate = {
    key: 'lessonOne.json:e1',
    page: { titleEnglish: 'About to', pattern: 'S + 快要 + V + 了', focusTerms: ['快要'] },
    example: { id: 'e1', text: { traditional: '我們快要上課了。', english: 'Our class is about to start.' } },
  };
  const state = buildGrammarState(candidate);
  assert.deepEqual(Object.keys(buildGrammarQuestions(state)), ['translation_faithful', 'chinese_natural', 'pattern_fit']);

  const withPinyin: GrammarCandidate = {
    ...candidate,
    example: { id: 'e1', text: { ...candidate.example.text, pinyin: 'Wǒmen kuàiyào shàngkè le.' } },
  };
  const pinyinState = buildGrammarState(withPinyin);
  assert.deepEqual(Object.keys(buildGrammarQuestions(pinyinState)), ['translation_faithful', 'chinese_natural', 'pattern_fit', 'pinyin_correct']);
});

test('grammarVerdict checks pinyin only when the example has it', () => {
  const state = buildGrammarState({
    key: 'k',
    page: {},
    example: { id: 'e1', text: { traditional: '我們快要上課了。', english: 'Our class is about to start.' } },
  });
  const answers = {
    translation_faithful: { noul: 0.9 },
    chinese_natural: { noul: 0.8 },
    pattern_fit: { score: 2.5 },
  };
  assert.equal(grammarVerdict(answers, state).pass, true);
  assert.equal(grammarVerdict({ ...answers, pinyin_correct: { noul: 0.1 } }, state).pass, true);

  const pinyinState = buildGrammarState({
    key: 'k',
    page: {},
    example: { id: 'e1', text: { traditional: '我們快要上課了。', pinyin: 'Wǒmen kuàiyào shàngkè le.' } },
  });
  const failed = grammarVerdict({ ...answers, pinyin_correct: { noul: 0.1 } }, pinyinState);
  assert.equal(failed.pass, false);
  assert.deepEqual(failed.failed, [`pinyin ${(0.1).toFixed(2)}`]);
});

test('grammar selectors read the real content directory', () => {
  assert.ok(listGrammarFiles().includes('lessonEight.json'));
  const candidates = selectGrammarCandidates({
    file: 'lessonEight.json',
    all: false,
    limit: 3,
    concurrency: 1,
    thresholdsPath: '',
    out: '',
    dry: false,
  });
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((candidate) => candidate.example.text?.traditional));
});
