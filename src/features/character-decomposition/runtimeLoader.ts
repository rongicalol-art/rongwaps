import type { RuntimeComponentKey, RuntimeTreeNode } from './runtimePack';
import { getRuntimeDirectComponentKeys, runtimeNodeChildren } from './runtimePack';
import {
  joinPath,
  getShard,
  getComponentShard,
  isAtomicRecord,
  validateManifest,
  assertShard,
  extractVisibleNodes,
  toVisibleChildSync,
  defaultTransport,
  RuntimePackSafetyError,
  DEFAULT_RUNTIME_PACK_BASE_PATH,
  RUNTIME_PACK_SCHEMA_VERSION,
  DEFAULT_RUNTIME_MAX_DEPTH,
  type RuntimePackShardDescriptor,
  type RuntimePackManifest,
  type RuntimePackRecord,
  type RuntimeVisibleChild,
  type RuntimeRecordLookup,
  type RuntimeDirectChildrenResult,
  type RuntimeDirectIndexResult,
  type RuntimeParentsResult,
  type RuntimeExpandedNode,
  type RuntimeExpansionResult,
  type RuntimeLoaderMetrics,
  type RuntimePackTransport,
  type RuntimePackLoaderOptions,
} from './runtimeDerivations';

export * from './runtimeDerivations';

export class RuntimePackLoader {
  private readonly basePath: string;
  private readonly expectedSchemaVersion: number;
  private readonly allowDevelopmentCandidate: boolean;
  private readonly environment: RuntimePackLoaderOptions['environment'];
  private readonly maxDepth: number;
  private readonly transport: RuntimePackTransport;
  private manifestPromise: Promise<RuntimePackManifest> | null = null;
  private readonly recordShards = new Map<number, Record<string, RuntimePackRecord>>();
  private readonly directShards = new Map<number, Record<string, RuntimeComponentKey[]>>();
  private readonly reverseShards = new Map<number, Record<RuntimeComponentKey, string[]>>();
  private readonly pendingShards = new Map<string, Promise<void>>();
  private readonly metrics: RuntimeLoaderMetrics = {
    manifestLoads: 0,
    shardLoads: 0,
    networkFiles: 0,
    persistentCacheFiles: 0,
    inMemoryHits: 0,
    bytesFetched: 0,
    files: [],
  };

  constructor(options: RuntimePackLoaderOptions = {}) {
    this.basePath = options.basePath ?? DEFAULT_RUNTIME_PACK_BASE_PATH;
    this.expectedSchemaVersion = options.expectedSchemaVersion ?? RUNTIME_PACK_SCHEMA_VERSION;
    this.allowDevelopmentCandidate = options.allowDevelopmentCandidate ?? false;
    this.environment = options.environment ?? 'production';
    this.maxDepth = options.maxDepth ?? DEFAULT_RUNTIME_MAX_DEPTH;
    this.transport = options.transport ?? defaultTransport();
  }

  async getManifest(): Promise<RuntimePackManifest> {
    if (this.manifestPromise) return this.manifestPromise;
    this.manifestPromise = (async () => {
      this.metrics.manifestLoads += 1;
      const result = await this.transport.fetchJson<RuntimePackManifest>(
        joinPath(this.basePath, 'manifest.json'),
        'decomposition runtime manifest',
        '',
      );
      this.metrics.files.push('manifest.json');
      if (result.source === 'network') this.metrics.networkFiles += 1;
      else this.metrics.persistentCacheFiles += 1;
      validateManifest(result.data, this.expectedSchemaVersion);
      const candidate = !result.data.publishable
        || result.data.licenseGate?.publishable === false
        || result.data.distribution === 'development-only-candidate';
      if (candidate && (!this.allowDevelopmentCandidate || this.environment === 'production')) {
        throw new RuntimePackSafetyError(
          'Refusing non-publishable/development-only decomposition runtime pack outside explicit development/test mode.',
        );
      }
      await this.transport.prune(
        'decomposition-runtime',
        `${result.data.schemaVersion}:${result.data.version}`,
      );
      return result.data;
    })().catch((error) => {
      this.manifestPromise = null;
      throw error;
    });
    return this.manifestPromise;
  }

