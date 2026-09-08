import test from 'node:test';
import assert from 'node:assert/strict';
import { alignRubyPinyin, getPhraseChunks, getWordChunks, splitPinyinWordToSyllables } from '../src/utils/rubyPinyin.js';

test('splitPinyinWordToSyllables splits compound words', () => {
  assert.deepEqual(splitPinyinWordToSyllables('piàoliàng'), ['piào', 'liàng']);
  assert.deepEqual(splitPinyinWordToSyllables('tóngxué'), ['tóng', 'xué']);
  assert.deepEqual(splitPinyinWordToSyllables('Yǒuměi'), ['Yǒu', 'měi']);
  assert.deepEqual(splitPinyinWordToSyllables('kěài'), ['kě', 'ài']);
  assert.deepEqual(splitPinyinWordToSyllables('kuànián'), ['kuà', 'nián']);
  assert.deepEqual(splitPinyinWordToSyllables('rènao'), ['rè', 'nao']);
  assert.deepEqual(splitPinyinWordToSyllables('yìdiǎnr'), ['yì', 'diǎn', 'r']);
});

test('alignRubyPinyin aligns compound words 1-to-1 with Chinese characters', () => {
  const text = '她很漂亮。';
  const pinyin = 'Tā hěn piàoliàng.';
  const items = alignRubyPinyin(text, pinyin);

  assert.equal(items.length, 5);
  assert.equal(items[0].char, '她');
  assert.equal(items[0].pinyin, 'Tā');
  assert.equal(items[1].char, '很');
  assert.equal(items[1].pinyin, 'hěn');
  assert.equal(items[2].char, '漂');
  assert.equal(items[2].pinyin, 'piào');
  assert.equal(items[3].char, '亮');
  assert.equal(items[3].pinyin, 'liàng');
  assert.equal(items[4].char, '。');
  assert.equal(items[4].isPunctuation, true);
});

test('getPhraseChunks correctly chunks and extracts timestamps for 五十塊錢很便宜', () => {
  const line = {
    text: '五十塊錢很便宜！妳看，哪個顏色漂亮？',
    words: [
      { w: '五十块钱很便宜。', start: 21.42, end: 23.94, charStart: 0, charEnd: 7 },
      { w: '你看,哪个颜色漂亮?', start: 25.16, end: 28.38, charStart: 7, charEnd: 17 },
    ],
  };
  const chunks = getPhraseChunks(line.text, 'Wǔshí kuài qián hěn piányí! Nǐ kàn, nǎ ge yánsè piàoliang?', line);
  assert.equal(chunks.length >= 2, true);
  assert.equal(chunks[0].text, '五十塊錢很便宜');
  assert.equal(chunks[0].start, 21.42);
  assert.equal(chunks[0].end, 23.94);
});

test('getPhraseChunks folds sentence-final punctuation into the last word chunk', () => {
  const line = {
    text: '我很可愛。',
    words: [
      { w: '我很可爱', start: 1.0, end: 3.0, charStart: 0, charEnd: 4 },
    ],
  };
  const chunks = getPhraseChunks(line.text, 'Wǒ hěn kěài.', line);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, '我很可愛。');
  assert.equal(chunks[0].isPunctuation, false);
  assert.equal(chunks[0].start, 1.0);
  assert.equal(chunks[0].end, 3.0);
  assert.equal(chunks[0].rubyItems.length, 5);
  assert.equal(chunks[0].rubyItems.at(-1)?.isPunctuation, true);
});

test('getPhraseChunks keeps un-aligned trailing text as an inert chunk', () => {
  const line = {
    text: '你好嗎？',
    words: [
      { w: '你好', start: 1.0, end: 2.0, charStart: 0, charEnd: 2 },
    ],
  };
  const chunks = getPhraseChunks(line.text, 'Nǐ hǎo ma?', line);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[1].text, '嗎？');
  assert.equal(chunks[1].isPunctuation, true);
  assert.equal(chunks[1].start, undefined);
});
test('getPhraseChunks splits a merged whole-sentence word into phrase chunks', () => {
  const line = {
    text: '妳好！我是李中明，請問妳叫什麼名字？',
    words: [
      { w: '妳好！我是李中明，請問妳叫什麼名字？', start: 0, end: 6.96, charStart: 0, charEnd: 17 },
    ],
  };
  const chunks = getPhraseChunks(line.text, 'Nǐ hǎo! Wǒ shì Lǐ Zhōngmíng, qǐngwèn nǐ jiào shénme míngzi?', line);

  assert.deepEqual(
    chunks.map((c) => c.text),
    ['妳好！', '我是李中明，', '請問妳叫什麼名字？'],
  );
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].start, 0);
  assert.equal(chunks[2].end, 6.96);
  // Timestamps are interpolated and strictly increasing.
  assert.ok(chunks[0].end > chunks[0].start);
  assert.ok(chunks[1].start >= chunks[0].end);
  assert.ok(chunks[2].start >= chunks[1].end);
});

