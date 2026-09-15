import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const RUNTIME_INDEX_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate/indexes/direct');

/** Maps every character/component to its direct component glyphs (from the v3 runtime pack). */
export function loadRuntimeDirectIndex(): Map<string, string[]> {
  const direct = new Map<string, string[]>();
  for (let shard = 0; shard < 64; shard += 1) {
    const name = `shard-${String(shard).padStart(2, '0')}.json`;
    const artifact = JSON.parse(readFileSync(resolve(RUNTIME_INDEX_DIR, name), 'utf8')) as {
      direct: Record<string, string[]>;
    };
    for (const [glyph, keys] of Object.entries(artifact.direct)) {
      direct.set(glyph, keys.filter((key) => key.startsWith('g:')).map((key) => key.slice(2)));
    }
  }
  return direct;
}

export interface RuntimeDirectComponent {
  kind: 'glyph' | 'unencoded' | 'unknown';
  key: string;
  glyph: string | null;
}

/** Like `loadRuntimeDirectIndex`, but preserves unencoded and unknown direct components. */
export function loadRuntimeDirectComponents(): Map<string, RuntimeDirectComponent[]> {
  const direct = new Map<string, RuntimeDirectComponent[]>();
  for (let shard = 0; shard < 64; shard += 1) {
    const name = `shard-${String(shard).padStart(2, '0')}.json`;
    const artifact = JSON.parse(readFileSync(resolve(RUNTIME_INDEX_DIR, name), 'utf8')) as {
      direct: Record<string, string[]>;
    };
    for (const [glyph, keys] of Object.entries(artifact.direct)) {
      direct.set(glyph, keys.map((key) => {
        if (key.startsWith('g:')) return { kind: 'glyph' as const, key, glyph: key.slice(2) };
        if (key.startsWith('u:')) return { kind: 'unencoded' as const, key, glyph: null };
        return { kind: 'unknown' as const, key, glyph: null };
      }));
    }
  }
  return direct;
}
