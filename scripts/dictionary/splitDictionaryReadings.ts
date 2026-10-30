import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../../shared/dictionaryShard';
import { numberToToneMarks } from '../../shared/pinyin';

const DIRECTORY = resolve(process.cwd(), 'public/data/dictionary');
const READING_LINE_RE = /^\[([^\]]+)\]:\s*(.+)$/;

type RawShardItem = [number, string, string, string, unknown];

interface ManifestShard {
  shard: number;
  count: number;
  path: string;
  sha256: string;
  bytes: number;
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function parseMergedDefinitions(basePinyin: string, defs: unknown[]): Array<{ pinyin: string; senses: string[] }> {
  const pending: string[] = [];
  const tagged: Array<{ pinyin: string; senses: string[] }> = [];

  for (const item of defs) {
    if (typeof item !== 'string') continue;
    const match = READING_LINE_RE.exec(item.trim());
    if (!match) {
      pending.push(item);
    } else {
      const tagPinyin = match[1].trim();
      const summary = match[2].trim();
      let size = pending.length;
      while (size > 0 && pending.slice(-size).join(', ') !== summary) {
        size -= 1;
      }
      const senses = size > 0 ? pending.slice(-size) : [summary];
      if (size > 0) {
        pending.splice(pending.length - size, size);
      }
      tagged.push({ pinyin: numberToToneMarks(tagPinyin), senses });
    }
  }

  const results: Array<{ pinyin: string; senses: string[] }> = [];
  let baseClaimed = false;

  for (const t of tagged) {
    if (t.pinyin.toLowerCase() === basePinyin.toLowerCase()) {
      baseClaimed = true;
    }
    results.push(t);
  }

  if (!baseClaimed && pending.length > 0) {
    results.unshift({ pinyin: basePinyin, senses: pending });
  } else if (pending.length > 0) {
    if (results.length > 0 && results[0].pinyin.toLowerCase() === basePinyin.toLowerCase()) {
      results[0].senses = [...pending, ...results[0].senses];
    } else {
      results.unshift({ pinyin: basePinyin, senses: pending });
    }
  }

  return results.length > 0 ? results : [{ pinyin: basePinyin, senses: defs.filter((d): d is string => typeof d === 'string') }];
}

async function main(): Promise<void> {
  console.log('Loading dictionary shards...');
  const rowsById = new Map<number, RawShardItem>();

  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard += 1) {
    const filename = `shard-${String(shard).padStart(2, '0')}.json`;
    const filePath = resolve(DIRECTORY, filename);
    const content = await readFile(filePath, 'utf8');
    const pack = JSON.parse(content) as { items: RawShardItem[] };
    for (const item of pack.items) {
      if (!rowsById.has(item[0])) {
        rowsById.set(item[0], item);
      }
    }
  }

  console.log(`Loaded ${rowsById.size} unique rows.`);
  let maxId = 0;
  for (const id of rowsById.keys()) {
    if (id > maxId) maxId = id;
  }
  let nextId = maxId + 1;

  const splitRows: RawShardItem[] = [];
  let splitCount = 0;

  for (const rowId of [...rowsById.keys()].sort((a, b) => a - b)) {
    const item = rowsById.get(rowId)!;
    const defs = item[4];

    if (Array.isArray(defs) && defs.some((d) => typeof d === 'string' && READING_LINE_RE.test(d.trim()))) {
      const readings = parseMergedDefinitions(item[3], defs);
      splitCount += 1;
      for (let idx = 0; idx < readings.length; idx += 1) {
        const currId = idx === 0 ? rowId : nextId++;
        splitRows.push([
          currId,
          item[1],
          item[2],
          readings[idx].pinyin,
          readings[idx].senses,
        ]);
      }
    } else {
      splitRows.push(item);
    }
  }

  console.log(`Split ${splitCount} multi-reading rows. Total rows now: ${splitRows.length} (added ${splitRows.length - rowsById.size} rows).`);

  const shards = Array.from({ length: DICTIONARY_SHARD_COUNT }, () => new Map<number, RawShardItem>());

  for (const row of splitRows) {
    const [rowId, simplified, rawTrad] = row;
    const traditional = rawTrad || simplified;
    const aliases = new Set([traditional, simplified].filter(Boolean));
    for (const alias of aliases) {
      const shardIdx = getDictionaryShard(alias);
      shards[shardIdx].set(rowId, row);
    }
  }

  const manifestShards: ManifestShard[] = [];

  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard += 1) {
    const items = [...shards[shard].values()].sort((a, b) => a[0] - b[0]);
    const filename = `shard-${String(shard).padStart(2, '0')}.json`;
    const pack = {
      schemaVersion: 2,
      shard,
      count: items.length,
      items,
    };
    const content = `${JSON.stringify(pack)}\n`;
    await writeFile(resolve(DIRECTORY, filename), content, 'utf8');

    manifestShards.push({
      shard,
      count: items.length,
      path: `/data/dictionary/${filename}`,
      sha256: hash(content),
      bytes: Buffer.byteLength(content),
    });
  }

  const packedItemCount = manifestShards.reduce((total, s) => total + s.count, 0);
  const manifest = {
    schemaVersion: 2,
    version: hash(manifestShards.map((s) => s.sha256).join(':')).slice(0, 16),
    generatedAt: new Date().toISOString(),
    sourceCount: splitRows.length,
    packedItemCount,
    shardCount: DICTIONARY_SHARD_COUNT,
    shardStrategy: 'word-hash-modulo',
    shards: manifestShards,
  };

  await writeFile(
    resolve(DIRECTORY, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Wrote ${DICTIONARY_SHARD_COUNT} shards and updated manifest.json.`);
}

main().catch((err) => {
  console.error('Failed to split dictionary readings:', err);
  process.exit(1);
});