test('getPhraseChunks subdivides oversized clauses at pinyin word starts', () => {
  const line = {
    text: '半個小時以前我寄了一封電子郵件給你，你看到了嗎？',
    words: [
      { w: '半個小時以前我寄了一封電子郵件給你，你看到了嗎？', start: 10, end: 20, charStart: 0, charEnd: 23 },
    ],
  };
  const chunks = getPhraseChunks(
    line.text,
    'Bàn ge xiǎoshí yǐqián wǒ jì le yì fēng diànzǐ yóujiàn gěi nǐ, nǐ kàndào le ma?',
    line,
  );
  assert.deepEqual(
    chunks.map((chunk) => chunk.text),
    ['半個小時以前我寄了一封', '電子郵件給你，', '你看到了嗎？'],
  );
  // Spoken content stays within the phrase cap; timestamps stay monotonic.
  for (const chunk of chunks) {
    assert.ok(chunk.start !== undefined && chunk.end !== undefined);
    assert.ok(chunk.end > chunk.start);
  }
  assert.equal(chunks[0].start, 10);
  assert.equal(chunks[2].end, 20);
});

test('getPhraseChunks does not split a single-phrase word', () => {
  const line = {
    text: '我很可愛。',
    words: [
      { w: '我很可爱', start: 1.0, end: 3.0, charStart: 0, charEnd: 4 },
    ],
  };
  const chunks = getPhraseChunks(line.text, 'Wǒ hěn kěài.', line);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, '我很可愛。');
});

test('getPhraseChunks keeps digit runs (101) aligned with phrase text', () => {
  const line = {
    text: '我家在台北101大樓附近，大家可以先來我家，我們一起吃晚飯，再去看演唱會。',
    words: [
      { w: '我家在台北101大樓附近，大家可以先來我家，我們一起吃晚飯，再去看演唱會。', start: 64.3, end: 70.42, charStart: 0, charEnd: 21 },
      { w: '我们一起吃晚饭', start: 72.17, end: 74.83, charStart: 22, charEnd: 29 },
      { w: '再去看演唱会', start: 74.83, end: 77.07, charStart: 30, charEnd: 36 },
    ],
  };
  const pinyin = 'Wǒ jiā zài Táiběi 101 dàlóu fùjìn, dàjiā kěyǐ xiān lái wǒ jiā, wǒmen yìqǐ chī wǎnfàn, zài qù kàn yǎnchànghuì.';
  const chunks = getPhraseChunks(line.text, pinyin, line);

  // Every chunk must pair exactly with its ruby items — the "101" digit run
  // is one grouped item, so index slicing would drift by two characters.
  for (const chunk of chunks) {
    assert.equal(chunk.text, chunk.rubyItems.map((item) => item.char).join(''));
  }
  assert.deepEqual(
    chunks.map((chunk) => chunk.text),
    ['我家在台北101大樓附近，', '大家可以先來我家', '，', '我們一起吃晚飯', '，', '再去看演唱會。'],
  );
});

test('alignRubyPinyin handles numbers and compound words in Taipei 101 sentence', () => {
  const text = '十二月三十一號的晚上，很多城市都有跨年晚會，我最喜歡的是台北101的演唱會，有很多表演，又熱鬧又好看。';
  const pinyin = 'Shí’èr yuè sānshíyī hào de wǎnshang, hěn duō chéngshì dōu yǒu kuànián wǎnhuì, wǒ zuì xǐhuan de shì Táiběi 101 de yǎnchànghuì, yǒu hěn duō biǎoyǎn, yòu rènao yòu hǎokàn.';
  const items = alignRubyPinyin(text, pinyin);

  const kua = items.find(x => x.char === '跨');
  const nian = items.find(x => x.char === '年');
  assert.equal(kua?.pinyin, 'kuà');
  assert.equal(nian?.pinyin, 'nián');

  const num101 = items.find(x => x.char === '101');
  assert.equal(num101?.char, '101');
  assert.equal(num101?.pinyin, undefined);

  const re = items.find(x => x.char === '熱');
  const nao = items.find(x => x.char === '鬧');
  assert.equal(re?.pinyin, 'rè');
  assert.equal(nao?.pinyin, 'nao');

  const kan = items.find(x => x.char === '看');
  assert.equal(kan?.pinyin, 'kàn');
});

test('getWordChunks segments a line into individual words and distinct punctuation', () => {
  const line = {
    text: '她是新同學，叫友美。她很可愛。',
    words: [
      { w: '他是新同学', start: 4.02, end: 5.94, charStart: 0, charEnd: 5 },
      { w: '叫友美', start: 5.94, end: 8.34, charStart: 6, charEnd: 9 },
      { w: '她很可爱', start: 8.34, end: 11.28, charStart: 10, charEnd: 14 },
    ],
  };
  const chunks = getWordChunks(line.text, 'Tā shì xīn tóngxué, jiào Yǒuměi. Tā hěn kěài.', line);

  assert.deepEqual(
    chunks.map((c) => c.text),
    ['她', '是', '新', '同學', '，', '叫', '友美', '。', '她', '很', '可愛', '。'],
  );

  const spoken = chunks.filter((c) => !c.isPunctuation);
  assert.equal(spoken.length, 9);
  // Each spoken word has its own timestamp slice
  for (const word of spoken) {
    assert.ok(typeof word.start === 'number' && typeof word.end === 'number');
    assert.ok(word.end > word.start);
  }
  // Punctuation is separate and not marked as words
  const puncts = chunks.filter((c) => c.isPunctuation);
  assert.equal(puncts.length, 3);
  assert.deepEqual(puncts.map((p) => p.text), ['，', '。', '。']);
});

