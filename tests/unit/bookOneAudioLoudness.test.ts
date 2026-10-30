import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

test('all verified Book 1 recordings use quieter public copies and a fresh offline cache', async (context) => {
  const result = await build({ entryPoints: ['src/services/audio/audioCache.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ VITE_AUDIO_BASE_URL: 'https://audio.test' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/audio/audioCache');
  const manifest = JSON.parse(await readFile('content/audio/book1_loudness.json', 'utf8')) as {
    count: number; files: Array<{ source: string; audio: string; gainDb: number; after: { lufs: number | null; peakDbtp: number } }>;
  };
  assert.equal(manifest.count, 1777);
  assert.equal(manifest.files.length, manifest.count);
  for (const entry of manifest.files) {
    assert.equal(api.publicAudioUrl(entry.source), `https://audio.test/${entry.audio}`);
    assert.ok(entry.gainDb <= 0);
    assert.ok(entry.after.peakDbtp <= -1.35);
    assert.ok(entry.after.lufs === null || entry.after.lufs <= -16.35);
  }
  for (const file of ['B3-01-1-1.mp3', 'modernchinese-B2L01-1-01.mp3',
    'B2-16-2-1.mp3',
    'vocabulary-trimmed/v1/B3L01-1-01-aabbccddeeff.mp3', 'pronunciation/character.mp3']) {
    assert.equal(api.publicAudioUrl(file), `https://audio.test/${file}`);
  }
  const signed = 'https://audio.test/B1-01-1-1.mp3?signature=keep';
  assert.equal(api.publicAudioUrl(signed), signed);
  assert.equal(api.publicAudioUrl('normalized/book1-v1/B1-01-1-1.mp3'),
    'https://audio.test/normalized/book1-v1/B1-01-1-1.mp3');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  let opened = '';
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: {
    open: async (name: string) => { opened = name; return {}; },
  } });
  context.after(() => {
    if (previous) Object.defineProperty(globalThis, 'caches', previous);
    else Reflect.deleteProperty(globalThis, 'caches');
  });
  await api.getAudioFileCache();
  assert.equal(opened, 'rongwaps-audio-v7');
});

test('installations without the R2 CDN retain their original storage paths', async () => {
  const result = await build({ entryPoints: ['src/services/audio/audioCache.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://storage.test' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/audio/audioCache');
  assert.equal(api.publicAudioUrl('B1-01-1-1.mp3'),
    'https://storage.test/storage/v1/object/public/vocabulary-audio/B1-01-1-1.mp3');
});

test('default DEV Book 2 tracks retain CDN URLs until local playback is opted into', async () => {
  const result = await build({ entryPoints: ['src/services/audio/audioCache.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ DEV: true, VITE_AUDIO_BASE_URL: 'https://audio.test' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/audio/audioCache');
  assert.equal(api.publicAudioUrl('B2-01-1-1.mp3'), 'https://audio.test/B2-01-1-1.mp3');
  assert.equal(api.publicAudioUrl('B2-16-2-1.mp3'), 'https://audio.test/B2-16-2-1.mp3');
  assert.equal(api.publicAudioUrl('B2-17-1-1.mp3'), 'https://audio.test/B2-17-1-1.mp3');
});

test('opt-in DEV Book 2 tracks resolve to locally provisioned public assets', async () => {
  const result = await build({ entryPoints: ['src/services/audio/audioCache.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ DEV: true, VITE_BOOK2_AUDIO_LOCAL: 'true', VITE_AUDIO_BASE_URL: 'https://audio.test' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/audio/audioCache');
  assert.equal(api.publicAudioUrl('B2-01-1-1.mp3'), 'http://localhost/audio/book2/B2-01-1-1.mp3');
  assert.equal(api.publicAudioUrl('B2-16-2-1.mp3'), 'http://localhost/audio/book2/B2-16-2-1.mp3');
  assert.equal(api.publicAudioUrl('B2-17-1-1.mp3'), 'https://audio.test/B2-17-1-1.mp3');
});

test('production ignores the local Book 2 opt-in and retains the CDN URL', async () => {
  const result = await build({ entryPoints: ['src/services/audio/audioCache.ts'], bundle: true,
    format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env': JSON.stringify({ DEV: false, VITE_BOOK2_AUDIO_LOCAL: 'true', VITE_AUDIO_BASE_URL: 'https://audio.test' }) } });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/audio/audioCache');
  assert.equal(api.publicAudioUrl('B2-01-1-1.mp3'), 'https://audio.test/B2-01-1-1.mp3');
});
