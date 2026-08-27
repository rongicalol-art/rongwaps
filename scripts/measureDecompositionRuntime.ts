import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  RuntimePackLoader,
  type RuntimePackTransport,
} from '../src/features/character-decomposition/runtimeLoader';
import { createDecompositionRuntimeService } from '../src/features/character-decomposition/decompositionService';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const PACK_ROOT = resolve(
  process.env.DECOMPOSITION_RUNTIME_PACK_DIR ?? `${PROJECT_ROOT}/output/decomposition-runtime/phase4-candidate`,
);
const REPORT_PATH = resolve(
  process.env.DECOMPOSITION_RUNTIME_MEASURE_REPORT ?? `${PROJECT_ROOT}/output/decomposition-runtime/phase5-runtime-report.json`,
);
const MEASURE_CHARACTER = process.env.DECOMPOSITION_RUNTIME_MEASURE_CHARACTER ?? '學';

function createFileTransport(): RuntimePackTransport {
  return {
    async fetchJson<T>(requestPath: string) {
      const relative = requestPath.replace(/^\/[^/]+\//u, '').replace(/^\/+/, '');
      const target = resolve(PACK_ROOT, relative);
      if (target !== PACK_ROOT && !target.startsWith(`${PACK_ROOT}/`)) throw new Error('Refusing a pack path outside the candidate directory.');
      return {
        data: JSON.parse(await readFile(target, 'utf8')) as T,
        source: 'network' as const,
      };
    },
    async prune() {},
  };
}

async function main() {
  const loader = new RuntimePackLoader({
    basePath: '/__decomposition-runtime',
    environment: 'test',
    allowDevelopmentCandidate: true,
    transport: createFileTransport(),
  });
  const service = createDecompositionRuntimeService({ mode: 'v3', v3Loader: loader });

  const before = loader.getMetrics();
  const root = await service.getRecord(MEASURE_CHARACTER);
  const afterRoot = loader.getMetrics();
  const expanded = await service.expand('𦥯');
  const afterExpansion = loader.getMetrics();
  const visible = await service.getDirectVisibleChildren(MEASURE_CHARACTER);
  const afterVisible = loader.getMetrics();
  const warm = await service.getRecord('學');
  const afterWarm = loader.getMetrics();
  const report = {
    candidatePack: PACK_ROOT,
    rootLookup: { status: root.status, character: root.character, requestedCharacter: MEASURE_CHARACTER },
    rootLookupMetrics: {
      files: afterRoot.files.length - before.files.length,
      bytes: afterRoot.bytesFetched - before.bytesFetched,
      paths: afterRoot.files.slice(before.files.length),
    },
    expansion: {
      status: expanded.status,
      character: '𦥯',
      files: afterExpansion.files.length - afterRoot.files.length,
      bytes: afterExpansion.bytesFetched - afterRoot.bytesFetched,
      paths: afterExpansion.files.slice(afterRoot.files.length),
    },
    visibleChildren: visible.children.map((child) => ({ key: child.key, expansion: child.expansion })),
    visibleChildrenMetrics: {
      additionalFiles: afterVisible.files.length - afterExpansion.files.length,
      additionalBytes: afterVisible.bytesFetched - afterExpansion.bytesFetched,
    },
    warmCache: {
      status: warm.status,
      additionalFiles: afterWarm.files.length - afterVisible.files.length,
      additionalBytes: afterWarm.bytesFetched - afterVisible.bytesFetched,
      inMemoryHits: afterWarm.inMemoryHits,
    },
    totalMetrics: afterWarm,
  };
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
