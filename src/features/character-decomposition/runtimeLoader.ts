import {
  fetchStaticJsonWithMetadata,
  pruneStaticJsonCache,
  type StaticJsonFetchMetadata,
} from '../../services/staticContentService';
import type { RuntimeComponentKey, RuntimeTreeNode } from './runtimePack';
import { getRuntimeDirectComponentKeys, runtimeNodeChildren } from './runtimePack';

export const RUNTIME_PACK_SCHEMA_VERSION = 1;
export const DEFAULT_RUNTIME_PACK_BASE_PATH = '/__decomposition-runtime';
// One character expansion resolves that record and its immediate layer. A
// caller must opt into deeper recursion so a single card never hydrates the
// whole reachable graph.
export const DEFAULT_RUNTIME_MAX_DEPTH = 1;

export interface RuntimePackShardDescriptor {
  shard: number;
  count: number;
  path: string;
  bytes: number;
  sha256: string;
  gzipBytes: number;
  brotliBytes: number;
}

export interface RuntimePackManifest {
  schemaVersion: number;
  generatorVersion: string;
  version: string;
  releaseId: string;
  releaseKey: string;
  locale: string;
  policyVersion: string;
  distribution: string;
  publishable: boolean;
  licenseGate: {
    status: string;
    publishable: boolean;
    openBlockers: string[];
    note: string;
  };
  sourceProjectionCount: number;
  selection: {
    mode: string;
    seedCharacterCount: number;
  };
  recordCount: number;
  sources: Array<{
    id: string;
    version: string;
    checksum: string;
    redistributionStatus: string;
    license: string | null;
    attribution: string | null;
  }>;
  courseCoverage: {
    traditional: { total: number; found: number; missing: string[] };
    simplified: { total: number; found: number; missing: string[] };
  };
  recordShards: RuntimePackShardDescriptor[];
  indexes: {
    direct: { strategy: string; shardCount: number; shards: RuntimePackShardDescriptor[] };
    reverse: { strategy: string; shardCount: number; shards: RuntimePackShardDescriptor[] };
  };
}

export interface RuntimePackRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

interface RuntimeRecordShard {
  schemaVersion: number;
  shard: number;
  count: number;
  records: Record<string, RuntimePackRecord>;
}

interface RuntimeDirectIndexShard {
  schemaVersion: number;
  shard: number;
  count: number;
  direct: Record<string, RuntimeComponentKey[]>;
}

interface RuntimeReverseIndexShard {
  schemaVersion: number;
  shard: number;
  count: number;
  reverse: Record<RuntimeComponentKey, string[]>;
}

export type RuntimeLookupStatus = 'found' | 'missing' | 'error' | 'leaf';

export interface RuntimeRecordLookup {
  status: RuntimeLookupStatus;
  character: string;
  record?: RuntimePackRecord;
  error?: Error;
}

export type RuntimeChildExpansion = 'expandable' | 'leaf' | 'missing' | 'error' | 'unknown';

export interface RuntimeVisibleChild {
  kind: 'glyph' | 'unencoded-component' | 'unknown-component' | 'source-entity';
  key: RuntimeComponentKey;
  glyph?: string;
  componentSourceId?: string;
  entity?: string;
  label?: 'No glyph' | 'Unknown component' | 'Unresolved source component';
  /** Layout-only IDS context for spatial presentation. Operators remain invisible. */
  layoutPath?: string[];
  /** Present only when the source encoded an unencoded component's stroke count. */
  strokeCount?: number;
  expansion: RuntimeChildExpansion;
}

export interface RuntimeDirectChildrenResult {
  status: RuntimeLookupStatus;
  character: string;
  children: RuntimeVisibleChild[];
  error?: Error;
}

export interface RuntimeDirectIndexResult {
  status: 'found' | 'missing' | 'error';
  character: string;
  componentKeys: RuntimeComponentKey[];
  error?: Error;
}

export interface RuntimeParentsResult {
  status: 'found' | 'missing' | 'error';
  componentKey: RuntimeComponentKey;
  parents: string[];
  error?: Error;
}

export interface RuntimeExpandedNode {
  node: RuntimeTreeNode;
  children: RuntimeExpandedNode[];
  expansion?: RuntimeLookupStatus | 'cycle' | 'max-depth';
}

