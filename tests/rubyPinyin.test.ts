import test from 'node:test';
import assert from 'node:assert/strict';
import { alignRubyPinyin, getPhraseChunks, splitPinyinWordToSyllables } from '../src/utils/rubyPinyin.js';

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

