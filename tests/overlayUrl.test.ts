import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverlayParams,
  parseOverlayParams,
} from '../src/app/overlayUrl';

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