export interface RuntimeExpansionResult {
  status: 'found' | 'missing' | 'error' | 'leaf' | 'cycle' | 'max-depth';
  character: string;
  tree?: RuntimeExpandedNode;
  error?: Error;
  path?: string[];
}

export interface RuntimeLoaderMetrics {
  manifestLoads: number;
  shardLoads: number;
  networkFiles: number;
  persistentCacheFiles: number;
  inMemoryHits: number;
  bytesFetched: number;
  files: string[];
}

export interface RuntimePackTransport {
  fetchJson<T>(path: string, label: string, persistentKey: string): Promise<StaticJsonFetchMetadata<T>>;
  prune(namespace: string, activeVersion: string): Promise<void>;
}

export interface RuntimePackLoaderOptions {
  basePath?: string;
  expectedSchemaVersion?: number;
  allowDevelopmentCandidate?: boolean;
  environment?: 'production' | 'development' | 'test';
  maxDepth?: number;
  transport?: RuntimePackTransport;
}

export class RuntimePackSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimePackSafetyError';
  }
}

function defaultTransport(): RuntimePackTransport {
  return {
    fetchJson: <T>(path: string, label: string, persistentKey: string) => (
      fetchStaticJsonWithMetadata<T>(path, label, { persistentKey })
    ),
    prune: pruneStaticJsonCache,
  };
}

function joinPath(basePath: string, relativePath: string): string {
  return `${basePath.replace(/\/+$/u, '')}/${relativePath.replace(/^\/+/, '')}`;
}

function getShard(value: string, shardCount: number): number {
  return (value.codePointAt(0) ?? 0) % shardCount;
}

function getComponentShard(value: RuntimeComponentKey, shardCount: number): number {
  return getShard(value.replace(/^[^:]+:/u, ''), shardCount);
}

function isAtomicRecord(character: string, record: RuntimePackRecord): boolean {
  return record.t[0] === 'g'
    && record.t[1] === character
    && runtimeNodeChildren(record.t).length === 0;
}

function validateManifest(manifest: RuntimePackManifest, expectedSchemaVersion: number): void {
  if (manifest.schemaVersion !== expectedSchemaVersion) {
    throw new RuntimePackSafetyError(
      `Unsupported decomposition runtime schema ${manifest.schemaVersion}; expected ${expectedSchemaVersion}.`,
    );
  }
  if (
    !manifest.version
    || !manifest.generatorVersion
    || !manifest.locale
    || !Array.isArray(manifest.recordShards)
    || manifest.recordShards.length === 0
    || !manifest.indexes?.direct?.shards?.length
    || !manifest.indexes?.reverse?.shards?.length
  ) {
    throw new RuntimePackSafetyError('Malformed decomposition runtime manifest.');
  }
}