test('getWordChunks assigns word timing from character-level onsets (chars)', () => {
  const chars = [
    { charStart: 0, charEnd: 1, start: 0.10, end: 0.40 },
    { charStart: 1, charEnd: 2, start: 0.40, end: 0.70 },
    { charStart: 2, charEnd: 3, start: 0.70, end: 1.00 },
    { charStart: 3, charEnd: 4, start: 1.00, end: 1.30 },
    { charStart: 4, charEnd: 5, start: 1.30, end: 1.70 },
    { charStart: 6, charEnd: 7, start: 1.70, end: 2.00 },
    { charStart: 7, charEnd: 8, start: 2.00, end: 2.30 },
    { charStart: 8, charEnd: 9, start: 2.30, end: 2.70 },
    { charStart: 10, charEnd: 11, start: 2.70, end: 3.00 },
    { charStart: 11, charEnd: 12, start: 3.00, end: 3.30 },
    { charStart: 12, charEnd: 13, start: 3.30, end: 3.60 },
    { charStart: 13, charEnd: 14, start: 3.60, end: 4.00 },
  ];
  const chunks = getWordChunks(
    '她是新同學，叫友美。她很可愛。',
    'Tā shì xīn tóngxué, jiào Yǒuměi. Tā hěn kěài.',
    { chars },
  );

  assert.equal(chunks[0].text, '她');
  assert.equal(chunks[0].start, 0.10);
  assert.equal(chunks[0].end, 0.40);
  assert.equal(chunks[3].text, '同學');
  assert.equal(chunks[3].start, 1.00);
  assert.equal(chunks[3].end, 1.70);
  assert.equal(chunks[10].text, '可愛');
  assert.equal(chunks[10].start, 3.30);
  assert.equal(chunks[10].end, 4.00);
});

test('getWordChunks handles Dialogue 3 narrative lines without grouped clause lumps', () => {
  const line = {
    text: '我是日本人。',
    start: 13.56,
    end: 16.56,
    words: [
      { w: '我是日本人', start: 13.56, end: 16.56, charStart: 0, charEnd: 5 },
    ],
  };
  const chunks = getWordChunks(line.text, 'Wǒ shì Rìběn rén.', line);
  assert.deepEqual(
    chunks.map((c) => c.text),
    ['我', '是', '日本', '人', '。'],
  );
  assert.equal(chunks[0].text, '我');
  assert.equal(chunks[2].text, '日本');
  assert.equal(chunks[3].text, '人');
  assert.equal(chunks[4].isPunctuation, true);
});

test('getWordChunks preserves compound words with syllable-dividing apostrophes (e.g. 早安, 可愛, 國安, 十二)', () => {
  // Test case 1: Dialogue 3 "大家早安！" (B1L01-3-14 zǎo'ān)
  const zaoanChunks = getWordChunks('大家早安！', "Dàjiā zǎo'ān!");
  assert.deepEqual(
    zaoanChunks.map((c) => c.text),
    ['大家', '早安', '！'],
  );
  assert.equal(zaoanChunks[1].text, '早安');
  assert.equal(zaoanChunks[1].isPunctuation, false);
  assert.equal(zaoanChunks[1].rubyItems.length, 2);
  assert.equal(zaoanChunks[1].rubyItems[0].pinyin, 'zǎo');
  assert.equal(zaoanChunks[1].rubyItems[1].pinyin, 'ān');

  // Test case 2: "新同學很可愛。" (B1L01-1-08 kě'ài)
  const keaiChunks = getWordChunks('新同學很可愛。', "Xīn tóngxué hěn kě'ài.");
  assert.deepEqual(
    keaiChunks.map((c) => c.text),
    ['新', '同學', '很', '可愛', '。'],
  );
  assert.equal(keaiChunks[3].text, '可愛');

  // Test case 3: "國安也在。" (Guó'ān)
  const guoanChunks = getWordChunks('國安也在。', "Guó'ān yě zài.");
  assert.deepEqual(
    guoanChunks.map((c) => c.text),
    ['國安', '也', '在', '。'],
  );
  assert.equal(guoanChunks[0].text, '國安');

  // Test case 4: "現在十二點。" (shí'èr)
  const shierChunks = getWordChunks('現在十二點。', "Xiànzài shí'èr diǎn.");
  assert.deepEqual(
    shierChunks.map((c) => c.text),
    ['現在', '十二', '點', '。'],
  );
  assert.equal(shierChunks[1].text, '十二');
});

