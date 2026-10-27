import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverlayParams,
  parseOverlayParams,
} from '../../src/app/overlayUrl';

test('parseOverlayParams reads every overlay param', () => {
  assert.deepEqual(parseOverlayParams('?reader=2&grammarPart=1:2&word=你好&activity=quiz'), {
    readerIndex: 2,
    grammarPartId: '1:2',
    dictionaryWord: '你好',
    activity: 'quiz',
  });
});

test('parseOverlayParams supports the legacy reader deep-link forms', () => {
  assert.deepEqual(parseOverlayParams('?reader=true&readingIndex=3').readerIndex, 3);
  assert.deepEqual(parseOverlayParams('?reader=true').readerIndex, 0);
  assert.deepEqual(parseOverlayParams('?readingIndex=5').readerIndex, 5);
  assert.deepEqual(parseOverlayParams('?reader=4').readerIndex, 4);
  assert.deepEqual(parseOverlayParams('?reader=bad').readerIndex, null);
  assert.deepEqual(parseOverlayParams('?readingIndex=-1').readerIndex, null);
});

test('parseOverlayParams tolerates empty and absent search strings', () => {
  const empty = { readerIndex: null, grammarPartId: null, dictionaryWord: null, activity: null };
  assert.deepEqual(parseOverlayParams(''), empty);
  assert.deepEqual(parseOverlayParams('?'), empty);
  assert.deepEqual(parseOverlayParams('?tab=path').activity, null);
});

test('buildOverlayParams emits canonical params and strips empties', () => {
  assert.equal(buildOverlayParams({ readerIndex: 2, grammarPartId: '1:2', dictionaryWord: '你好', activity: 'quiz' }), '?reader=2&grammarPart=1%3A2&word=%E4%BD%A0%E5%A5%BD&activity=quiz');
  assert.equal(buildOverlayParams({ readerIndex: null, grammarPartId: null, dictionaryWord: null, activity: null }), '');
  assert.equal(buildOverlayParams({ readerIndex: 0, grammarPartId: null, dictionaryWord: null, activity: null }), '?reader=0');
});

test('build then parse round-trips', () => {
  const state = { readerIndex: 1, grammarPartId: null, dictionaryWord: null, activity: 'writing' };
  assert.deepEqual(parseOverlayParams(buildOverlayParams(state)), state);
});

test('a combined grammar session keeps every part id', () => {
  const state = { readerIndex: null, grammarPartId: 'B1L01-P01,B1L01-P02', dictionaryWord: null, activity: null };
  assert.deepEqual(parseOverlayParams(buildOverlayParams(state)), state);
});

test('overlay changes preserve a game invite and closing removes only overlay keys', () => {
  const empty = { readerIndex: null, grammarPartId: null, dictionaryWord: null, activity: null };
  const invite = '?room=ABC234';
  const opened = buildOverlayParams({ ...empty, dictionaryWord: '你好' }, invite);
  assert.equal(new URLSearchParams(opened).get('room'), 'ABC234');
  assert.equal(parseOverlayParams(opened).dictionaryWord, '你好');
  assert.equal(buildOverlayParams(empty, opened), invite);
  assert.equal(buildOverlayParams(empty, '?room=ABC234&reader=true&readingIndex=2'), invite);
});
