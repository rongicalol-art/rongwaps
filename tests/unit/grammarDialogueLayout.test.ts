import assert from 'node:assert/strict';
import test from 'node:test';
import { splitDialogueText } from '../../src/screens/grammar-lesson/utils/grammarDialogueLayout';
import type { GrammarLessonText } from '../../src/types/models';

test('returns null for non-dialogue sentences', () => {
  const text: GrammarLessonText = {
    traditional: '這本書很有意思。',
    pinyin: 'Zhè běn shū hěn yǒu yìsi.',
    english: 'This book is very interesting.',
    words: [
      { id: 'w1', traditional: '這本書', pinyin: 'zhè běn shū', meaning: 'this book' },
      { id: 'w2', traditional: '很有意思', pinyin: 'hěn yǒu yìsi', meaning: 'very interesting', suffix: '。' },
    ],
  };

  const result = splitDialogueText(text);
  assert.equal(result, null);
});

test('splits standard dialogue with embedded prefixes', () => {
  const text: GrammarLessonText = {
    traditional: 'A：你們要買哪個蛋糕？ B：他要買大的，我要買小的。',
    simplified: 'A：你们要买哪个蛋糕？ B：他要买大的，我要买小的。',
    pinyin: 'A: Nǐmen yào mǎi nǎ ge dàngāo? B: Tā yào mǎi dà de, wǒ yào mǎi xiǎo de.',
    english: 'A: Which cake do you want to buy? B: He wants the big one; I want the small one.',
    words: [
      { id: 'w1', traditional: '你們', pinyin: 'nǐmen', meaning: 'you all', prefix: 'A：' },
      { id: 'w2', traditional: '蛋糕', pinyin: 'dàngāo', meaning: 'cake' },
      { id: 'w3', traditional: '他', pinyin: 'tā', meaning: 'he', prefix: '？ B：' },
      { id: 'w4', traditional: '買', pinyin: 'mǎi', meaning: 'buy' },
      { id: 'w5', traditional: '小的', pinyin: 'xiǎo de', meaning: 'small one', suffix: '。' },
    ],
  };

  const result = splitDialogueText(text, 'traditional');
  assert.ok(result);
  assert.equal(result.isDialogue, true);
  assert.equal(result.aRaw, '你們要買哪個蛋糕？');
  assert.equal(result.bRaw, '他要買大的，我要買小的。');
  assert.equal(result.pinyinA, 'Nǐmen yào mǎi nǎ ge dàngāo?');
  assert.equal(result.pinyinB, 'Tā yào mǎi dà de, wǒ yào mǎi xiǎo de.');
  assert.equal(result.englishA, 'Which cake do you want to buy?');
  assert.equal(result.englishB, 'He wants the big one; I want the small one.');

  // Check that speaker prefixes are stripped from words
  assert.equal(result.aWords[0].prefix, undefined);
  assert.equal(result.aWords[result.aWords.length - 1].suffix, '？');
  assert.equal(result.bWords[0].prefix, undefined);
  assert.equal(result.bWords[0].traditional, '他');
});

test('splits dialogue when words lack A/B prefixes using punctuation boundary', () => {
  const text: GrammarLessonText = {
    traditional: 'A: 他昨天來了嗎？ B: 他昨天沒來。',
    pinyin: 'A: Tā zuótiān lái le ma? B: Tā zuótiān méi lái.',
    english: "A: Did he come yesterday? B: He didn't come yesterday.",
    words: [
      { id: 'w1', traditional: '他昨天來了嗎', pinyin: 'tā zuótiān lái le ma', meaning: 'did he come yesterday', suffix: '？' },
      { id: 'w2', traditional: '他昨天', pinyin: 'tā zuótiān', meaning: 'he yesterday' },
      { id: 'w3', traditional: '沒來', pinyin: 'méi lái', meaning: 'did not come', suffix: '。' },
    ],
  };

  const result = splitDialogueText(text);
  assert.ok(result);
  assert.equal(result.aWords.length, 1);
  assert.equal(result.bWords.length, 2);
  assert.equal(result.pinyinA, 'Tā zuótiān lái le ma?');
  assert.equal(result.pinyinB, 'Tā zuótiān méi lái.');
  assert.equal(result.englishA, 'Did he come yesterday?');
  assert.equal(result.englishB, "He didn't come yesterday.");
});

test('handles non-interactive dialogue text without words array', () => {
  const text: GrammarLessonText = {
    traditional: 'A：你要喝茶嗎？ B：好，謝謝。',
    pinyin: 'A: Nǐ yào hē chá ma? B: Hǎo, xièxie.',
    english: 'A: Do you want to drink tea? B: Okay, thanks.',
  };

  const result = splitDialogueText(text);
  assert.ok(result);
  assert.equal(result.aRaw, '你要喝茶嗎？');
  assert.equal(result.bRaw, '好，謝謝。');
  assert.equal(result.aWords.length, 0);
  assert.equal(result.bWords.length, 0);
  assert.equal(result.pinyinA, 'Nǐ yào hē chá ma?');
  assert.equal(result.pinyinB, 'Hǎo, xièxie.');
  assert.equal(result.englishA, 'Do you want to drink tea?');
  assert.equal(result.englishB, 'Okay, thanks.');
});

