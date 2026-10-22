/**
 * Writes Brotli + gzip sidecars next to every `dist/data` JSON so the server sends
 * ready-made small files instead of compressing on each request (Brotli is ~30% smaller
 * than gzip). Run last in the build; the server ignores a sidecar older than its JSON.
 * Usage: tsx scripts/build/precompressData.ts [distDataDir]
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);
const DATA = path.resolve(process.argv[2] ?? 'dist/data');
const MIN_BYTES = 1024;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.json')) yield full;
  }
}

const files: string[] = [];
for await (const file of walk(DATA)) files.push(file);

let before = 0;
let after = 0;
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < files.length) {
    const file = files[next++];
    const source = await readFile(file);
    before += source.length;
    if (source.length < MIN_BYTES) { after += source.length; continue; }
    const sidecar = `${file}.br`;
    const [sourceInfo, sidecarInfo] = await Promise.all([stat(file), stat(sidecar).catch(() => null)]);
    if (sidecarInfo && sidecarInfo.mtimeMs >= sourceInfo.mtimeMs) { after += sidecarInfo.size; continue; }
    const [br, gzipped] = await Promise.all([
      brotli(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
      gz(source, { level: 9 }),
    ]);
    await Promise.all([writeFile(sidecar, br), writeFile(`${file}.gz`, gzipped)]);
    after += br.length;
  }
}));
console.log(`Precompressed ${files.length} data files: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB Brotli`);