function assertShard<T extends { schemaVersion: number; shard: number; count: number }>(
  shard: T,
  descriptor: RuntimePackShardDescriptor,
  expectedSchemaVersion: number,
): void {
  if (
    shard.schemaVersion !== expectedSchemaVersion
    || shard.shard !== descriptor.shard
    || shard.count !== descriptor.count
  ) throw new Error(`Decomposition runtime shard ${descriptor.shard} failed schema validation.`);
}

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
        // The manifest is deliberately revalidated on each loader lifetime;
        // its schema/version is what determines the persistent shard namespace.
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
      await this.loadRecordShard(shard, manifest);
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
      await this.loadDirectShard(shard, manifest);
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
      await this.loadReverseShard(shard, manifest);
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
      const visibleNodes = this.visibleNodes(lookup.record.t);
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

  private visibleNodes(
    root: RuntimeTreeNode,
    layoutPath: string[] = [],
    isRoot = true,
    branchIndex?: number,
  ): Array<{ node: RuntimeTreeNode; layoutPath: string[] }> {
    if (root[0] === 's') {
      const token = layoutPath.length === 0
        ? root[1]
        : `${root[1]}@${branchIndex ?? 0}`;
      const nextPath = [...layoutPath, token];
      return root[2].flatMap((child, index) => this.visibleNodes(child, nextPath, false, index));
    }
    if (!isRoot) return [{ node: root, layoutPath }];
    return runtimeNodeChildren(root).flatMap((child) => this.visibleNodes(child, layoutPath, false));
  }

  private async toVisibleChild(node: RuntimeTreeNode, layoutPath: string[] = []): Promise<RuntimeVisibleChild> {
    if (node[0] === 'g') {
      const glyph = node[1];
      const lookup = await this.getRecord(glyph);
      return {
        kind: 'glyph',
        key: `g:${glyph}`,
        glyph,
        layoutPath,
        expansion: lookup.status === 'found'
          ? 'expandable'
          : lookup.status === 'leaf'
            ? 'leaf'
            : lookup.status === 'error'
              ? 'error'
              : 'missing',
      };
    }
    if (node[0] === 'u') {
      return {
        kind: 'unencoded-component',
        key: `u:${node[1]}`,
        componentSourceId: node[1],
        layoutPath,
        strokeCount: node.length === 3 ? node[2] : undefined,
        label: 'No glyph',
        expansion: 'unknown',
      };
    }
    if (node[0] === '?') {
      return {
        kind: 'unknown-component',
        key: node[1] ? `?:${node[1]}` : '?',
        componentSourceId: node[1],
        layoutPath,
        label: 'Unknown component',
        expansion: 'unknown',
      };
    }
    return {
      kind: 'source-entity',
      key: `e:${node[1]}`,
      entity: node[1],
      layoutPath,
      label: 'Unresolved source component',
      expansion: 'unknown',
    };
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

  private async loadRecordShard(shard: number, manifest: RuntimePackManifest): Promise<void> {
    if (this.recordShards.has(shard)) {
      this.metrics.inMemoryHits += 1;
      return;
    }
    const key = `record:${shard}`;
    const pending = this.pendingShards.get(key);
    if (pending) return pending;
    const descriptor = manifest.recordShards.find((item) => item.shard === shard);
    if (!descriptor) throw new Error(`Missing record shard descriptor ${shard}.`);
    const request = this.loadJson<RuntimeRecordShard>(descriptor.path, key).then((payload) => {
      assertShard(payload, descriptor, this.expectedSchemaVersion);
      if (!payload.records || typeof payload.records !== 'object') throw new Error('Malformed record shard.');
      this.recordShards.set(shard, payload.records);
    }).finally(() => this.pendingShards.delete(key));
    this.pendingShards.set(key, request);
    return request;
  }

  private async loadDirectShard(shard: number, manifest: RuntimePackManifest): Promise<void> {
    if (this.directShards.has(shard)) {
      this.metrics.inMemoryHits += 1;
      return;
    }
    const key = `direct:${shard}`;
    const pending = this.pendingShards.get(key);
    if (pending) return pending;
    const descriptor = manifest.indexes.direct.shards.find((item) => item.shard === shard);
    if (!descriptor) throw new Error(`Missing direct index shard descriptor ${shard}.`);
    const request = this.loadJson<RuntimeDirectIndexShard>(descriptor.path, key).then((payload) => {
      assertShard(payload, descriptor, this.expectedSchemaVersion);
      if (!payload.direct || typeof payload.direct !== 'object') throw new Error('Malformed direct index shard.');
      this.directShards.set(shard, payload.direct);
    }).finally(() => this.pendingShards.delete(key));
    this.pendingShards.set(key, request);
    return request;
  }

  private async loadReverseShard(shard: number, manifest: RuntimePackManifest): Promise<void> {
    if (this.reverseShards.has(shard)) {
      this.metrics.inMemoryHits += 1;
      return;
    }
    const key = `reverse:${shard}`;
    const pending = this.pendingShards.get(key);
    if (pending) return pending;
    const descriptor = manifest.indexes.reverse.shards.find((item) => item.shard === shard);
    if (!descriptor) throw new Error(`Missing reverse index shard descriptor ${shard}.`);
    const request = this.loadJson<RuntimeReverseIndexShard>(descriptor.path, key).then((payload) => {
      assertShard(payload, descriptor, this.expectedSchemaVersion);
      if (!payload.reverse || typeof payload.reverse !== 'object') throw new Error('Malformed reverse index shard.');
      this.reverseShards.set(shard, payload.reverse);
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
