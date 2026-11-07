import test from 'node:test';
import assert from 'node:assert/strict';
import { alignRubyPinyin, getWordChunks, splitPinyinWordToSyllables } from '../../src/utils/pinyin/rubyPinyin.js';

test('printed Latin pinyin does not shift the following Chinese readings', () => {
  const items = alignRubyPinyin('都唸 yú，有剩下。', 'dōu niàn yú, yǒu shèngxià.');
  assert.equal(items.find((item) => item.char === 'yú')?.pinyin, 'yú');
  assert.equal(items.find((item) => item.char === '有')?.pinyin, 'yǒu');
  assert.equal(items.find((item) => item.char === '剩')?.pinyin, 'shèng');
  assert.equal(items.find((item) => item.char === '下')?.pinyin, 'xià');
});

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


test('corner-quote brackets stay punctuation so alignment never drifts (B1L15-R03)', () => {
  // Regression: 「」 were treated as spoken characters, consuming pinyin
  // syllables and shifting every following character's alignment (屬什|麼,
  // 到了元|宵節, 「十|二生肖」).
  const text =
    '華人聊天的時候，會問別人「你屬什麼？」。每年到了元宵節，代表那年的動物燈籠，也會最受歡迎。';
  const pinyin =
    'Huárén liáotiān de shíhou, huì wèn biérén "nǐ shǔ shénme?". Měi nián dào le Yuánxiāojié, dàibiǎo nà nián de dòngwù dēnglóng, yě huì zuì shòu huānyíng.';
  const words = getWordChunks(text, pinyin).filter((chunk) => !chunk.isPunctuation);
  assert.deepEqual(
    words.map((chunk) => chunk.text),
    [
      '華人', '聊天', '的', '時候', '會', '問', '別人', '你', '屬', '什麼',
      '每', '年', '到', '了', '元宵節', '代表', '那', '年', '的', '動物',
      '燈籠', '也', '會', '最', '受', '歡迎',
    ],
  );
});

test('quote brackets beside a quoted name keep the next word whole (B1L15-R03)', () => {
  const words = getWordChunks(
    '而且叫這十二種動物「十二生肖」。',
    'érqiě jiào zhè shí\'èr zhǒng dòngwù "shí\'èr shēngxiào".',
  ).filter((chunk) => !chunk.isPunctuation);
  assert.deepEqual(
    words.map((chunk) => chunk.text),
    ['而且', '叫', '這', '十二', '種', '動物', '十二', '生肖'],
  );
});
