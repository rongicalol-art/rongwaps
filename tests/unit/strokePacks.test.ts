import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { isValidStrokeItem, isValidStrokePack, type StrokePack } from '../../src/utils/packValidators';
import { lookupStrokeData } from '../../src/services/contentPacks';
import { loadHanziCharacterData } from '../../src/services/contentAssetService';

test('isValidStrokeItem accepts well-formed stroke data', () => {
  const valid = {
    character: '你',
    strokes: ['M 0 0 L 10 10'],
    medians: [[[0, 0], [10, 10]]],
    radStrokes: [0],
  };
  assert.equal(isValidStrokeItem(valid), true);

  const missingStrokes = {
    character: '你',
    medians: [[[0, 0]]],
  };
  assert.equal(isValidStrokeItem(missingStrokes), false);

  const missingChar = {
    strokes: ['M 0 0'],
    medians: [[[0, 0]]],
  };
  assert.equal(isValidStrokeItem(missingChar), false);
});

test('isValidStrokePack checks schema, shard number, and item counts', () => {
  const pack: StrokePack = {
    schemaVersion: 1,
    shard: 2,
    count: 1,
    items: [
      {
        character: '你',
        strokes: ['M 0 0'],
        medians: [[[0, 0]]],
      },
    ],
  };
  assert.equal(isValidStrokePack(pack, 2, 1), true);
  assert.equal(isValidStrokePack(pack, 3, 1), false);
  assert.equal(isValidStrokePack(pack, 2, 2), false);
});

test('lookupStrokeData returns HanziWriter CharacterJson for course characters', async () => {
  const charData = await lookupStrokeData('你');
  assert.ok(charData, 'Stroke data for "你" must resolve');
  assert.ok(Array.isArray(charData.strokes), 'Strokes must be an array');
  assert.ok(charData.strokes.length > 0, 'Strokes array must not be empty');
  assert.ok(Array.isArray(charData.medians), 'Medians must be an array');
  assert.equal(charData.strokes.length, charData.medians.length, 'Every stroke must have corresponding medians');
});

test('lookupStrokeData resolves another common character like "好"', async () => {
  const charData = await lookupStrokeData('好');
  assert.ok(charData, 'Stroke data for "好" must resolve');
  assert.equal(charData.strokes.length, 6, '"好" has 6 strokes');
});

test('loadHanziCharacterData resolves character data seamlessly', async () => {
  const data = await loadHanziCharacterData('一');
  assert.ok(data, 'Stroke data for "一" must resolve');
  assert.equal(data.strokes.length, 1, '"一" has 1 stroke');
});

test('lookupStrokeData returns null for unknown characters, allowing CDN fallback', async () => {
  // Pass an unusual or non-course symbol
  const data = await lookupStrokeData('𠀀');
  assert.equal(data, null);
});

test('public/data/strokes/manifest.json matches all shards on disk', () => {
  const manifestPath = join(process.cwd(), 'public', 'data', 'strokes', 'manifest.json');
  assert.ok(existsSync(manifestPath), 'manifest.json must exist');

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    schemaVersion: number;
    shardCount: number;
    totalCount: number;
    shards: Array<{ shard: number; count: number; path: string; sha256: string; bytes: number }>;
  };

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.shardCount, 32);
  assert.equal(manifest.shards.length, 32);

  let counted = 0;
  for (const s of manifest.shards) {
    const shardFile = join(process.cwd(), 'public', s.path.replace(/^\//, ''));
    assert.ok(existsSync(shardFile), `Shard file ${s.path} must exist`);
    const content = readFileSync(shardFile, 'utf8');
    const hash = createHash('sha256').update(content, 'utf8').digest('hex');
    assert.equal(hash, s.sha256, `SHA-256 mismatch for ${s.path}`);
    assert.equal(Buffer.byteLength(content, 'utf8'), s.bytes, `Byte length mismatch for ${s.path}`);
    counted += s.count;
  }

  assert.equal(counted, manifest.totalCount, 'Sum of shard counts must equal totalCount');
});