  async getRecord(character: string): Promise<RuntimeRecordLookup> {
    if (!character) return { status: 'missing', character };
    try {
      const manifest = await this.getManifest();
      const shard = getShard(character, manifest.recordShards.length);
      await this.loadShard(this.recordShards, 'record', shard, manifest.recordShards, 'records');
      const record = this.recordShards.get(shard)?.[character];
      if (!record) return { status: 'missing', character };
      return {
        status: isAtomicRecord(character, record) ? 'leaf' : 'found',
        character,
        record,
      };
    } catch (error) {
      return { status: 'error', character, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async getDirectComponentKeys(character: string): Promise<RuntimeDirectIndexResult> {
    try {
      const manifest = await this.getManifest();
      const shard = getShard(character, manifest.indexes.direct.shardCount);
      await this.loadShard(this.directShards, 'direct', shard, manifest.indexes.direct.shards, 'direct');
      const componentKeys = this.directShards.get(shard)?.[character];
      return componentKeys
        ? { status: 'found', character, componentKeys: [...componentKeys] }
        : { status: 'missing', character, componentKeys: [] };
    } catch (error) {
      return {
        status: 'error',
        character,
        componentKeys: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getParents(componentKey: RuntimeComponentKey): Promise<RuntimeParentsResult> {
    try {
      const manifest = await this.getManifest();
      const shard = getComponentShard(componentKey, manifest.indexes.reverse.shardCount);
      await this.loadShard(this.reverseShards, 'reverse', shard, manifest.indexes.reverse.shards, 'reverse');
      const parents = this.reverseShards.get(shard)?.[componentKey];
      return parents
        ? { status: 'found', componentKey, parents: [...parents] }
        : { status: 'missing', componentKey, parents: [] };
    } catch (error) {
      return {
        status: 'error',
        componentKey,
        parents: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getDirectVisibleChildren(character: string): Promise<RuntimeDirectChildrenResult> {
    const lookup = await this.getRecord(character);
    if (lookup.status === 'error' || lookup.status === 'missing') {
      return { status: lookup.status, character, children: [], error: lookup.error };
    }
    if (!lookup.record || lookup.status === 'leaf') return { status: 'leaf', character, children: [] };

    try {
      const visibleNodes = extractVisibleNodes(lookup.record.t);
      const children = await Promise.all(visibleNodes.map(({ node, layoutPath }) => (
        this.toVisibleChild(node, layoutPath)
      )));
      return { status: 'found', character, children };
    } catch (error) {
      return { status: 'error', character, children: [], error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async expand(
    character: string,
    options: { maxDepth?: number; ancestry?: string[] } = {},
  ): Promise<RuntimeExpansionResult> {
    const ancestry = options.ancestry ?? [];
    const maxDepth = options.maxDepth ?? this.maxDepth;
    if (ancestry.includes(character)) return { status: 'cycle', character, path: [...ancestry, character] };
    if (ancestry.length >= maxDepth) return { status: 'max-depth', character, path: [...ancestry, character] };

    const lookup = await this.getRecord(character);
    if (lookup.status === 'error' || lookup.status === 'missing') {
      return { status: lookup.status, character, error: lookup.error };
    }
    if (!lookup.record || lookup.status === 'leaf') return { status: 'leaf', character };

    try {
      const tree = await this.expandNode(lookup.record.t, [...ancestry, character], maxDepth);
      return { status: 'found', character, tree };
    } catch (error) {
      return { status: 'error', character, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async prefetch(characters: string[]): Promise<void> {
    await Promise.all([...new Set(characters.filter(Boolean))].map((character) => this.getRecord(character)));
  }

  getMetrics(): RuntimeLoaderMetrics {
    return { ...this.metrics, files: [...this.metrics.files] };
  }

  clearMemoryCache(): void {
    this.recordShards.clear();
    this.directShards.clear();
    this.reverseShards.clear();
    this.pendingShards.clear();
    this.manifestPromise = null;
  }

  private async toVisibleChild(node: RuntimeTreeNode, layoutPath: string[] = []): Promise<RuntimeVisibleChild> {
    if (node[0] === 'g') {
      const glyph = node[1];
      const lookup = await this.getRecord(glyph);
      return toVisibleChildSync(node, lookup.status, layoutPath);
    }
    return toVisibleChildSync(node, undefined, layoutPath);
  }

  private async expandNode(
    node: RuntimeTreeNode,
    ancestry: string[],
    maxDepth: number,
  ): Promise<RuntimeExpandedNode> {
    const children = runtimeNodeChildren(node);
    if (node[0] !== 'g' || children.length > 0) {
      const expandedChildren = await Promise.all(children.map((child) => this.expandNode(child, ancestry, maxDepth)));
      return { node, children: expandedChildren };
    }
    const glyph = node[1];
    const lookup = await this.getRecord(glyph);
    if (lookup.status === 'missing' || lookup.status === 'error' || lookup.status === 'leaf') {
      return { node, children: [], expansion: lookup.status };
    }
    if (ancestry.includes(glyph)) return { node, children: [], expansion: 'cycle' };
    if (ancestry.length >= maxDepth) return { node, children: [], expansion: 'max-depth' };
    const expanded = await this.expandNode(lookup.record!.t, [...ancestry, glyph], maxDepth);
    return { node, children: [expanded], expansion: 'found' };
  }

  private async loadShard<TRecord extends object>(
    cache: Map<number, TRecord>,
    prefix: string,
    shard: number,
    descriptors: RuntimePackShardDescriptor[],
    field: string,
  ): Promise<void> {
    if (cache.has(shard)) {
      this.metrics.inMemoryHits += 1;
      return;
    }
    const key = `${prefix}:${shard}`;
    const pending = this.pendingShards.get(key);
    if (pending) return pending;
    const descriptor = descriptors.find((item) => item.shard === shard);
    if (!descriptor) throw new Error(`Missing ${prefix} shard descriptor ${shard}.`);
    const request = this.loadJson<{ schemaVersion: number; shard: number; count: number } & Record<string, TRecord>>(descriptor.path, key).then((payload) => {
      assertShard(payload, descriptor, this.expectedSchemaVersion);
      const data = payload[field];
      if (!data || typeof data !== 'object') throw new Error(`Malformed ${prefix} shard.`);
      cache.set(shard, data);
    }).finally(() => this.pendingShards.delete(key));
    this.pendingShards.set(key, request);
    return request;
  }

  private async loadJson<T>(relativePath: string, key: string): Promise<T> {
    const manifest = await this.getManifest();
    const result = await this.transport.fetchJson<T>(
      joinPath(this.basePath, relativePath),
      `decomposition runtime ${key}`,
      `decomposition-runtime:${manifest.schemaVersion}:${manifest.version}:${key}`,
    );
    this.metrics.shardLoads += 1;
    this.metrics.files.push(relativePath);
    if (result.source === 'network') {
      this.metrics.networkFiles += 1;
      const descriptor = [
        ...manifest.recordShards,
        ...manifest.indexes.direct.shards,
        ...manifest.indexes.reverse.shards,
      ].find((item) => item.path === relativePath);
      this.metrics.bytesFetched += descriptor?.bytes ?? 0;
    } else {
      this.metrics.persistentCacheFiles += 1;
    }
    return result.data;
  }
}

export function createRuntimePackLoader(options: RuntimePackLoaderOptions = {}): RuntimePackLoader {
  return new RuntimePackLoader(options);
}

export { getRuntimeDirectComponentKeys };
