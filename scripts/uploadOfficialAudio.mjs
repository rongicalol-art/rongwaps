/**
 * Upload the re-encoded official 時代華語 Book 1 audio to Supabase Storage.
 *
 * Files land in the existing public `vocabulary-audio` bucket (same bucket
 * the vocabulary/tts audio uses), so the client's durable-cache → public URL
 * → /api/audio proxy chain serves them with zero server changes.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/uploadOfficialAudio.mjs [--dry-run]
 *
 * Source files: output/official-audio/book1/*.mp3 (see downloadOfficialAudio.mjs).
 */
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DIR = 'output/official-audio/book1';
const BUCKET = 'vocabulary-audio';
const CONCURRENCY = 4;
const DRY_RUN = process.argv.includes('--dry-run');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY '
    + '(the service-role key, not the anon key) before running.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const files = (await readdir(SOURCE_DIR)).filter((name) => name.endsWith('.mp3')).sort();
if (files.length === 0) {
  console.error(`No mp3 files in ${SOURCE_DIR} — run scripts/downloadOfficialAudio.mjs first.`);
  process.exit(1);
}

console.log(`Uploading ${files.length} files to ${BUCKET}${DRY_RUN ? ' (DRY RUN)' : ''}...`);

let cursor = 0;
let uploaded = 0;
const failures = [];

async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    const localPath = path.join(SOURCE_DIR, file);
    const { size } = await stat(localPath);
    const body = await readFile(localPath);

    if (DRY_RUN) {
      console.log(`would upload ${file} (${size} bytes)`);
      uploaded += 1;
      continue;
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file, body, { contentType: 'audio/mpeg', upsert: true });
    if (error) {
      failures.push({ file, error: error.message });
      console.error(`FAIL ${file}: ${error.message}`);
    } else {
      uploaded += 1;
      console.log(`ok   ${file} (${size} bytes)`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\n${uploaded}/${files.length} uploaded to ${BUCKET}.`);

// Verify a sample of what the public client path would serve.
if (!DRY_RUN && uploaded === files.length) {
  const samples = files.filter((file) => /-1-1\.mp3$/.test(file)).slice(0, 3);
  for (const file of samples) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(file);
    const response = await fetch(data.publicUrl, { method: 'HEAD' });
    console.log(`verify ${file} -> ${response.status} ${response.headers.get('content-type')}`);
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} failures:`);
  for (const failure of failures) console.error(`  ${failure.file}: ${failure.error}`);
  process.exitCode = 1;
}
