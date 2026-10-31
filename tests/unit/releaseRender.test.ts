import assert from 'node:assert/strict';
import test from 'node:test';

import { previousGood, type Deploy } from '../../scripts/release/render.ts';

const deploy = (id: string, status: string, createdAt: string, finished = true): Deploy => ({
  id, status, createdAt, finishedAt: finished ? createdAt : undefined, commit: { id: id.repeat(5) },
});

test('rollback target is the last deploy that was live before the current one', () => {
  const deploys = [
    deploy('d5', 'build_failed', '2026-11-05T00:00:00Z'),
    deploy('d4', 'live', '2026-11-04T00:00:00Z'),
    deploy('d3', 'canceled', '2026-11-03T00:00:00Z'),
    deploy('d2', 'deactivated', '2026-11-02T00:00:00Z'),
    deploy('d1', 'deactivated', '2026-11-01T00:00:00Z'),
  ];
  assert.equal(previousGood(deploys)?.id, 'd2');
  assert.equal(previousGood([...deploys].reverse())?.id, 'd2');
  assert.equal(previousGood([deploy('only', 'live', '2026-11-01T00:00:00Z')]), undefined);
});
