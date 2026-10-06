/**
 * Synchronize all audio files from Supabase Storage (`vocabulary-audio`)
 * to a Cloudflare R2 bucket.
 *
 * Features:
 * - Resumable & Idempotent: checks R2 first and skips already-uploaded files.
 * - Concurrency: streams multiple files in parallel for fast migration.
 * - Dry-run mode (`--dry-run`): tests credentials and lists files to copy.
 * - Verify mode (`--verify`): audits R2 against Supabase to ensure 100% parity.
 *
 * Usage:
 *   npx tsx scripts/audio/syncAudioToR2.ts [--dry-run] [--verify] [--concurrency=8]
 *
 * Required environment variables (in .env or environment):
 *   R2_ACCOUNT_ID or R2_ENDPOINT
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME (default: 'rongwaps-audio')
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY
 */

import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

// Load env files
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) {
      try {
        const parsed = parse(readFileSync(file, 'utf8'));
        for (const [k, v] of Object.entries(parsed)) {
          if (!env[k]) env[k] = v;
        }
      } catch {
        // Ignore
      }
    }
  }
  return env;
}

const env = loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify');
const CONCURRENCY_ARG = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = CONCURRENCY_ARG ? Number(CONCURRENCY_ARG.split('=')[1]) : 8;

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = 'vocabulary-audio';

const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = env.R2_BUCKET_NAME || 'rongwaps-audio';
const R2_ENDPOINT = env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

function checkConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Missing Cloudflare R2 credentials. Please set:');
    console.error('   R2_ACCOUNT_ID (or R2_ENDPOINT)');
    console.error('   R2_ACCESS_KEY_ID');
    console.error('   R2_SECRET_ACCESS_KEY');
    console.error('   R2_BUCKET_NAME (optional, defaults to "rongwaps-audio")\n');
    console.error('You can add these into your .env or .env.local file.');
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listAllSupabaseFiles(supabase: SupabaseClient<any, any, any>): Promise<string[]> {
  console.log(`📦 Listing files from Supabase Storage bucket "${SUPABASE_BUCKET}"...`);
  const files: string[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list('', { limit, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      if (item.name && !item.name.startsWith('.')) {
        files.push(item.name);
      }
    }
    offset += limit;
    if (data.length < limit) break;
    process.stdout.write(`\rFound ${files.length} files in Supabase...`);
  }
  console.log(`\r✅ Total files in Supabase "${SUPABASE_BUCKET}": ${files.length}`);
  return files;
}

async function listAllR2Objects(s3: S3Client): Promise<Set<string>> {
  console.log(`☁️  Listing existing objects in Cloudflare R2 bucket "${R2_BUCKET_NAME}"...`);
  const existing = new Set<string>();
  let continuationToken: string | undefined;

  try {
    do {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of response.Contents ?? []) {
        if (item.Key) existing.add(item.Key);
      }
      continuationToken = response.NextContinuationToken;
      process.stdout.write(`\rFound ${existing.size} existing files in R2...`);
    } while (continuationToken);

    console.log(`\r✅ Total existing files in R2 "${R2_BUCKET_NAME}": ${existing.size}`);
  } catch (error) {
    console.warn(`\n⚠️  Could not list R2 bucket (it may be empty or newly created):`, (error as Error).message);
  }

  return existing;
}

async function main() {
  checkConfig();

  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });

  const supabaseFiles = await listAllSupabaseFiles(supabase);
  const r2Files = await listAllR2Objects(s3);

  const missingInR2 = supabaseFiles.filter((f) => !r2Files.has(f));

  if (VERIFY_ONLY) {
    console.log('\n--- VERIFICATION REPORT ---');
    console.log(`Total Supabase files: ${supabaseFiles.length}`);
    console.log(`Total R2 files:       ${r2Files.size}`);
    console.log(`Missing in R2:        ${missingInR2.length}`);
    if (missingInR2.length > 0) {
      console.log(`Sample missing:`, missingInR2.slice(0, 10));
    } else {
      console.log('🎉 100% PARITY! All files are synced to Cloudflare R2.');
    }
    return;
  }

  console.log(`\n📊 Status:`);
  console.log(`  - Total files in Supabase:   ${supabaseFiles.length}`);
  console.log(`  - Already uploaded to R2:    ${supabaseFiles.length - missingInR2.length}`);
  console.log(`  - Pending transfer to R2:    ${missingInR2.length}`);

  if (missingInR2.length === 0) {
    console.log('\n🎉 Cloudflare R2 is already 100% up to date! Nothing to sync.');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would copy ${missingInR2.length} files from Supabase to R2.`);
    console.log('Sample files that would be uploaded:', missingInR2.slice(0, 5));
    return;
  }

  console.log(`\n🚀 Starting transfer with concurrency ${CONCURRENCY}...`);

  let completed = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < missingInR2.length) {
      const index = cursor++;
      const fileName = missingInR2[index];

      try {
        // Download from Supabase
        const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(fileName);
        if (error || !data) {
          throw error || new Error(`No data returned for ${fileName}`);
        }

        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudflare R2
        await s3.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: 'audio/mpeg',
          }),
        );

        completed += 1;
        const percent = ((completed / missingInR2.length) * 100).toFixed(1);
        process.stdout.write(
          `\r[${completed}/${missingInR2.length}] (${percent}%) Uploaded: ${fileName.padEnd(35)}`,
        );
      } catch (err) {
        failed += 1;
        console.error(`\n❌ Failed to sync ${fileName}:`, (err as Error).message);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, missingInR2.length) }, () => worker());
  await Promise.all(workers);

  console.log(`\n\n✅ Transfer finished!`);
  console.log(`  - Successfully synced: ${completed}`);
  console.log(`  - Failed:              ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL AUDIO FILES HAVE BEEN MIGRATED TO CLOUDFLARE R2!');
    console.log('Next step:');
    console.log('Set VITE_AUDIO_BASE_URL in your .env / deployment to your R2 public domain:');
    console.log('  VITE_AUDIO_BASE_URL="https://<your-custom-domain-or-r2.dev>"');
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error during sync:', err);
  process.exit(1);
});
