import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTrim } from '../../scripts/audio/publishTrimmedVocabulary';

const valid = {
  id: 'B1L00-1-01', word: '老師', pinyin: 'lǎoshī', status: 'trimmed',
  source: 'modernchinese-B1L00-1-01.mp3', sourceSha256: 'a'.repeat(64), sourceBytes: 20000,
  audio: 'vocabulary-trimmed/v1/B1L00-1-01-bbbbbbbbbbbb.mp3', sha256: 'b'.repeat(64), bytes: 18000,
  leadingMs: 260, removedMs: 160, retainedLeadingMs: 100, speechPcmIdentical: true,
};

test('only bounded, speech-identical, content-addressed vocabulary trims can publish', () => {
  assert.doesNotThrow(() => validateTrim(valid));
  for (const change of [
    { source: 'B1-01-1-1.mp3' },
    { source: 'pronunciation/cns-female-20250113/a1.mp3' },
    { audio: 'modernchinese-B1L00-1-01.mp3' },
    { sha256: 'c'.repeat(64) },
    { sourceSha256: 'unverified' },
    { retainedLeadingMs: 79 },
    { retainedLeadingMs: 161 },
    { removedMs: 0 },
    { leadingMs: Number.NaN },
    { leadingMs: 400 },
    { speechPcmIdentical: false },
    { bytes: 20000 },
  ]) assert.throws(() => validateTrim({ ...valid, ...change }), /Unsafe trim receipt/);
});
