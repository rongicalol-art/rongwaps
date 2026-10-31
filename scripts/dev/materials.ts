/**
 * Book scans and transcripts (`materials/`, gitignored, ~2 GB) live in a
 * private R2 bucket so lesson work also runs in Claude Code cloud sessions
 * (phone, laptop off). Copyrighted pages: never commit them, never publish
 * the bucket.
 *
 *   npx tsx scripts/dev/materials.ts push [prefix]   Mac → bucket (new or changed files)
 *   npx tsx scripts/dev/materials.ts pull <prefix>   bucket → materials/, e.g. book3/L07
 *   npx tsx scripts/dev/materials.ts list [prefix]
 *
 * Env: MATERIALS_R2_ACCOUNT_ID, MATERIALS_R2_ACCESS_KEY_ID,
 * MATERIALS_R2_SECRET_ACCESS_KEY, optional MATERIALS_BUCKET (rongwaps-materials).
 * Cloud sessions get a read-only token; push needs a read-write one.
 */
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../materials');
const BUCKET = process.env.MATERIALS_BUCKET ?? 'rongwaps-materials';

function client(): S3Client {
  const account = process.env.MATERIALS_R2_ACCOUNT_ID;
  const accessKeyId = process.env.MATERIALS_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.MATERIALS_R2_SECRET_ACCESS_KEY;
  if (!account || !accessKeyId || !secretAccessKey) {
    throw new Error('Set MATERIALS_R2_ACCOUNT_ID, MATERIALS_R2_ACCESS_KEY_ID and MATERIALS_R2_SECRET_ACCESS_KEY (see docs/RELEASING.md → Phone setup).');
  }
  return new S3Client({ region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
}

/** Object key → ETag (MD5 for single-part uploads) under a prefix. */
async function remote(s3: S3Client, prefix: string): Promise<Map<string, string>> {
  const objects = new Map<string, string>();
  let token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }));
    for (const item of page.Contents ?? []) if (item.Key) objects.set(item.Key, (item.ETag ?? '').replaceAll('"', ''));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

function localFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (entry.startsWith('.')) return [];
    const stat = statSync(full, { throwIfNoEntry: false });
    if (!stat) return []; // dangling symlink
    return stat.isDirectory() ? localFiles(full) : [full];
  });
}

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) await Promise.all(items.slice(index, index + size).map(run));
}

async function push(prefix = '') {
  const s3 = client();
  const existing = await remote(s3, prefix);
  const files = localFiles(path.join(ROOT, prefix)).filter((file) => statSync(file).size < 4_900_000_000);
  let sent = 0;
  await inBatches(files, 8, async (file) => {
    const key = path.relative(ROOT, file).split(path.sep).join('/');
    const body = readFileSync(file);
    if (existing.get(key) === createHash('md5').update(body).digest('hex')) return;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }));
    sent += 1;
  });
  console.log(`materials: ${sent} uploaded, ${files.length - sent} already current (${prefix || 'all'})`);
}

async function pull(prefix: string) {
  if (!prefix) throw new Error('pull needs a prefix such as book3/L07 (the whole set is ~2 GB)');
  const s3 = client();
  const keys = [...(await remote(s3, prefix)).keys()];
  await inBatches(keys, 8, async (key) => {
    const target = path.join(ROOT, ...key.split('/'));
    if (!target.startsWith(ROOT + path.sep)) return;
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await object.Body!.transformToByteArray()));
  });
  console.log(`materials: ${keys.length} file(s) under ${prefix} → materials/`);
}

const [command, prefix = ''] = process.argv.slice(2);
const run = async () => {
  if (command === 'push') return push(prefix);
  if (command === 'pull') return pull(prefix);
  if (command === 'list') {
    for (const key of (await remote(client(), prefix)).keys()) console.log(key);
    return;
  }
  throw new Error('usage: materials.ts push [prefix] | pull <prefix> | list [prefix]');
};
run().catch((error: unknown) => {
  console.error(`materials: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
