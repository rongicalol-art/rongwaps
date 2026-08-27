import type { DBCharacterBreakdown } from '../../types/database';
import {
  createRuntimePackLoader,
  type RuntimeDirectChildrenResult,
  type RuntimeDirectIndexResult,
  type RuntimeExpansionResult,
  type RuntimePackLoader,
  type RuntimeRecordLookup,
  type RuntimeVisibleChild,
} from './runtimeLoader';
import {
  allowsDevelopmentCandidatePack,
  getDecompositionRuntimeMode,
  getRuntimePackBasePath,
  type DecompositionRuntimeEnvironment,
  type DecompositionRuntimeMode,
} from './runtimeMode';
import { getCharacterBreakdown, getCharactersUsingComponent } from '../../services/breakdownService';
import { projectLegacyDecomposition } from './legacyProjection';

export type DecompositionServiceStatus = 'found' | 'missing' | 'error' | 'leaf';

export interface DecompositionSourceInfo {
  id: string;
  version?: string;
  recordId?: string;
  selectionReason?: string;
}

export interface DecompositionServiceRecord {
  runtime: DecompositionRuntimeMode;
  status: DecompositionServiceStatus;
  character: string;
  directChildren: string[];
  legacy?: DBCharacterBreakdown;
  v3?: RuntimeRecordLookup;
  source?: DecompositionSourceInfo;
  error?: Error;
}

export interface DecompositionServiceOptions {
  environment?: DecompositionRuntimeEnvironment;
  mode?: DecompositionRuntimeMode;
  v3Loader?: RuntimePackLoader;
  legacyLookup?: (character: string) => Promise<DBCharacterBreakdown | null>;
  legacyParents?: (component: string) => Promise<string[]>;
}

export interface DecompositionService {
  readonly runtime: DecompositionRuntimeMode;
  getRecord(character: string): Promise<DecompositionServiceRecord>;
  getDirectVisibleChildren(character: string): Promise<RuntimeDirectChildrenResult>;
  getDirectComponentKeys(character: string): Promise<RuntimeDirectIndexResult>;
  getParents(componentKey: string): Promise<{ status: 'found' | 'missing' | 'error'; parents: string[]; error?: Error }>;
  expand(character: string, options?: { maxDepth?: number; ancestry?: string[] }): Promise<RuntimeExpansionResult>;
  prefetch(characters: string[]): Promise<void>;
}

class V3DecompositionService implements DecompositionService {
  readonly runtime = 'v3' as const;

  constructor(private readonly loader: RuntimePackLoader) {}

  async getRecord(character: string): Promise<DecompositionServiceRecord> {
    const lookup = await this.loader.getRecord(character);
    if (lookup.status === 'error' || lookup.status === 'missing' || lookup.status === 'leaf') {
      return {
        runtime: this.runtime,
        status: lookup.status,
        character,
        directChildren: [],
        v3: lookup,
        error: lookup.error,
      };
    }
    const direct = await this.loader.getDirectComponentKeys(character);
    if (direct.status !== 'found') {
      return {
        runtime: this.runtime,
        status: 'error',
        character,
        directChildren: [],
        v3: lookup,
        error: direct.error ?? new Error(`Missing direct index for ${character}.`),
      };
    }
    const manifest = await this.loader.getManifest();
    const source = lookup.record ? manifest.sources[lookup.record.s] : undefined;
    return {
      runtime: this.runtime,
      status: 'found',
      character,
      directChildren: direct.componentKeys,
      v3: lookup,
      source: source ? { id: source.id, version: source.version, recordId: lookup.record?.r } : undefined,
    };
  }

  getDirectVisibleChildren(character: string): Promise<RuntimeDirectChildrenResult> {
    return this.loader.getDirectVisibleChildren(character);
  }

  getDirectComponentKeys(character: string): Promise<RuntimeDirectIndexResult> {
    return this.loader.getDirectComponentKeys(character);
  }

  getParents(componentKey: string) {
    return this.loader.getParents(componentKey);
  }

  expand(character: string, options?: { maxDepth?: number; ancestry?: string[] }) {
    return this.loader.expand(character, options);
  }

  prefetch(characters: string[]): Promise<void> {
    return this.loader.prefetch(characters);
  }
}

class LegacyDecompositionService implements DecompositionService {
  readonly runtime = 'legacy' as const;
  private readonly lookup: (character: string) => Promise<DBCharacterBreakdown | null>;
  private readonly parents: (component: string) => Promise<string[]>;

  constructor(options: DecompositionServiceOptions = {}) {
    this.lookup = options.legacyLookup ?? getCharacterBreakdown;
    this.parents = options.legacyParents ?? getCharactersUsingComponent;
  }

