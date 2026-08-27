import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OFFICIAL_BOOK_AUDIO_ENABLED,
  officialAudioFileName,
} from '../src/utils/officialAudio';

test('resolves Book 1 audio references to official track file names', () => {
  assert.equal(officialAudioFileName(1, '01-1-1'), 'B1-01-1-1.mp3');
  assert.equal(officialAudioFileName(1, '01-1-3'), 'B1-01-1-3.mp3');
  assert.equal(officialAudioFileName(1, '01-2-1'), 'B1-01-2-1.mp3');
  assert.equal(officialAudioFileName(1, '05-2-3'), 'B1-05-2-3.mp3');
});

test('pads single-digit lessons to two digits', () => {
  assert.equal(officialAudioFileName(1, '9-1-1'), 'B1-09-1-1.mp3');
  assert.equal(officialAudioFileName(1, '14-2-1'), 'B1-14-2-1.mp3');
});

test('returns null for books without hosted official audio', () => {
  assert.equal(officialAudioFileName(2, '01-1-1'), null);
  assert.equal(officialAudioFileName(3, '01-1-1'), null);
  assert.equal(officialAudioFileName(4, '01-1-1'), null);
});

test('returns null for malformed or empty audio references', () => {
  assert.equal(officialAudioFileName(1, ''), null);
  assert.equal(officialAudioFileName(1, '1-1'), null);
  assert.equal(officialAudioFileName(1, '01-4-1'), null);
  assert.equal(officialAudioFileName(1, '01-1-4'), null);
  assert.equal(officialAudioFileName(1, 'abc'), null);
  assert.equal(officialAudioFileName(1, '  01-1-1  '), 'B1-01-1-1.mp3');
});

test('every authored Book 1 reading reference resolves to a hosted track', async () => {
  const readings = (await import('../src/data/readings')).ALL_READINGS;
  const resolutions = readings.map((reading) => ({
    id: reading.id,
    file: officialAudioFileName(reading.bookId, reading.audioReference),
  }));
  const unresolved = resolutions.filter((entry) => entry.file === null);
  assert.deepEqual(unresolved, []);
});

test('every resolved reading track is present in the hosted manifest', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../docs/audio_manifest_book1.json', import.meta.url), 'utf8'));
  const hosted = new Set(manifest.files.map((entry) => entry.file));
  const readings = (await import('../src/data/readings')).ALL_READINGS;
  const missing = readings
    .map((reading) => officialAudioFileName(reading.bookId, reading.audioReference))
    .filter((file): file is string => file !== null)
    .filter((file) => !hosted.has(file));
  assert.deepEqual(missing, []);
  assert.equal(manifest.count, 128);
});

test('master switch is on', () => {
  assert.equal(OFFICIAL_BOOK_AUDIO_ENABLED, true);
});
