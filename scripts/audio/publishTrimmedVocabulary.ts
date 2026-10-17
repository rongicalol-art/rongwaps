/** Publish audited, losslessly trimmed vocabulary copies and regenerate pack references.
 * node --import dotenv/config --import tsx scripts/audio/publishTrimmedVocabulary.ts [--upload] [--apply]
 * Default is local validation only. Originals and reader/CNS/supplement audio are never overwritten.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface TrimResult {
  id: string; word: string; pinyin: string; source: string; sourceSha256: string; sourceBytes: number;
  status: string; leadingMs: number; audio?: string; sha256?: string; bytes?: number;
  retainedLeadingMs?: number; removedMs?: number; speechPcmIdentical?: boolean;
}
interface Audit {
  schemaVersion: number; method: string; thresholdDb: number; targetPaddingMs: number;
  selectionCount: number; results: TrimResult[];
}
interface VocabularyRow { id: string; traditional?: string; simplified?: string; pinyin?: string; audio?: string; audio_url?: string }
interface VocabularyPack { items: VocabularyRow[] }
const staging = 'output/audio/vocabulary-trim-v1';
const hash = (body: Buffer | string, algorithm = 'sha256') => createHash(algorithm).update(body).digest('hex');

export function validateTrim(result: TrimResult): void {
  if (result.status !== 'trimmed' || !/^B[1-4]L\d{2}-\d-\d+$/.test(result.id)
    || result.source !== `modernchinese-${result.id}.mp3`
    || !result.sha256 || !/^[a-f0-9]{64}$/.test(result.sha256)
    || result.audio !== `vocabulary-trimmed/v1/${result.id}-${result.sha256.slice(0, 12)}.mp3`
    || !/^[a-f0-9]{64}$/.test(result.sourceSha256)
    || !Number.isFinite(result.sourceBytes) || !Number.isFinite(result.leadingMs)
    || !Number.isFinite(result.bytes) || result.bytes! <= 0 || result.bytes! >= result.sourceBytes
    || !Number.isFinite(result.retainedLeadingMs) || result.retainedLeadingMs! < 80 || result.retainedLeadingMs! > 160
    || !Number.isFinite(result.removedMs) || result.removedMs! < 40 || result.removedMs! > 750
    || Math.abs(result.leadingMs - result.removedMs! - result.retainedLeadingMs!) > 1
    || result.speechPcmIdentical !== true) throw new Error(`Unsafe trim receipt: ${result.id}`);
}

async function main(): Promise<void> {
  const upload = process.argv.includes('--upload');
  const apply = process.argv.includes('--apply');
  const audit = JSON.parse(await readFile(`${staging}/audit.json`, 'utf8')) as Audit;
  if (audit.schemaVersion !== 1 || audit.method !== 'MP3 frame copy; no synthesis or re-encoding'
    || audit.thresholdDb !== -55 || audit.targetPaddingMs !== 100
    || audit.selectionCount < 4000 || audit.results.length !== audit.selectionCount
    || audit.results.some((entry) => !['trimmed', 'unchanged', 'review'].includes(entry.status))) {
    throw new Error('A complete, error-free vocabulary audit is required before publication.');
  }
  const trims = audit.results.filter((entry) => entry.status === 'trimmed');
  trims.forEach(validateTrim);
  const byId = new Map(trims.map((entry) => [entry.id, entry]));
  if (byId.size !== trims.length || !trims.length) throw new Error('Duplicate or empty trim selection.');
  const manifestPath = 'public/data/vocabulary/manifest.json';
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    version: string; generatedAt?: string; books: Array<{ path: string; sha256: string; bytes: number }>;
  };
  const outputs: Array<{ path: string; json: string }> = [];
  const matched = new Set<string>();
  for (const book of manifest.books) {
    const filename = `public${book.path}`;
    const source = await readFile(filename, 'utf8');
    if (hash(source) !== book.sha256) throw new Error('Vocabulary pack does not match its manifest.');
    const pack = JSON.parse(source) as VocabularyPack;
    for (const item of pack.items) {
      const trim = byId.get(item.id);
      if (!trim) continue;
      const current = item.audio !== undefined ? item.audio : item.audio_url || `modernchinese-${item.id}.mp3`;
      if ((current !== trim.source && current !== trim.audio)
        || (item.traditional || item.simplified) !== trim.word || item.pinyin !== trim.pinyin) {
        throw new Error(`Vocabulary identity/source changed: ${item.id}`);
      }
      item.audio = trim.audio;
      matched.add(trim.id);
    }
    const json = JSON.stringify(pack) + '\n';
    outputs.push({ path: filename, json });
    book.sha256 = hash(json);
    book.bytes = Buffer.byteLength(json);
  }
  if (matched.size !== trims.length) throw new Error('Unmatched trim references.');
  manifest.version = hash(JSON.stringify(manifest.books.map((book) => book.sha256))).slice(0, 16);

  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if ((upload || apply) && (!endpoint || !accessKeyId || !secretAccessKey)) throw new Error('R2 configuration unavailable.');
  const client = upload || apply ? new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! } }) : null;
  const bucket = process.env.R2_BUCKET_NAME || 'rongwaps-audio';
  let cursor = 0;
  let verified = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < trims.length) {
      const trim = trims[cursor++];
      const body = await readFile(path.join(staging, 'clips', path.basename(trim.audio!)));
      const original = await readFile(path.join(staging, 'originals', trim.source));
      if (hash(body) !== trim.sha256 || body.length !== trim.bytes
        || hash(original) !== trim.sourceSha256 || original.length !== trim.sourceBytes) throw new Error(`Local asset changed: ${trim.id}`);
      if (client) {
        const requestOptions = { abortSignal: AbortSignal.timeout(30_000) };
        const [source, cached] = await Promise.all([
          client.send(new HeadObjectCommand({ Bucket: bucket, Key: trim.source }), requestOptions),
          client.send(new HeadObjectCommand({ Bucket: bucket, Key: trim.audio }), requestOptions).catch((error: unknown) => {
            if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
            return undefined;
          }),
        ]);
        if (source.ContentLength !== original.length || source.ETag?.replaceAll('"', '') !== hash(original, 'md5')) {
          throw new Error(`Original R2 object changed: ${trim.id}`);
        }
        let object = cached;
        if (!object && upload) {
          await client.send(new PutObjectCommand({ Bucket: bucket, Key: trim.audio, Body: body,
            ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
            Metadata: { sha256: trim.sha256!, 'source-sha256': trim.sourceSha256 }, IfNoneMatch: '*' }), requestOptions);
          object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: trim.audio }), requestOptions);
        }
        if (object?.ContentLength !== body.length || object.Metadata?.sha256 !== trim.sha256
          || object.ETag?.replaceAll('"', '') !== hash(body, 'md5')) throw new Error(`Unverified R2 candidate: ${trim.id}`);
      }
      verified++;
      if (verified % 50 === 0) console.log(`Verified ${verified}/${trims.length} vocabulary copies.`);
    }
  }));
  client?.destroy();
  if (apply) {
    // Publish references only after every new object and preserved original is verified.
    await writeFile('content/audio/vocabulary_trim.json', JSON.stringify(audit, null, 2) + '\n');
    for (const output of outputs) await writeFile(output.path, output.json);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`${apply ? 'Published' : 'Validated'} ${trims.length} trimmed clips; ${audit.results.length - trims.length} originals retained.`);
}

if (process.argv[1]?.endsWith('/publishTrimmedVocabulary.ts')) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Vocabulary publication failed'); process.exitCode = 1; });
}
