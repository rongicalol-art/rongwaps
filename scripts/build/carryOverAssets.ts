/**
 * Keeps the previous week's code files in each new build, so a release never
 * breaks a tab that is already open: when an old page opens a screen it has
 * not loaded yet, its old chunk is still on the server. Without this the
 * chunk 404s and staleBuildRecovery reloads the page mid-lesson.
 *
 * Runs in `npm run build`. A release build reads the live build's
 * /asset-manifest.json (CARRY_OVER_FROM, set by the Deploy workflow) and copies in
 * every asset a build served within the last 7 days. Anywhere else, or if the
 * live site is unreachable, it only writes this build's manifest. It never
 * fails the build. New service workers never precache carried files.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KEEP_DAYS = 7;
const MAX_CARRIED_BYTES = 80 * 1024 * 1024;
const SAFE_NAME = /^[A-Za-z0-9._-]+\.(?:js|css|woff2?|svg|png|webp|json|wasm)$/;

export interface AssetManifest {
  commit: string | null;
  builtAt: string;
  /** asset file name → last time a live build produced it natively (ISO). */
  assets: Record<string, string>;
}

/** Previous assets still worth serving: recent, safely named, not already built. */
export function assetsToCarry(previous: AssetManifest, current: Set<string>, now: Date, keepDays = KEEP_DAYS): Record<string, string> {
  const cutoff = now.getTime() - keepDays * 86_400_000;
  return Object.fromEntries(Object.entries(previous.assets).filter(([name, lastLive]) =>
    !current.has(name) && SAFE_NAME.test(name) && Date.parse(lastLive) >= cutoff));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'rongwaps-build-carry-over' } });
}

export async function carryOver(dist: string, origin: string | undefined, now = new Date()): Promise<{ carried: number; bytes: number }> {
  const assetsDir = path.join(dist, 'assets');
  const own = new Set(readdirSync(assetsDir));
  const manifest: AssetManifest = {
    commit: process.env.APP_COMMIT ?? null,
    builtAt: now.toISOString(),
    assets: Object.fromEntries([...own].map((name) => [name, now.toISOString()])),
  };
  let carried = 0;
  let bytes = 0;
  if (origin) {
    try {
      const response = await fetchWithTimeout(`${origin.replace(/\/+$/, '')}/asset-manifest.json`, 30_000);
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const wanted = assetsToCarry(await response.json() as AssetManifest, own, now);
      const names = Object.keys(wanted);
      for (let index = 0; index < names.length; index += 8) {
        await Promise.all(names.slice(index, index + 8).map(async (name) => {
          if (bytes >= MAX_CARRIED_BYTES) return;
          try {
            const asset = await fetchWithTimeout(`${origin.replace(/\/+$/, '')}/assets/${name}`, 30_000);
            if (!asset.ok) return;
            const body = Buffer.from(await asset.arrayBuffer());
            // Checked and counted with no await in between, so parallel downloads never overshoot.
            if (bytes + body.length > MAX_CARRIED_BYTES) return;
            writeFileSync(path.join(assetsDir, name), body);
            manifest.assets[name] = wanted[name];
            carried += 1;
            bytes += body.length;
          } catch { /* skip this file */ }
        }));
      }
    } catch (error) {
      console.warn(`carry-over: skipped (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  writeFileSync(path.join(dist, 'asset-manifest.json'), `${JSON.stringify(manifest)}\n`);
  return { carried, bytes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = path.resolve('dist');
  if (!existsSync(path.join(dist, 'assets')) || !statSync(path.join(dist, 'assets')).isDirectory()) {
    console.warn('carry-over: no dist/assets, nothing to do');
    process.exit(0);
  }
  const origin = process.env.CARRY_OVER_FROM;
  const { carried, bytes } = await carryOver(dist, origin);
  const own = Object.keys(JSON.parse(readFileSync(path.join(dist, 'asset-manifest.json'), 'utf8')).assets).length - carried;
  console.log(`carry-over: ${own} own assets, ${carried} carried from ${origin ?? 'nowhere'} (${(bytes / 1048576).toFixed(1)} MB)`);
}
