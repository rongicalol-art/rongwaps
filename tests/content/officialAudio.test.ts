import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

import {
  OFFICIAL_BOOK_AUDIO_ENABLED,
  officialAudioFileName,
} from '../../src/utils/lesson/officialAudio';
import { getTestReadings, readJson, TEST_ALL_READINGS as ALL_READINGS } from '../acceptance_helpers';

test('resolves Book 1 audio references to official track file names', () => {
  assert.equal(officialAudioFileName(1, '01-1-1'), 'B1-01-1-1.mp3');
  assert.equal(officialAudioFileName(1, '01-1-3'), 'B1-01-1-3.mp3');
  assert.equal(officialAudioFileName(1, '01-2-1'), 'B1-01-2-1.mp3');
  assert.equal(officialAudioFileName(1, '05-2-3'), 'B1-05-2-3.mp3');
});

test('resolves Book 3 audio references to official track file names', () => {
  assert.equal(officialAudioFileName(3, '01-1-1'), 'B3-01-1-1.mp3');
  assert.equal(officialAudioFileName(3, '01-2-1'), 'B3-01-2-1.mp3');
  assert.equal(officialAudioFileName(3, '16-2-1'), 'B3-16-2-1.mp3');
});

test('pads single-digit lessons to two digits', () => {
  assert.equal(officialAudioFileName(1, '9-1-1'), 'B1-09-1-1.mp3');
  assert.equal(officialAudioFileName(1, '14-2-1'), 'B1-14-2-1.mp3');
  assert.equal(officialAudioFileName(3, '5-1-1'), 'B3-05-1-1.mp3');
});

test('production Book 2 resolution stays limited to hosted lessons 1–8', async () => {
  const result = await build({ entryPoints: ['src/utils/lesson/officialAudio.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ DEV: false, VITE_BOOK2_AUDIO_LOCAL: 'true' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/utils/lesson/officialAudio');
  assert.equal(api.officialAudioFileName(2, '01-1-1'), 'B2-01-1-1.mp3');
  assert.equal(api.officialAudioFileName(2, '08-2-1'), 'B2-08-2-1.mp3');
  assert.equal(api.officialAudioFileName(2, '09-1-1'), null);
  assert.equal(api.officialAudioFileName(2, '01-1-2'), null);
  assert.equal(officialAudioFileName(4, '01-1-1'), null);
});

test('default DEV Book 2 resolution stays limited to hosted lessons 1–8', async () => {
  const result = await build({ entryPoints: ['src/utils/lesson/officialAudio.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ DEV: true }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/utils/lesson/officialAudio');
  assert.equal(api.officialAudioFileName(2, '08-2-1'), 'B2-08-2-1.mp3');
  assert.equal(api.officialAudioFileName(2, '09-1-1'), null);
});

test('opt-in DEV Book 2 resolution covers lessons 1–16 for dialogue and reading tracks', async () => {
  const result = await build({ entryPoints: ['src/utils/lesson/officialAudio.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ DEV: true, VITE_BOOK2_AUDIO_LOCAL: 'true' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/utils/lesson/officialAudio');
  for (let lesson = 1; lesson <= 16; lesson += 1) {
    const id = String(lesson).padStart(2, '0');
    assert.equal(api.officialAudioFileName(2, `${id}-1-1`), `B2-${id}-1-1.mp3`);
    assert.equal(api.officialAudioFileName(2, `${id}-2-1`), `B2-${id}-2-1.mp3`);
  }
  assert.equal(api.officialAudioFileName(2, '17-1-1'), null);
  assert.equal(api.officialAudioFileName(2, '01-3-1'), null);
  assert.equal(api.officialAudioFileName(2, '01-1-2'), null);
});

test('returns null for malformed or empty audio references', () => {
  assert.equal(officialAudioFileName(1, ''), null);
  assert.equal(officialAudioFileName(1, '1-1'), null);
  assert.equal(officialAudioFileName(1, '01-4-1'), null);
  assert.equal(officialAudioFileName(1, '01-1-4'), null);
  assert.equal(officialAudioFileName(1, 'abc'), null);
  assert.equal(officialAudioFileName(1, '  01-1-1  '), 'B1-01-1-1.mp3');
});

test('every authored Book 1 reading reference resolves to a hosted track', () => {
  const readings = ALL_READINGS;
  const resolutions = readings.map((reading) => ({
    id: reading.id,
    file: officialAudioFileName(reading.bookId, reading.audioReference),
  }));
  const unresolved = resolutions.filter((entry) => entry.file === null);
  assert.deepEqual(unresolved, []);
});

test('every authored Book 3 reading reference resolves to a hosted track', () => {
  const readings = getTestReadings(3);
  const resolutions = readings.map((reading) => ({
    id: reading.id,
    file: officialAudioFileName(reading.bookId, reading.audioReference),
  }));
  const unresolved = resolutions.filter((entry) => entry.file === null);
  assert.deepEqual(unresolved, []);
});

test('every resolved Book 1 reading track is present in the hosted manifest', () => {
  // Only the fields this test reads are declared; the manifest carries more.
  const manifest = readJson<{
    count: number;
    files: Array<{ file: string }>;
  }>('content/audio/audio_manifest_book1.json');
  const hosted = new Set(manifest.files.map((entry) => entry.file));
  const readings = ALL_READINGS;
  const missing = readings
    .map((reading) => officialAudioFileName(reading.bookId, reading.audioReference))
    .filter((file): file is string => file !== null)
    .filter((file) => !hosted.has(file));
  assert.deepEqual(missing, []);
  assert.equal(manifest.count, 128);
});

test('every resolved Book 3 reading track is present in the hosted manifest', () => {
  const manifest = readJson<{
    count: number;
    files: Array<{ file: string }>;
  }>('content/audio/audio_manifest_book3.json');
  const hosted = new Set(manifest.files.map((entry) => entry.file));
  const readings = getTestReadings(3);
  const missing = readings
    .map((reading) => officialAudioFileName(reading.bookId, reading.audioReference))
    .filter((file): file is string => file !== null)
    .filter((file) => !hosted.has(file));
  assert.deepEqual(missing, []);
  assert.equal(manifest.count, 64);
});

test('master switch is on', () => {
  assert.equal(OFFICIAL_BOOK_AUDIO_ENABLED, true);
});
