/**
 * Readable stack traces in Sentry without publishing source code.
 *
 * When SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set (Render
 * production only), vite emits hidden source maps; this step stamps each code
 * file and its map with a debug id, uploads the maps for this release, then
 * deletes every .map file from dist so none is ever served. Anywhere else it
 * only makes sure no map is left behind. An upload failure never fails the
 * build: a release must not wait on Sentry.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');

function removeMaps(dir: string): number {
  let removed = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) removed += removeMaps(full);
    else if (entry.endsWith('.map')) {
      rmSync(full);
      removed += 1;
    }
  }
  return removed;
}

const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;
const release = process.env.RENDER_GIT_COMMIT;
if (SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT && release) {
  const cli = path.resolve('node_modules/.bin/sentry-cli');
  const assets = path.join(dist, 'assets');
  try {
    execFileSync(cli, ['sourcemaps', 'inject', assets], { stdio: ['ignore', 'ignore', 'inherit'] });
    execFileSync(cli, ['sourcemaps', 'upload', `--release=${release}`, assets], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`source maps: uploaded for release ${release.slice(0, 8)}`);
  } catch (error) {
    console.warn(`source maps: upload skipped (${error instanceof Error ? error.message.split('\n')[0] : String(error)})`);
  }
}
console.log(`source maps: ${removeMaps(dist)} map file(s) removed from dist`);
