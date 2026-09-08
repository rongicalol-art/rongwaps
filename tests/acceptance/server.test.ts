import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { isStrictAcceptance, PROJECT_ROOT } from '../acceptance_helpers';

test('Server Acceptance: server.ts does not exist at the project root', (t) => {
  const rootServer = path.join(PROJECT_ROOT, 'server.ts');
  const exists = fs.existsSync(rootServer);

  if (!isStrictAcceptance() && exists) {
    t.skip('Server restructuring pending: server.ts still exists at project root');
    return;
  }

  assert.equal(
    exists,
    false,
    'server.ts must not exist at project root',
  );
});

test('Server Acceptance: server/ directory exists and contains Express backend entry point', (t) => {
  const serverDir = path.join(PROJECT_ROOT, 'server');
  const exists = fs.existsSync(serverDir);

  if (!isStrictAcceptance() && !exists) {
    t.skip('Server restructuring pending: server/ directory does not exist yet');
    return;
  }

  assert.ok(exists, 'server/ directory must exist');
  const files = fs.readdirSync(serverDir);
  assert.ok(
    files.includes('index.ts') || files.includes('server.ts'),
    `server/ directory must contain backend entry point, found: ${files.join(', ')}`,
  );
});

test('Server Acceptance: package.json dev and build scripts target server directory', (t) => {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const devScript = pkg.scripts?.dev || '';
  const buildScript = pkg.scripts?.build || '';

  const referencesRootServer =
    devScript.includes('tsx server.ts') ||
    buildScript.includes('esbuild server.ts');

  if (!isStrictAcceptance() && referencesRootServer) {
    t.skip(`package.json scripts update pending: dev="${devScript}", build="${buildScript}"`);
    return;
  }

  assert.equal(
    referencesRootServer,
    false,
    'package.json scripts must target server/ rather than root server.ts',
  );
});