test('splits 3-speaker dialogue into turns A, B, and C', () => {
  const text: GrammarLessonText = {
    traditional: 'A: 他給大家寫了一張卡片，你們都看過了嗎？ B: 我看過了。 C: 我還沒看。',
    pinyin: 'A: Tā gěi dàjiā xiě le yì zhāng kǎpiàn, nǐmen dōu kànguo le ma? B: Wǒ kànguo le. C: Wǒ hái méi kàn.',
    english: 'A: He wrote a card for everyone; have you all read it yet? B: I have already read it. C: I haven’t read it yet.',
    words: [
      { id: 'w1', traditional: '他', pinyin: 'tā', meaning: 'he' },
      { id: 'w2', traditional: '卡片', pinyin: 'kǎpiàn', meaning: 'card' },
      { id: 'w3', traditional: '嗎', pinyin: 'ma', meaning: 'question', suffix: '？' },
      { id: 'w4', traditional: '我看過了', pinyin: 'wǒ kànguo le', meaning: 'I have read it', suffix: '。' },
      { id: 'w5', traditional: '我還沒看', pinyin: 'wǒ hái méi kàn', meaning: 'I haven’t read it', suffix: '。' },
    ],
  };

  const result = splitDialogueText(text);
  assert.ok(result);
  assert.equal(result.turns.length, 3);
  assert.equal(result.turns[0].speaker, 'A:');
  assert.equal(result.turns[0].raw, '他給大家寫了一張卡片，你們都看過了嗎？');
  assert.equal(result.turns[1].speaker, 'B:');
  assert.equal(result.turns[1].raw, '我看過了。');
  assert.equal(result.turns[2].speaker, 'C:');
  assert.equal(result.turns[2].raw, '我還沒看。');
  assert.equal(result.turns[2].pinyin, 'Wǒ hái méi kàn.');
  assert.equal(result.turns[2].english, 'I haven’t read it yet.');
});

test('splits named-speaker dialogue into one turn per line, names in the learner script', () => {
  const text: GrammarLessonText = {
    traditional: '助理：要怎麼做呢？\n老闆：就按會議的決定做吧。',
    simplified: '助理：要怎么做呢？\n老板：就按会议的决定做吧。',
    pinyin: 'Zhùlǐ: Yào zěnme zuò ne?\nLǎobǎn: Jiù àn huìyì de juédìng zuò ba.',
    english: 'Assistant: How should we do it?\nBoss: Just follow what the meeting decided.',
    words: [
      { id: 'w1', traditional: '助理', simplified: '助理', pinyin: 'Zhùlǐ', meaning: '', suffix: '：' },
      { id: 'w2', traditional: '要', simplified: '要', pinyin: 'yào', meaning: '' },
      { id: 'w3', traditional: '呢', simplified: '呢', pinyin: 'ne', meaning: '', suffix: '？\n' },
      { id: 'w4', traditional: '老闆', simplified: '老板', pinyin: 'Lǎobǎn', meaning: '', suffix: '：' },
      { id: 'w5', traditional: '吧', simplified: '吧', pinyin: 'ba', meaning: '', suffix: '。' },
    ],
  };

  const result = splitDialogueText(text, 'simplified');
  assert.ok(result);
  assert.equal(result.turns.length, 2);
  assert.equal(result.turns[1].speaker, '老板');
  assert.equal(result.bRaw, '就按会议的决定做吧。');
  assert.deepEqual(result.aWords.map((w) => w.id), ['w1', 'w2', 'w3']);
  assert.equal(result.aWords[2].suffix, '？');
  assert.deepEqual(result.bWords.map((w) => w.id), ['w4', 'w5']);
  assert.equal(result.pinyinB, 'Jiù àn huìyì de juédìng zuò ba.');
  assert.equal(result.englishA, 'How should we do it?');
});

test('a single named line is not a dialogue', () => {
  const text: GrammarLessonText = {
    traditional: '朋子：你可以去那裡領。',
    pinyin: 'Péngzǐ: Nǐ kěyǐ qù nàlǐ lǐng.',
    english: 'Tomoko: You can pick it up there.',
  };
  assert.equal(splitDialogueText(text), null);
});

test('A/B turns drop the line break their words carry', () => {
  const text: GrammarLessonText = {
    traditional: 'A：你好嗎？\nB：很好。',
    pinyin: 'A: Nǐ hǎo ma?\nB: Hěn hǎo.',
    english: 'A: How are you?\nB: Fine.',
    words: [
      { id: 'w1', traditional: '你', pinyin: 'nǐ', meaning: '', prefix: 'A：' },
      { id: 'w2', traditional: '嗎', pinyin: 'ma', meaning: '', suffix: '？\n' },
      { id: 'w3', traditional: '很好', pinyin: 'hěn hǎo', meaning: '', prefix: 'B：', suffix: '。' },
    ],
  };
  const result = splitDialogueText(text);
  assert.ok(result);
  assert.equal(result.aWords[result.aWords.length - 1].suffix, '？');
  assert.equal(result.bWords[0].traditional, '很好');
  assert.equal(result.englishB, 'Fine.');
});

