/** Regenerate the tiny runtime index from the successful import receipt. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { isPronunciationAudioPack } from '../../src/services/pronunciationAudio';

export async function exportCnsAudioPack(): Promise<void> {
  const receipt = JSON.parse(await readFile('content/audio/cns_pronunciation_audio.json', 'utf8')) as {
    version: string; recordings: Array<{ reading: string; file: string }>;
  };
  const prefix = 'pronunciation/cns-female-20250113/';
  const items = Object.fromEntries(receipt.recordings.map((r) => {
    if (!r.file.startsWith(prefix)) throw new Error('Unexpected CNS object prefix.');
    return [r.reading, r.file.slice(prefix.length)];
  }));
  const cnsBase = { schemaVersion: 1, count: receipt.recordings.length, prefix, items };
  const cnsVersion = createHash('sha256').update(JSON.stringify(cnsBase)).digest('hex').slice(0, 16);
  if (cnsVersion !== receipt.version) throw new Error('CNS import receipt version mismatch.');
  const supplements = JSON.parse(await readFile('content/audio/book_audio_supplements.json', 'utf8')) as {
    recordings: Array<{ word: string; pinyin: string; audio: string; listeningReview: string }>;
  };
  const words = supplements.recordings.filter((entry) => entry.audio.startsWith('book-supplement/qwen/')).map((entry) => {
    if (entry.listeningReview !== 'Owner approved listening preview, 2026-10-11.') throw new Error('Unreviewed word supplement.');
    return { word: entry.word, pinyin: entry.pinyin, audio: entry.audio };
  });
  const base = { ...cnsBase, ...(words.length ? { words } : {}) };
  const version = createHash('sha256').update(JSON.stringify(base)).digest('hex').slice(0, 16);
  const pack = { ...base, version };
  if (!isPronunciationAudioPack(pack)) throw new Error('Invalid CNS import receipt.');
  const json = JSON.stringify(pack) + '\n';
  const filename = `${version}.json`;
  await mkdir('public/data/pronunciation-audio', { recursive: true });
  await writeFile(`public/data/pronunciation-audio/${filename}`, json);
  await writeFile('public/data/pronunciation-audio/manifest.json', JSON.stringify({ schemaVersion: 1, version, count: pack.count,
    path: `/data/pronunciation-audio/${filename}`, sha256: createHash('sha256').update(json).digest('hex'), bytes: Buffer.byteLength(json) }) + '\n');
  await unlink('public/data/pronunciation-audio/index.json').catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
  console.log(`Published versioned CNS index: ${pack.count} sounds, ${Buffer.byteLength(json)} bytes.`);
}

if (process.argv[1]?.endsWith('/exportCnsAudio.ts')) await exportCnsAudioPack();
