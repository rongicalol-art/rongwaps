import assert from 'node:assert/strict';
import test from 'node:test';
import { characterReadings } from '../../src/utils/pinyin/characterReadings';
import { findCharacterCourseContext } from '../../src/services/courseVocabLookup';

test('authored aliases select the matching written form, not an arbitrary first pronunciation', () => {
  assert.deepEqual(characterReadings('餐廳', 'cāntīng/fànguǎn', '餐廳/飯館')?.readings, [['can1'], ['ting1']]);
  assert.deepEqual(characterReadings('飯館', 'cāntīng/fànguǎn', '餐廳/飯館')?.readings, [['fan4'], ['guan3']]);
  assert.deepEqual(characterReadings('和', 'hé/hàn')?.readings, [['he2', 'han4']]);
  assert.equal(characterReadings('和', 'hé/invalid'), null);
});

test('optional written syllables and alternate readings are distinguished', () => {
  assert.deepEqual(characterReadings('想要', 'xiǎng(yào)', '想（要）')?.readings, [['xiang3'], ['yao4']]);
  assert.deepEqual(characterReadings('你', 'nǐ(ma)', '你(嗎)')?.readings, [['ni3']]);
  assert.deepEqual(characterReadings('當作', 'dāngzuò (dàngzuò)', '當作/當做')?.readings, [['dang1', 'dang4'], ['zuo4']]);
  assert.deepEqual(characterReadings('一點兒', '(yì)diǎn(r)', '（一）點（兒）')?.readings, [['yi4'], ['dian3'], ['r5']]);
});

test('punctuation and authored mixed-script groups do not shift Chinese readings', () => {
  assert.deepEqual(characterReadings('……之一', 'zhīyī')?.readings, [['zhi1'], ['yi1']]);
  assert.deepEqual(characterReadings('台北101', 'Táiběi Yīlíngyī')?.readings, [['tai2'], ['bei3']]);
  assert.deepEqual(characterReadings('卡拉OK', 'kǎlā OK')?.readings, [['ka3'], ['la1']]);
  assert.deepEqual(characterReadings('3C產品', '3C chǎnpǐn')?.readings, [['chan3'], ['pin3']]);
  assert.deepEqual(characterReadings('KTV', 'KTV')?.characters, []);
  assert.equal(characterReadings('卡拉OK', 'kǎlāwrong'), null);
});

test('neutral sounds retain tone 5 and ü; missing alignment stays unresolved', () => {
  assert.deepEqual(characterReadings('女兒', "nǚ'ér")?.readings, [['nü3'], ['er2']]);
  assert.deepEqual(characterReadings('杯子', 'bēizi')?.readings, [['bei1'], ['zi5']]);
  assert.equal(characterReadings('孩子', 'hái'), null);
});

test('context fallback is a complete recorded book word with the requested reading', async () => {
  const context = await findCharacterCourseContext('服', 'fu5');
  assert.equal(context?.front, '衣服');
  assert.ok(context?.audio?.endsWith('.mp3'));
  assert.ok((await findCharacterCourseContext('儿', 'r5'))?.audio);
  assert.equal(await findCharacterCourseContext('服', 'fu3'), undefined);
});
