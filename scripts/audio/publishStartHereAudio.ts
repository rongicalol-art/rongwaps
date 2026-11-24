// Local inventory by default. Generate missing clips with --generate or publish with --upload.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { START_HERE_LESSONS } from '../../src/screens/start-here/data';
import { parseTalkLine, TEACHER_RATE, TEACHER_VOICE } from '../../src/screens/start-here/data/talkParser';

const output = 'output/start-here-audio';
const cache = process.env.START_HERE_AUDIO_CACHE
  ?? join(homedir(), 'Projects/rongwaps/output/start-here-prototype/proto2/talk');
const clips = new Map(START_HERE_LESSONS.flatMap(({ screens }) => screens.flatMap((screen) =>
  ('talk' in screen ? screen.talk ?? [] : []).flatMap((line) => parseTalkLine(line).flatMap((segment) =>
    segment.kind === 'text' && segment.ssml ? [[segment.clipId, segment.ssml] as const] : [],
  )),
)));

async function hasClip(path: string) {
  return stat(path).then((file) => file.isFile() && file.size > 0).catch(() => false);
}

async function main() {
  const generate = process.argv.includes('--generate');
  const upload = process.argv.includes('--upload');
  if (generate && upload) throw new Error('Generate and review recordings before publishing them.');
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'japaneast';
  if (generate && (!key || !/^[a-z0-9]+$/.test(region))) throw new Error('Configure Azure Speech in the environment.');

  await mkdir(output, { recursive: true });
  const missing: string[] = [];
  for (const [id, text] of clips) {
    const file = `${id}.mp3`;
    const path = join(output, file);
    if (await hasClip(path)) continue;
    const cached = join(cache, file);
    if (await hasClip(cached)) {
      await copyFile(cached, path);
    } else if (generate && key) {
      const body = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${TEACHER_VOICE}"><prosody rate="${TEACHER_RATE}">${text}</prosody></voice></speak>`;
      const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        },
        body,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Azure Speech returned HTTP ${response.status} for ${id}.`);
      const audio = Buffer.from(await response.arrayBuffer());
      if (!audio.length) throw new Error(`Azure Speech returned an empty recording for ${id}.`);
      await writeFile(path, audio);
    } else {
      missing.push(id);
    }
  }
  console.log(`${clips.size - missing.length}/${clips.size} teacher clips available locally (${missing.length} missing).`);
  if (!upload) return;
  if (missing.length) throw new Error('Generate all missing clips before publishing.');
  const endpoint = process.env.R2_ENDPOINT
    ?? (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('Configure R2 in the environment.');
  const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
  try {
    for (const id of clips.keys()) {
      const file = `${id}.mp3`;
      const body = await readFile(join(output, file));
      await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'rongwaps-audio',
        Key: `start-here-teacher/v1/${file}`,
        Body: body,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000, immutable',
        ContentMD5: createHash('md5').update(body).digest('base64'),
        IfNoneMatch: '*',
      }), { abortSignal: AbortSignal.timeout(30_000) }).catch((error: unknown) => {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 412) throw error;
      });
    }
  } finally {
    client.destroy();
  }
  console.log(`Published ${clips.size} teacher clips.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Start here audio failed.');
  process.exitCode = 1;
});
