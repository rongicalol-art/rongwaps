/** Apply licensed supplements only to genuinely missing book references; preserve originals. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { pronunciationKey } from '../../src/utils/pinyin/pronunciationMatching';

const receipt = JSON.parse(await readFile('content/audio/book_audio_supplements.json', 'utf8')) as {
  schemaVersion: number;
  recordings: Array<{ id: string; word: string; pinyin: string; audio: string; bytes: number; sha256: string; license: string; licenseUrl: string; scope?: string; listeningReview: string }>;
};
if (receipt.schemaVersion !== 1) throw new Error('Unsupported supplement receipt.');
const apply = process.argv.includes('--apply');
const client = apply ? new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } }) : null;
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const manifest = JSON.parse(await readFile('public/data/vocabulary/manifest.json', 'utf8'));
const matched = new Set<string>();
const outputs: Array<{ path: string; json: string }> = [];
for (const book of manifest.books) {
  const filename = `public${book.path}`;
  const pack = JSON.parse(await readFile(filename, 'utf8'));
  for (const supplement of receipt.recordings) {
    const item = pack.items.find((row: { id: string }) => row.id === supplement.id);
    if (!item) continue;
    const commons = supplement.license === 'CC BY-SA 3.0 US' && supplement.licenseUrl === 'https://creativecommons.org/licenses/by-sa/3.0/us/'
      && /^book-supplement\/commons\/[a-z]+-[a-f0-9]{12}\.mp3$/.test(supplement.audio);
    const generated = supplement.license === 'Apache-2.0 (model)' && supplement.licenseUrl === 'https://www.apache.org/licenses/LICENSE-2.0'
      && /^book-supplement\/qwen\/[A-Za-z0-9-]+-[a-f0-9]{12}\.mp3$/.test(supplement.audio)
      && supplement.listeningReview === 'Owner approved listening preview, 2026-10-11.';
    const readings = supplement.scope === 'reading' ? item.pinyin.split('/') : [item.pinyin];
    if (item.traditional !== supplement.word || !readings.some((reading: string) => pronunciationKey(reading) === pronunciationKey(supplement.pinyin))
      || (!commons && !generated)) throw new Error('Supplement identity/license mismatch.');
    if (supplement.scope !== 'reading' && item.audio !== '' && item.audio !== supplement.audio) throw new Error('Refusing to replace a book recording.');
    if (client) {
      const object = await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'rongwaps-audio', Key: supplement.audio }));
      if (object.ContentLength !== supplement.bytes || object.Metadata?.sha256 !== supplement.sha256) throw new Error('Unverified supplemental object.');
    }
    if (supplement.scope !== 'reading') item.audio = supplement.audio;
    matched.add(supplement.id);
  }
  const json = JSON.stringify(pack) + '\n';
  outputs.push({ path: filename, json });
  book.sha256 = sha256(json);
  book.bytes = Buffer.byteLength(json);
}
if (matched.size !== receipt.recordings.length) throw new Error('Unmatched or duplicate supplement IDs.');
manifest.version = sha256(JSON.stringify(manifest.books.map((book: { sha256: string }) => book.sha256))).slice(0, 16);
if (apply) {
  for (const output of outputs) await writeFile(output.path, output.json);
  await writeFile('public/data/vocabulary/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
}
console.log(`${apply ? 'Published' : 'Previewed'} ${matched.size} licensed book supplement(s); no original recordings replaced.`);
