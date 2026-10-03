import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const HANZI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}]/u;
const VOCAB_DIR = join(process.cwd(), 'public', 'data', 'vocabulary');
const HANZI_DATA_DIR = join(process.cwd(), 'public', 'hanzi-data');
const PACKAGE_DIR = join(process.cwd(), 'node_modules', 'hanzi-writer-data');
const OUT_DIR = join(process.cwd(), 'public', 'data', 'strokes');
const SHARD_COUNT = 32;

interface StrokeItem {
  character: string;
  strokes: string[];
  medians: number[][][];
  radStrokes?: number[];
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function getShardIndex(char: string, shardCount: number): number {
  const code = char.codePointAt(0) ?? 0;
  return code % shardCount;
}

function collectCourseChars(): Set<string> {
  const chars = new Set<string>();
  const files = readdirSync(VOCAB_DIR).filter((f) => f.startsWith('book-') && f.endsWith('.json'));
  for (const file of files) {
    const pack = JSON.parse(readFileSync(join(VOCAB_DIR, file), 'utf8')) as {
      items?: Array<{ traditional?: string; simplified?: string }>;
    };
    for (const item of pack.items ?? []) {
      for (const field of [item.traditional, item.simplified]) {
        for (const char of field ?? '') {
          if (HANZI_RE.test(char)) chars.add(char);
        }
      }
    }
  }
  return chars;
}

function loadCharacterStrokeData(char: string): StrokeItem | null {
  // Try public/hanzi-data first, then node_modules/hanzi-writer-data
  const paths = [
    join(HANZI_DATA_DIR, `${char}.json`),
    join(PACKAGE_DIR, `${char}.json`),
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const raw = JSON.parse(readFileSync(p, 'utf8')) as {
          strokes: string[];
          medians: number[][][];
          radStrokes?: number[];
        };
        const item: StrokeItem = {
          character: char,
          strokes: raw.strokes,
          medians: raw.medians,
        };
        if (raw.radStrokes && raw.radStrokes.length > 0) {
          item.radStrokes = raw.radStrokes;
        }
        return item;
      } catch {
        // Continue
      }
    }
  }
  return null;
}

function main() {
  const chars = collectCourseChars();
  console.log(`Course unique Chinese characters: ${chars.size}`);

  mkdirSync(OUT_DIR, { recursive: true });

  const shards: StrokeItem[][] = Array.from({ length: SHARD_COUNT }, () => []);
  let missing = 0;

  for (const char of chars) {
    const data = loadCharacterStrokeData(char);
    if (data) {
      const shardIdx = getShardIndex(char, SHARD_COUNT);
      shards[shardIdx].push(data);
    } else {
      missing += 1;
    }
  }

  // Also include any characters currently present in public/hanzi-data that weren't in course vocab
  if (existsSync(HANZI_DATA_DIR)) {
    const existingFiles = readdirSync(HANZI_DATA_DIR).filter(
      (f) => f.endsWith('.json') && f !== 'manifest.json'
    );
    for (const f of existingFiles) {
      const char = f.replace('.json', '');
      if (!chars.has(char)) {
        const data = loadCharacterStrokeData(char);
        if (data) {
          const shardIdx = getShardIndex(char, SHARD_COUNT);
          shards[shardIdx].push(data);
        }
      }
    }
  }

  // Sort within each shard for determinism
  for (const shard of shards) {
    shard.sort((a, b) => (a.character.codePointAt(0) ?? 0) - (b.character.codePointAt(0) ?? 0));
  }

  const shardEntries: Array<{
    shard: number;
    count: number;
    path: string;
    sha256: string;
    bytes: number;
  }> = [];

  let totalChars = 0;
  let totalBytes = 0;

  for (let shardIdx = 0; shardIdx < SHARD_COUNT; shardIdx++) {
    const shardItems = shards[shardIdx];
    const shardNumStr = String(shardIdx).padStart(2, '0');
    const filename = `shard-${shardNumStr}.json`;
    const packObj = {
      schemaVersion: 1,
      shard: shardIdx,
      count: shardItems.length,
      items: shardItems,
    };

    const jsonStr = JSON.stringify(packObj);
    const hash = sha256(jsonStr);
    const bytes = Buffer.byteLength(jsonStr, 'utf8');

    writeFileSync(join(OUT_DIR, filename), jsonStr, 'utf8');

    shardEntries.push({
      shard: shardIdx,
      count: shardItems.length,
      path: `/data/strokes/${filename}`,
      sha256: hash,
      bytes,
    });

    totalChars += shardItems.length;
    totalBytes += bytes;
  }

  const manifest = {
    schemaVersion: 1,
    version: `v${sha256(JSON.stringify(shardEntries)).slice(0, 12)}`,
    generatedAt: new Date().toISOString(),
    totalCount: totalChars,
    shardCount: SHARD_COUNT,
    shardStrategy: 'unicode-code-point-modulo',
    shards: shardEntries,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileSync(join(OUT_DIR, 'manifest.json'), manifestJson, 'utf8');

  console.log(`Successfully generated ${SHARD_COUNT} stroke shards in public/data/strokes/:`);
  console.log(`  - Total characters packed: ${totalChars} (missing: ${missing})`);
  console.log(`  - Total raw size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Average shard size: ${(totalBytes / SHARD_COUNT / 1024).toFixed(1)} KB`);
  console.log(`  - Manifest written with version ${manifest.version}`);
}

main();
