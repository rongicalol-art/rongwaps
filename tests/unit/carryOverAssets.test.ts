import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { assetsToCarry, carryOver, type AssetManifest } from '../../scripts/build/carryOverAssets.ts';

const NOW = new Date('2026-11-10T00:00:00Z');

test('carries recent, safely named assets the new build lacks', () => {
  const previous: AssetManifest = {
    commit: 'a',
    builtAt: '2026-11-09T00:00:00Z',
    assets: {
      'index-old.js': '2026-11-09T00:00:00Z',
      'quiz-old.js': '2026-11-04T00:00:00Z',
      'stale-old.js': '2026-11-01T00:00:00Z',
      'shared.css': '2026-11-09T00:00:00Z',
      '../escape.js': '2026-11-09T00:00:00Z',
    },
  };
  assert.deepEqual(Object.keys(assetsToCarry(previous, new Set(['shared.css', 'index-new.js']), NOW)).sort(), ['index-old.js', 'quiz-old.js']);
});

test('copies previous assets into the build and records when each was last live', async (t) => {
  const dist = mkdtempSync(path.join(tmpdir(), 'carry-'));
  t.after(() => rmSync(dist, { recursive: true, force: true }));
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'assets', 'index-new.js'), 'new');
  const live: AssetManifest = { commit: 'old', builtAt: '2026-11-08T00:00:00Z', assets: { 'index-old.js': '2026-11-08T00:00:00Z', 'gone.js': '2026-11-08T00:00:00Z' } };
  const server = createServer((req, res) => {
    if (req.url === '/asset-manifest.json') return void res.end(JSON.stringify(live));
    if (req.url === '/assets/index-old.js') return void res.end('old');
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const result = await carryOver(dist, origin, NOW);
  assert.equal(result.carried, 1);
  assert.equal(readFileSync(path.join(dist, 'assets', 'index-old.js'), 'utf8'), 'old');
  assert.equal(existsSync(path.join(dist, 'assets', 'gone.js')), false);
  const manifest = JSON.parse(readFileSync(path.join(dist, 'asset-manifest.json'), 'utf8')) as AssetManifest;
  assert.equal(manifest.assets['index-old.js'], '2026-11-08T00:00:00Z');
  assert.equal(manifest.assets['index-new.js'], NOW.toISOString());
});

test('an unreachable live site never fails the build', async (t) => {
  const dist = mkdtempSync(path.join(tmpdir(), 'carry-'));
  t.after(() => rmSync(dist, { recursive: true, force: true }));
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'assets', 'index-new.js'), 'new');
  const result = await carryOver(dist, 'http://127.0.0.1:9', NOW);
  assert.equal(result.carried, 0);
  assert.ok(existsSync(path.join(dist, 'asset-manifest.json')));
});
