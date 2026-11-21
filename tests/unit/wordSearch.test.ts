import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSearchableWords, plainPinyin, searchWords } from '../../src/screens/word-list/wordSearch';

test('searching every TOCFL level finds a word by characters, pinyin or meaning, and says where it is', async () => {
  const words = await loadSearchableWords();
  assert.ok(words.length > 14000, 'every level is searched');
  const find = (typed: string) => searchWords(words, typed).map((hit) => `${hit.word[0]} ${hit.entry.slug} ${hit.path}`);

  assert.equal(plainPinyin('Xué shēng'), 'xuesheng');
  assert.deepEqual(find('   '), []);
  // Characters: the word itself first, then words that start with it, then words that hold it.
  assert.equal(find('學生')[0], '學生 novice /tocfl/vocabulary/novice');
  assert.ok(find('學').some((hit) => hit.startsWith('學生 ')) && find('學').some((hit) => hit.startsWith('大學 ')));
  // Pinyin with or without tones and spaces.
  for (const typed of ['xuesheng', 'xuéshēng', 'Xue Sheng']) assert.equal(find(typed)[0], '學生 novice /tocfl/vocabulary/novice', typed);
  // English: a whole word of the meaning, lowest level first; "tea" must not find "teacher".
  assert.ok(find('tea')[0].startsWith('茶 '), find('tea')[0]);
  assert.ok(!find('tea').some((hit) => hit.startsWith('老師 ')));
  assert.ok(find('teacher')[0].startsWith('老師 '));
  // A word in a later part of a long level links to that part.
  const typhoon = searchWords(words, '颱風')[0];
  assert.ok(typhoon, '颱風 is on the list');
  assert.match(typhoon.path, /^\/tocfl\/vocabulary\/[a-c][12](\/\d+)?$/);
  const deep = searchWords(words, 'zuo').at(-1)!;
  assert.match(deep.path, /^\/tocfl\/vocabulary\/\w+(\/\d+)?$/);
  assert.ok(searchWords(words, 'de').length <= 40, 'a short query stays a short list');
  assert.deepEqual(find('qqqq'), []);
});
