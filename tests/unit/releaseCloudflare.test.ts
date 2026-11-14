import assert from 'node:assert/strict';
import test from 'node:test';

import { previousVersion, versionOf, type Deployment } from '../../scripts/release/cloudflare.ts';

const deployment = (version: string, created_on: string): Deployment => ({ id: `d-${created_on}`, created_on, versions: [{ version_id: version, percentage: 100 }] });

test('rollback targets the version that was live before the current one', () => {
  const deployments = [
    deployment('v1', '2026-11-01T00:00:00Z'),
    deployment('v2', '2026-11-02T00:00:00Z'),
    deployment('v3', '2026-11-03T00:00:00Z'),
  ];
  assert.equal(versionOf(deployments.at(-1)), 'v3');
  assert.equal(previousVersion(deployments), 'v2');
  // After a rollback the live version is v2 again: undoing that goes back to v3, never to v2 itself.
  assert.equal(previousVersion([...deployments, deployment('v2', '2026-11-04T00:00:00Z')]), 'v3');
  // A redeploy of the same version is not a rollback target.
  assert.equal(previousVersion([deployment('v1', '2026-11-01T00:00:00Z'), deployment('v1', '2026-11-02T00:00:00Z')]), undefined);
  assert.equal(previousVersion([deployment('only', '2026-11-01T00:00:00Z')]), undefined);
  assert.equal(previousVersion([]), undefined);
});