  async getRecord(character: string): Promise<DecompositionServiceRecord> {
    try {
      const legacy = await this.lookup(character);
      if (!legacy) return { runtime: this.runtime, status: 'missing', character, directChildren: [] };
      const directChildren = projectLegacyDecomposition(legacy.decomposition).components
        .filter((component) => component !== character);
      return {
        runtime: this.runtime,
        status: directChildren.length > 0 ? 'found' : 'leaf',
        character,
        directChildren: directChildren.map((component) => `g:${component}`),
        legacy,
        source: { id: 'makemeahanzi-legacy-runtime' },
      };
    } catch (error) {
      return {
        runtime: this.runtime,
        status: 'error',
        character,
        directChildren: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getDirectVisibleChildren(character: string): Promise<RuntimeDirectChildrenResult> {
    const record = await this.getRecord(character);
    if (record.status === 'error' || record.status === 'missing') {
      return { status: record.status, character, children: [], error: record.error };
    }
    if (record.status === 'leaf' || !record.legacy) return { status: 'leaf', character, children: [] };
    return {
      status: 'found',
      character,
      children: record.directChildren.map((key): RuntimeVisibleChild => ({
        kind: 'glyph',
        key,
        glyph: key.slice(2),
        expansion: 'unknown',
      })),
    };
  }

  async getDirectComponentKeys(character: string): Promise<RuntimeDirectIndexResult> {
    const record = await this.getRecord(character);
    if (record.status === 'error') return { status: 'error', character, componentKeys: [], error: record.error };
    if (record.status === 'missing') return { status: 'missing', character, componentKeys: [] };
    return { status: 'found', character, componentKeys: record.directChildren };
  }

  async getParents(componentKey: string) {
    if (!componentKey.startsWith('g:')) return { status: 'missing' as const, parents: [] };
    try {
      const parents = await this.parents(componentKey.slice(2));
      return parents.length > 0
        ? { status: 'found' as const, parents }
        : { status: 'missing' as const, parents: [] };
    } catch (error) {
      return { status: 'error' as const, parents: [], error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async expand(character: string): Promise<RuntimeExpansionResult> {
    const record = await this.getRecord(character);
    if (record.status === 'error' || record.status === 'missing' || record.status === 'leaf') {
      return { status: record.status, character, error: record.error };
    }
    return { status: 'found', character };
  }

  async prefetch(characters: string[]): Promise<void> {
    await Promise.all([...new Set(characters.filter(Boolean))].map((character) => this.getRecord(character)));
  }
}

export function createDecompositionRuntimeService(options: DecompositionServiceOptions = {}): DecompositionService {
  const mode = options.mode ?? getDecompositionRuntimeMode(options.environment);
  // A blocked candidate cannot become the active application service merely
  // because VITE_DECOMPOSITION_RUNTIME=v3 was set; it needs the second,
  // explicit development-candidate opt-in. Tests may inject a loader.
  if (
    mode !== 'v3'
    || options.environment?.PROD === true
    || (!options.v3Loader && !allowsDevelopmentCandidatePack(options.environment))
  ) {
    return new LegacyDecompositionService(options);
  }
  const loader = options.v3Loader ?? createRuntimePackLoader({
    basePath: getRuntimePackBasePath(options.environment),
    allowDevelopmentCandidate: allowsDevelopmentCandidatePack(options.environment),
    environment: options.environment?.PROD ? 'production' : 'development',
  });
  return new V3DecompositionService(loader);
}

let defaultService: DecompositionService | null = null;

/** Feature-flagged application entry point; legacy is the production default. */
export function getDecompositionRuntimeService(): DecompositionService {
  if (!defaultService) defaultService = createDecompositionRuntimeService();
  return defaultService;
}

export function resetDecompositionRuntimeServiceForTests(): void {
  defaultService = null;
}

export interface DecompositionRuntimeComparison {
  character: string;
  legacyDirectComponents: string[];
  v3DirectComponents: string[];
  legacySource?: DecompositionSourceInfo;
  v3Source?: DecompositionSourceInfo;
  different: boolean;
  legacyStatus: DecompositionServiceStatus;
  v3Status: DecompositionServiceStatus;
}

/** Development/test diagnostic only. Source disagreements are reported, not reconciled. */
export async function compareDecompositionRuntimes(
  character: string,
  options: DecompositionServiceOptions & { v3Loader: RuntimePackLoader },
): Promise<DecompositionRuntimeComparison> {
  const legacy = new LegacyDecompositionService(options);
  const v3 = new V3DecompositionService(options.v3Loader);
  const [legacyResult, v3Result] = await Promise.all([
    legacy.getRecord(character),
    v3.getRecord(character),
  ]);
  return {
    character,
    legacyDirectComponents: legacyResult.directChildren,
    v3DirectComponents: v3Result.directChildren,
    legacySource: legacyResult.source,
    v3Source: v3Result.source,
    different: JSON.stringify(legacyResult.directChildren) !== JSON.stringify(v3Result.directChildren),
    legacyStatus: legacyResult.status,
    v3Status: v3Result.status,
  };
}
